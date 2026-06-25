import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthField } from '@/components/auth/AuthField';
import { usePhoneFieldState } from '@/components/PhoneField';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthBackground } from '@/features/auth/AuthBackground';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { AuthMetricsProvider } from '@/features/auth/AuthMetricsContext';
import { AuthPrimaryButton } from '@/features/auth/AuthPrimaryButton';
import { AuthSegmentControl } from '@/features/auth/AuthSegmentControl';
import { SignupFormFields } from '@/features/auth/SignupFormFields';
import { getAuthLayoutMetrics } from '@/features/auth/getAuthLayoutMetrics';
import { useAuth } from '@/auth/AuthContext';
import { useOtpSession } from '@/auth/OtpSessionContext';
import { useAuthSubmit } from '@/features/auth/hooks';
import { requestOtp } from '@/api/auth';
import { useAppConfig } from '@/config/AppConfigContext';
import { isValidEmail, normalizeEmail, splitFullName } from '@/lib/email';
import { isValidPassword } from '@/lib/password';
import { authPalette } from '@/theme/authPalette';
import { authFormStyles } from '@/theme/authForm';
import type { UserRole } from '@/api/types';
import type { AuthTab } from '@/features/auth/AuthSegmentControl';

function AuthFooterLink({
  isSignup,
  onSwitch,
  fontSize,
  marginTop,
}: {
  isSignup: boolean;
  onSwitch: () => void;
  fontSize: number;
  marginTop: number;
}) {
  return (
    <View style={[authFormStyles.footer, { marginTop }]}>
      <Text style={[authFormStyles.footerText, { fontSize }]}>
        {isSignup ? 'Already have an account?' : "Don't have an account?"}
      </Text>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onSwitch}>
        <Text style={[authFormStyles.footerLink, { fontSize }]}>
          {isSignup ? 'Sign in' : 'Sign up'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { loginWithPassword } = useAuth();
  const { config } = useAppConfig();
  const { setSession } = useOtpSession();
  const [tab, setTab] = useState<AuthTab>(params.tab === 'signin' ? 'signin' : 'signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const phoneField = usePhoneFieldState();

  const isSignup = tab === 'signup';
  const screenMode = isSignup ? 'signUp' : 'signIn';

  const isLandscape = width > height;
  const isSmallPhone = width < 390;
  const isShortHeight = height < 760;
  const isVeryShortHeight = height < 680;
  const isTablet = width >= 768;

  const metrics = useMemo(
    () =>
      getAuthLayoutMetrics({
        width,
        height,
        safeAreaTop: insets.top,
        safeAreaBottom: insets.bottom,
        isLandscape,
        isSmallPhone,
        isShortHeight,
        isVeryShortHeight,
        isTablet,
        mode: screenMode,
      }),
    [
      width,
      height,
      insets.top,
      insets.bottom,
      isLandscape,
      isSmallPhone,
      isShortHeight,
      isVeryShortHeight,
      isTablet,
      screenMode,
    ],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const signupChannel = config.signupVerificationChannel;
  const signupEmailRequired = signupChannel === 'EMAIL';
  const signupPhoneRequired = signupChannel === 'PHONE';
  const nameValid = !isSignup || fullName.trim().length >= 1;
  const roleValid = !isSignup || role !== null;
  const signupPasswordValid = isValidPassword(password);
  const signupPhoneValid = !signupPhoneRequired || phoneField.isValid;
  const signupEmailValid =
    signupChannel === 'EMAIL' ? isValidEmail(email) : !email.trim() || isValidEmail(email);
  const signInValid = isValidEmail(email) && isValidPassword(password);
  const canSubmit = isSignup
    ? nameValid && roleValid && signupPasswordValid && signupPhoneValid && signupEmailValid
    : signInValid;

  const submitHint = (() => {
    if (!attempted || canSubmit) return null;
    if (!isSignup) {
      if (!isValidEmail(email)) return 'Enter a valid email address.';
      if (!isValidPassword(password)) return 'Password must be at least 8 characters.';
      return null;
    }
    if (signupEmailRequired && !isValidEmail(email)) return 'Enter a valid email address.';
    if (!signupEmailValid) return 'Enter a valid email address.';
    if (signupPhoneRequired && !phoneField.isValid)
      return phoneField.error ?? 'Enter a valid phone number.';
    if (!nameValid) return 'Enter your name.';
    if (!roleValid) return 'Pick your role.';
    if (!signupPasswordValid) return 'Password must be at least 8 characters.';
    return null;
  })();

  const startSignupOtp = useCallback(async () => {
    if (!isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!role) {
      throw new Error('Pick your role');
    }

    const normalizedEmail = email.trim() ? normalizeEmail(email) : undefined;
    const phone = phoneField.e164 ?? undefined;
    const { firstName, lastName } = splitFullName(fullName);

    if (signupChannel === 'EMAIL') {
      const { ttlSeconds } = await requestOtp({
        channel: 'EMAIL',
        email: normalizedEmail!,
        purpose: 'signup',
      });
      setSession({
        channel: 'EMAIL',
        email: normalizedEmail!,
        phone,
        password,
        mode: 'signup',
        firstName,
        lastName,
        role: role ?? undefined,
        expiresAtMs: Date.now() + ttlSeconds * 1000,
      });
    } else {
      const { ttlSeconds } = await requestOtp({
        channel: 'PHONE',
        phone: phone!,
        purpose: 'signup',
      });
      setSession({
        channel: 'PHONE',
        phone: phone!,
        email: normalizedEmail,
        password,
        mode: 'signup',
        firstName,
        lastName,
        role: role ?? undefined,
        expiresAtMs: Date.now() + ttlSeconds * 1000,
      });
    }

    router.push({ pathname: '/(auth)/otp', params: { mode: 'signup' } });
  }, [email, fullName, password, phoneField.e164, role, router, setSession, signupChannel]);

  const signIn = useCallback(async () => {
    await loginWithPassword(normalizeEmail(email), password);
  }, [email, loginWithPassword, password]);

  const submit = useCallback(async () => {
    if (isSignup) {
      await startSignupOtp();
    } else {
      await signIn();
    }
  }, [isSignup, signIn, startSignupOtp]);

  const { submitting, error, handleSubmit, clearFeedback } = useAuthSubmit({
    canSubmit,
    submit,
    fallbackError: isSignup ? 'Could not start sign up' : 'Invalid email or password',
  });

  const switchTab = useCallback(
    (next: AuthTab) => {
      if (next === tab) return;
      setTab(next);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole(null);
      setAttempted(false);
      setRolePickerOpen(false);
      phoneField.setNationalNumber('');
      clearFeedback();
    },
    [tab, phoneField, clearFeedback],
  );

  const ctaLabel = submitting
    ? isSignup
      ? 'Sending code…'
      : 'Signing in…'
    : isSignup
      ? 'Get started →'
      : 'Sign In →';

  const contentMaxWidth = metrics.isLandscapeTwoColumn
    ? metrics.totalMaxWidth!
    : Math.min(width - metrics.horizontalPadding * 2, metrics.contentMaxWidth);

  const containerLeft = (width - contentMaxWidth) / 2;

  const stickyFooterLeft = metrics.isLandscapeTwoColumn
    ? containerLeft + metrics.brandColumnWidth! + metrics.columnGap!
    : metrics.horizontalPadding;

  const stickyFooterWidth = metrics.isLandscapeTwoColumn
    ? metrics.formColumnWidth!
    : width - metrics.horizontalPadding * 2;

  const showStickyFooterLink =
    isSignup && !keyboardVisible && !metrics.hideStickyFooterLink;

  const showScrollFooterLink =
    isSignup && metrics.hideStickyFooterLink && !keyboardVisible;

  const scrollBottomPadding = isSignup
    ? metrics.stickyFooterHeight + insets.bottom + 24
    : metrics.bottomPadding + insets.bottom;

  const signInForm = (
    <View style={{ marginTop: metrics.formMarginTop }}>
      <AuthField
        label="Email"
        placeholder="you@studio.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        icon="mail-outline"
        fieldVariant="signIn"
      />
      <PasswordField
        value={password}
        onChangeText={setPassword}
        mode="login"
        fieldVariant="signIn"
        containerStyle={styles.passwordField}
      />
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() =>
          router.push({
            pathname: '/(auth)/forgot-password',
            params: email.trim() ? { email: email.trim() } : undefined,
          })
        }
        style={[styles.forgotLink, { marginTop: metrics.forgotMarginTop }]}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>
    </View>
  );

  const signupForm = (
    <View style={{ marginTop: metrics.formMarginTop }}>
      <SignupFormFields
        channel={signupChannel}
        fullName={fullName}
        onFullNameChange={setFullName}
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        role={role}
        onRoleChange={setRole}
        phoneField={phoneField}
        attempted={attempted}
        signupPhoneRequired={signupPhoneRequired}
        onRolePickerOpenChange={setRolePickerOpen}
      />
    </View>
  );

  const formBlock = isSignup ? signupForm : signInForm;

  const feedbackBlock = (
    <>
      {error ? <Text style={authFormStyles.error}>{error}</Text> : null}
      {submitHint ? <Text style={authFormStyles.submitHint}>{submitHint}</Text> : null}
    </>
  );

  const mainContent = metrics.isLandscapeTwoColumn ? (
    <View
      style={[
        styles.twoColumn,
        {
          maxWidth: contentMaxWidth,
          gap: metrics.columnGap,
        },
      ]}
    >
      <View style={{ width: metrics.brandColumnWidth }}>
        <AuthHeader compact={isSignup} column />
      </View>
      <View style={{ flex: 1, maxWidth: metrics.formColumnWidth }}>
        <AuthSegmentControl value={tab} onChange={switchTab} compact={isSignup} />
        {formBlock}
        {feedbackBlock}
        {!isSignup ? (
          <>
            <View style={{ marginTop: metrics.ctaMarginTop }}>
              <AuthPrimaryButton
                title={ctaLabel}
                disabled={!canSubmit || submitting}
                loading={submitting}
                mode="signIn"
                onPress={() => {
                  setAttempted(true);
                  void handleSubmit();
                }}
              />
            </View>
            <AuthFooterLink
              isSignup={false}
              onSwitch={() => switchTab('signup')}
              fontSize={metrics.footerFontSize}
              marginTop={metrics.footerMarginTop}
            />
          </>
        ) : showScrollFooterLink ? (
          <AuthFooterLink
            isSignup
            onSwitch={() => switchTab('signin')}
            fontSize={metrics.footerFontSize}
            marginTop={metrics.footerMarginTop}
          />
        ) : null}
      </View>
    </View>
  ) : (
    <>
      <AuthHeader compact={isSignup} />
      <AuthSegmentControl value={tab} onChange={switchTab} compact={isSignup} />
      {formBlock}
      {feedbackBlock}
      {!isSignup ? (
        <>
          <View style={{ marginTop: metrics.ctaMarginTop }}>
            <AuthPrimaryButton
              title={ctaLabel}
              disabled={!canSubmit || submitting}
              loading={submitting}
              mode="signIn"
              onPress={() => {
                setAttempted(true);
                void handleSubmit();
              }}
            />
          </View>
          <AuthFooterLink
            isSignup={false}
            onSwitch={() => switchTab('signup')}
            fontSize={metrics.footerFontSize}
            marginTop={metrics.footerMarginTop}
          />
        </>
      ) : showScrollFooterLink ? (
        <AuthFooterLink
          isSignup
          onSwitch={() => switchTab('signin')}
          fontSize={metrics.footerFontSize}
          marginTop={metrics.footerMarginTop}
        />
      ) : null}
    </>
  );

  return (
    <AuthMetricsProvider metrics={metrics}>
      <View style={styles.root}>
        <AuthBackground
          mode={screenMode}
          metrics={{
            watermarkScale: metrics.watermarkScale,
            watermarkOpacityMultiplier: metrics.watermarkOpacityMultiplier,
            hideCameraWatermark: metrics.hideCameraWatermark,
          }}
        />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: metrics.topPadding,
                paddingHorizontal: metrics.horizontalPadding,
                paddingBottom: scrollBottomPadding,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={isSignup}
            nestedScrollEnabled
            scrollEnabled={!rolePickerOpen}
          >
            <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>{mainContent}</View>
          </ScrollView>

          {isSignup ? (
            <View
              style={[
                styles.stickyFooter,
                {
                  left: stickyFooterLeft,
                  width: stickyFooterWidth,
                  bottom: insets.bottom + 12,
                },
              ]}
            >
              <AuthPrimaryButton
                title={ctaLabel}
                disabled={!canSubmit || submitting}
                loading={submitting}
                mode="signUp"
                onPress={() => {
                  setAttempted(true);
                  void handleSubmit();
                }}
              />
              {showStickyFooterLink ? (
                <AuthFooterLink
                  isSignup
                  onSwitch={() => switchTab('signin')}
                  fontSize={metrics.footerFontSize}
                  marginTop={metrics.footerMarginTop}
                />
              ) : null}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </AuthMetricsProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: authPalette.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
  twoColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    alignSelf: 'center',
  },
  passwordField: { marginBottom: 0 },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
    color: authPalette.ink,
    textDecorationLine: 'underline',
  },
  stickyFooter: {
    position: 'absolute',
  },
});
