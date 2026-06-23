import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { PhoneField, usePhoneFieldState } from '@/components/PhoneField';
import { DropdownPicker } from '@/components/pickers/DropdownPicker';
import { PasswordField } from '@/components/auth/PasswordField';
import { useOtpSession } from '@/auth/OtpSessionContext';
import { useAuthSubmit } from '@/features/auth/hooks';
import { requestOtp } from '@/api/auth';
import { useAppConfig } from '@/config/AppConfigContext';
import { supportsLoginChannel } from '@/config/featureAccess';
import { useContentFrame } from '@/hooks/useContentFrame';
import { isValidEmail, normalizeEmail, splitFullName } from '@/lib/email';
import { isValidPassword } from '@/lib/password';
import { colors, radius, spacing, typography } from '@/theme';
import type { UserRole } from '@/api/types';

type AuthTab = 'signup' | 'signin';

const SIGNUP_ROLES: { id: UserRole; label: string }[] = [
  { id: 'DIRECTOR', label: 'Director' },
  { id: 'PRODUCER', label: 'Producer' },
  { id: 'CREW', label: 'Crew' },
  { id: 'ACTOR', label: 'Actor' },
];

export default function AuthScreen() {
  const router = useRouter();
  const { config } = useAppConfig();
  const { setSession } = useOtpSession();
  const frame = useContentFrame('form');
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<AuthTab>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const roleFieldY = useRef(0);
  const phoneField = usePhoneFieldState();

  const signupChannel = config.signupVerificationChannel;
  const signinChannel = useMemo(() => {
    if (config.loginIdentifier === 'EMAIL') return 'EMAIL' as const;
    if (config.loginIdentifier === 'PHONE') return 'PHONE' as const;
    return email.trim() ? ('EMAIL' as const) : ('PHONE' as const);
  }, [config.loginIdentifier, email]);

  const activeChannel = tab === 'signup' ? signupChannel : signinChannel;

  const emailValid = !email.trim() || isValidEmail(email);
  const _emailValid = emailValid;
  const emailRequired =
    activeChannel === 'EMAIL' || (tab === 'signup' && signupChannel === 'EMAIL');
  const phoneRequired =
    activeChannel === 'PHONE' || (tab === 'signup' && signupChannel === 'PHONE');
  const nameValid = tab === 'signin' || fullName.trim().length >= 1;
  const roleValid = tab === 'signin' || role !== null;
  const passwordValid = tab === 'signin' || !password || isValidPassword(password);
  const phoneValid = !phoneRequired || phoneField.isValid;

  const canSubmit =
    nameValid &&
    roleValid &&
    passwordValid &&
    phoneValid &&
    (!emailRequired || isValidEmail(email)) &&
    (tab === 'signup' || supportsLoginChannel(activeChannel, config.loginIdentifier));

  const submitHint = (() => {
    if (!attempted || canSubmit) return null;
    if (emailRequired && !isValidEmail(email)) return 'Enter a valid email address.';
    if (phoneRequired && !phoneField.isValid)
      return phoneField.error ?? 'Enter a valid phone number.';
    if (tab === 'signup' && !nameValid) return 'Enter your name.';
    if (tab === 'signup' && !roleValid) return 'Pick your role.';
    if (tab === 'signup' && password && !passwordValid)
      return 'Password must be at least 8 characters.';
    return null;
  })();

  const startOtp = useCallback(async () => {
    const purpose = tab === 'signup' ? 'signup' : 'login';
    const normalizedEmail = email.trim() ? normalizeEmail(email) : undefined;
    const phone = phoneField.e164 ?? undefined;

    if (activeChannel === 'EMAIL') {
      const { ttlSeconds } = await requestOtp({
        channel: 'EMAIL',
        email: normalizedEmail!,
        purpose,
      });
      const { firstName, lastName } = splitFullName(fullName);
      setSession({
        channel: 'EMAIL',
        email: normalizedEmail!,
        phone,
        password: tab === 'signup' ? password || undefined : undefined,
        mode: purpose,
        firstName: tab === 'signup' ? firstName : undefined,
        lastName: tab === 'signup' ? lastName : undefined,
        role: tab === 'signup' ? (role ?? undefined) : undefined,
        expiresAtMs: Date.now() + ttlSeconds * 1000,
      });
    } else {
      const { ttlSeconds } = await requestOtp({
        channel: 'PHONE',
        phone: phone!,
        purpose,
      });
      const { firstName, lastName } = splitFullName(fullName);
      setSession({
        channel: 'PHONE',
        phone: phone!,
        email: normalizedEmail,
        password: tab === 'signup' ? password || undefined : undefined,
        mode: purpose,
        firstName: tab === 'signup' ? firstName : undefined,
        lastName: tab === 'signup' ? lastName : undefined,
        role: tab === 'signup' ? (role ?? undefined) : undefined,
        expiresAtMs: Date.now() + ttlSeconds * 1000,
      });
    }

    router.push({ pathname: '/(auth)/otp', params: { mode: purpose } });
  }, [activeChannel, email, fullName, password, phoneField.e164, role, router, setSession, tab]);

  const { submitting, error, handleSubmit } = useAuthSubmit({
    canSubmit,
    submit: startOtp,
    fallbackError: tab === 'signup' ? 'Could not start sign up' : 'Could not send sign-in code',
  });

  const signupUsesEmail = tab === 'signup' && signupChannel === 'EMAIL';

  const otpTargetHint = signupUsesEmail
    ? "We'll email your verification code."
    : 'OTP is sent to your phone.';

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
  const dropdownScrollPadding = Math.min(frame.height * 0.35, 280);

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
            roleDropdownOpen && { paddingBottom: dropdownScrollPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
                paddingTop: compact ? spacing.lg : landscape ? spacing.xl : spacing.xxxl,
              },
            ]}
          >
            <View
              style={[
                styles.brandBlock,
                compact && styles.brandBlockCompact,
                landscape && styles.brandBlockLandscape,
              ]}
            >
              <CircuitLogo size={compact || landscape ? 'sm' : 'md'} />
              <Text style={[styles.wordmark, (compact || landscape) && styles.wordmarkCompact]}>
                CIRCUI<Text style={styles.wordmarkAccent}>IT</Text>
              </Text>
              {!compact ? <Text style={styles.tagline}>FOR FILMMAKERS</Text> : null}
            </View>

            <View style={[styles.tabRow, compact && styles.tabRowCompact]}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'signup' }}
                onPress={() => setTab('signup')}
                style={[styles.tab, tab === 'signup' && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                  Sign up
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'signin' }}
                onPress={() => setTab('signin')}
                style={[styles.tab, tab === 'signin' && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>
                  Sign In
                </Text>
              </Pressable>
            </View>

            {tab === 'signup' ? (
              <AuthField
                label="Name"
                placeholder="Your full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                icon="person-outline"
                compact={compact}
              />
            ) : null}

            {activeChannel === 'EMAIL' || config.loginIdentifier === 'BOTH' || tab === 'signup' ? (
              <AuthField
                label={emailRequired ? 'Email' : 'Email (optional)'}
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
            ) : null}

            {tab === 'signup' && signupChannel === 'EMAIL' ? (
              <View style={styles.phoneBlock}>
                <PhoneField
                  label="Phone (optional)"
                  country={phoneField.country}
                  nationalNumber={phoneField.nationalNumber}
                  onCountryChange={phoneField.setCountry}
                  onNationalNumberChange={phoneField.setNationalNumber}
                  hint="Used for crew invites — we'll email your verification code."
                  showError={attempted && !!phoneField.nationalNumber && !phoneField.isValid}
                  error={phoneField.error ?? undefined}
                />
              </View>
            ) : (tab === 'signup' && signupChannel === 'PHONE') ||
              activeChannel === 'PHONE' ||
              (tab === 'signin' && config.loginIdentifier === 'BOTH') ? (
              <View style={styles.phoneBlock}>
                <PhoneField
                  label={phoneRequired ? 'Phone' : 'Phone (optional)'}
                  country={phoneField.country}
                  nationalNumber={phoneField.nationalNumber}
                  onCountryChange={phoneField.setCountry}
                  onNationalNumberChange={phoneField.setNationalNumber}
                  hint={tab === 'signup' ? otpTargetHint : undefined}
                  showError={
                    attempted && phoneRequired && !!phoneField.nationalNumber && !phoneField.isValid
                  }
                  error={phoneField.error ?? undefined}
                />
              </View>
            ) : null}

            {tab === 'signup' ? (
              <View
                onLayout={event => {
                  roleFieldY.current = event.nativeEvent.layout.y;
                }}
              >
                <DropdownPicker
                  label="I am a"
                  placeholder="Select your role"
                  options={SIGNUP_ROLES.map(item => ({ value: item.id, label: item.label }))}
                  value={role}
                  onChange={setRole}
                  onOpenChange={handleRoleDropdownOpen}
                />
              </View>
            ) : null}

            {tab === 'signup' ? (
              <View style={styles.passwordBlock}>
                <PasswordField value={password} onChangeText={setPassword} mode="new" />
              </View>
            ) : null}

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
                  ? 'Sending code…'
                  : tab === 'signup'
                    ? signupUsesEmail
                      ? 'Email verification code →'
                      : 'Get started →'
                    : signupUsesEmail
                      ? 'Email sign-in code →'
                      : 'Send sign-in code →'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
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
          placeholderTextColor="rgba(255,255,255,0.45)"
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
        <Ionicons name={icon} size={18} color="rgba(255,255,255,0.5)" style={styles.fieldIcon} />
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
    flexGrow: 1,
    paddingBottom: spacing.xl,
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
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  fieldInput: {
    flex: 1,
    ...typography.body,
    color: colors.onBrand,
    paddingVertical: spacing.md,
  },
  fieldIcon: { marginLeft: spacing.sm },
  phoneBlock: { marginBottom: spacing.lg },
  passwordBlock: { marginBottom: spacing.lg },
  cta: {
    marginTop: spacing.md,
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
