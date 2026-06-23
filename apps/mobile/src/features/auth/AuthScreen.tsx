import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackdrop } from '@/components/AuthBackdrop';
import { CircuitLogo } from '@/components/CircuitLogo';
import { AuthField } from '@/components/auth/AuthField';
import { usePhoneFieldState } from '@/components/PhoneField';
import { PasswordField } from '@/components/auth/PasswordField';
import { SignupFormFields } from '@/features/auth/SignupFormFields';
import { useAuth } from '@/auth/AuthContext';
import { useOtpSession } from '@/auth/OtpSessionContext';
import { useAuthSubmit } from '@/features/auth/hooks';
import { requestOtp } from '@/api/auth';
import { useAppConfig } from '@/config/AppConfigContext';
import { useContentFrame } from '@/hooks/useContentFrame';
import { isValidEmail, normalizeEmail, splitFullName } from '@/lib/email';
import { isValidPassword } from '@/lib/password';
import { authPalette } from '@/theme/authPalette';
import { colors, radius, spacing, typography } from '@/theme';
import type { UserRole } from '@/api/types';

type AuthTab = 'signup' | 'signin';

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { loginWithPassword } = useAuth();
  const { config } = useAppConfig();
  const { setSession } = useOtpSession();
  const frame = useContentFrame('form');
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<AuthTab>(params.tab === 'signin' ? 'signin' : 'signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const phoneField = usePhoneFieldState();

  const isSignup = tab === 'signup';
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

  const signupUsesEmail = signupChannel === 'EMAIL';

  const compact = frame.isCompactHeight;
  const landscape = frame.isLandscape;
  const compactBrand = compact || landscape || isSignup;
  const footerReserve = isSignup ? 148 : 112;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <AuthBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: footerReserve }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={isSignup}
          nestedScrollEnabled
          scrollEnabled={!rolePickerOpen}
        >
          <View
            style={[
              styles.inner,
              {
                paddingHorizontal: frame.horizontalPadding,
                maxWidth: frame.maxWidth,
                alignSelf: frame.maxWidth != null ? 'center' : undefined,
                width: '100%',
                paddingTop: compactBrand ? spacing.lg : spacing.xxxl,
              },
            ]}
          >
            <View
              style={[
                styles.brandBlock,
                compactBrand && styles.brandBlockCompact,
                landscape && styles.brandBlockLandscape,
              ]}
            >
              <CircuitLogo size={compactBrand ? 'sm' : 'md'} />
              <View style={styles.wordmarkRow}>
                <Text style={[styles.wordmark, compactBrand && styles.wordmarkCompact]}>CIRCU</Text>
                <Text
                  style={[
                    styles.wordmark,
                    styles.wordmarkAccent,
                    compactBrand && styles.wordmarkCompact,
                  ]}
                >
                  IT
                </Text>
              </View>
              {!compactBrand ? <Text style={styles.tagline}>FOR FILMMAKERS</Text> : null}
            </View>

            <View style={[styles.tabRow, compact && styles.tabRowCompact]}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isSignup }}
                onPress={() => switchTab('signup')}
                style={[styles.tab, isSignup && styles.tabActive]}
              >
                <Text style={[styles.tabText, isSignup && styles.tabTextActive]}>Sign up</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: !isSignup }}
                onPress={() => switchTab('signin')}
                style={[styles.tab, !isSignup && styles.tabActive]}
              >
                <Text style={[styles.tabText, !isSignup && styles.tabTextActive]}>Sign In</Text>
              </Pressable>
            </View>

            {isSignup ? (
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
                compact={compact || isSignup}
                onRolePickerOpenChange={setRolePickerOpen}
              />
            ) : (
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
                compact={compact}
              />
            )}

            {!isSignup ? (
              <View style={styles.passwordBlock}>
                <PasswordField value={password} onChangeText={setPassword} mode="login" />
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: frame.horizontalPadding,
              maxWidth: frame.maxWidth,
              alignSelf: frame.maxWidth != null ? 'center' : undefined,
              width: '100%',
            },
          ]}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {submitHint ? <Text style={styles.hint}>{submitHint}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit || submitting }}
            disabled={!canSubmit || submitting}
            onPress={() => {
              setAttempted(true);
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.cta,
              canSubmit && !submitting ? styles.ctaEnabled : styles.ctaDisabled,
              pressed && canSubmit && !submitting && styles.ctaPressed,
            ]}
          >
            <Text style={[styles.ctaText, (!canSubmit || submitting) && styles.ctaTextDisabled]}>
              {submitting
                ? isSignup
                  ? 'Sending code…'
                  : 'Signing in…'
                : isSignup
                  ? signupUsesEmail
                    ? 'Get started →'
                    : 'Get started →'
                  : 'Sign In →'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authPalette.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: {
    paddingBottom: spacing.md,
  },
  footer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
  },
  brandBlock: { alignItems: 'center', marginBottom: spacing.xl, width: '100%' },
  brandBlockCompact: { marginBottom: spacing.md },
  brandBlockLandscape: { marginBottom: spacing.sm },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: authPalette.ink,
    lineHeight: 36,
  },
  wordmarkCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  wordmarkAccent: { color: authPalette.brand },
  tagline: {
    ...typography.micro,
    color: authPalette.label,
    marginTop: spacing.xs,
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: authPalette.tabTrack,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.xl,
  },
  tabRowCompact: { marginBottom: spacing.md },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  tabText: { ...typography.bodyStrong, color: authPalette.muted },
  tabTextActive: { color: authPalette.ink },
  passwordBlock: { marginBottom: spacing.lg },
  cta: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    borderWidth: 0,
  },
  ctaEnabled: {
    backgroundColor: authPalette.ctaBg,
    ...Platform.select({
      ios: {
        shadowColor: authPalette.brand,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  ctaDisabled: {
    backgroundColor: authPalette.ctaBgDisabled,
  },
  ctaPressed: { opacity: 0.88 },
  ctaText: { ...typography.bodyStrong, color: authPalette.ctaText },
  ctaTextDisabled: { color: authPalette.ctaTextDisabled },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: authPalette.muted, marginBottom: spacing.sm },
});
