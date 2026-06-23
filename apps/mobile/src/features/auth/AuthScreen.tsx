import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CircuitLogo } from '@/components/CircuitLogo';
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
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const roleFieldY = useRef(0);
  const phoneField = usePhoneFieldState();

  const isSignup = tab === 'signup';
  const signupChannel = config.signupVerificationChannel;

  const signupEmailRequired = signupChannel === 'EMAIL';
  const signupPhoneRequired = signupChannel === 'PHONE';
  const nameValid = !isSignup || fullName.trim().length >= 1;
  const roleValid = !isSignup || role !== null;
  const signupPasswordValid = !password || isValidPassword(password);
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
    if (password && !signupPasswordValid) return 'Password must be at least 8 characters.';
    return null;
  })();

  const startSignupOtp = useCallback(async () => {
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
        password: password || undefined,
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
        password: password || undefined,
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

  const { submitting, error, handleSubmit } = useAuthSubmit({
    canSubmit,
    submit,
    fallbackError: isSignup ? 'Could not start sign up' : 'Invalid email or password',
  });

  const signupUsesEmail = signupChannel === 'EMAIL';

  const scrollToRoleField = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, roleFieldY.current - spacing.lg),
        animated: true,
      });
    });
  }, []);

  const handleRoleDropdownOpen = useCallback(
    (open: boolean) => {
      setRoleDropdownOpen(open);
      if (open) scrollToRoleField();
    },
    [scrollToRoleField],
  );

  useEffect(() => {
    if (!roleDropdownOpen) return;
    const timer = setTimeout(scrollToRoleField, 50);
    return () => clearTimeout(timer);
  }, [roleDropdownOpen, scrollToRoleField, frame.width, frame.height]);

  const compact = frame.isCompactHeight;
  const landscape = frame.isLandscape;
  const compactBrand = compact || landscape || isSignup;
  const dropdownScrollPadding = Math.min(frame.height * 0.35, 280);
  const footerReserve = isSignup ? 148 : 112;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: footerReserve },
            roleDropdownOpen && { paddingBottom: dropdownScrollPadding + footerReserve },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={isSignup}
          nestedScrollEnabled
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
              <Text style={[styles.wordmark, compactBrand && styles.wordmarkCompact]}>
                CIRCUI<Text style={styles.wordmarkAccent}>IT</Text>
              </Text>
              {!compactBrand ? <Text style={styles.tagline}>FOR FILMMAKERS</Text> : null}
            </View>

            <View style={[styles.tabRow, compact && styles.tabRowCompact]}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isSignup }}
                onPress={() => setTab('signup')}
                style={[styles.tab, isSignup && styles.tabActive]}
              >
                <Text style={[styles.tabText, isSignup && styles.tabTextActive]}>Sign up</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: !isSignup }}
                onPress={() => setTab('signin')}
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
                onRoleDropdownOpen={handleRoleDropdownOpen}
                onRoleFieldLayout={y => {
                  roleFieldY.current = y;
                }}
                compact={compact || isSignup}
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
            disabled={!canSubmit || submitting}
            onPress={() => {
              setAttempted(true);
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.cta,
              (!canSubmit || submitting) && styles.ctaDisabled,
              pressed && canSubmit && styles.ctaPressed,
            ]}
          >
            <Text style={styles.ctaText}>
              {submitting
                ? isSignup
                  ? 'Sending code…'
                  : 'Signing in…'
                : isSignup
                  ? signupUsesEmail
                    ? 'Email verification code →'
                    : 'Text verification code →'
                  : 'Sign In →'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  compact = false,
  ...rest
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
} & TextInputProps) {
  return (
    <View style={[styles.fieldBlock, compact && styles.fieldBlockCompact]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
        <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.fieldIcon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F0EA' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: {
    paddingBottom: spacing.md,
  },
  footer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: '#F3F0EA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  brandBlock: { alignItems: 'center', marginBottom: spacing.xl },
  brandBlockCompact: { marginBottom: spacing.md },
  brandBlockLandscape: { marginBottom: spacing.sm },
  wordmark: {
    marginTop: spacing.md,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textPrimary,
  },
  wordmarkCompact: {
    marginTop: spacing.sm,
    fontSize: 24,
  },
  wordmarkAccent: { color: colors.brand },
  tagline: { ...typography.micro, color: colors.textMuted, marginTop: spacing.xs },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.06)',
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
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...typography.bodyStrong, color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary },
  fieldBlock: { marginBottom: spacing.lg },
  fieldBlockCompact: { marginBottom: spacing.md },
  fieldLabel: { ...typography.micro, color: colors.textMuted, marginBottom: spacing.xs },
  fieldInputWrap: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  fieldInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  fieldIcon: { marginLeft: spacing.sm },
  phoneBlock: { marginBottom: spacing.lg },
  passwordBlock: { marginBottom: spacing.lg },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaPressed: { opacity: 0.88 },
  ctaText: { ...typography.bodyStrong, color: colors.onBrand },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
});
