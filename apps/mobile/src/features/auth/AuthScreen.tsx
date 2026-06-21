import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CircuitLogo } from '@/components/CircuitLogo';
import { PhoneField, usePhoneFieldState } from '@/components/PhoneField';
import { useOtpSession } from '@/auth/OtpSessionContext';
import { useAuthSubmit } from '@/features/auth/hooks';
import { requestOtp } from '@/api/auth';
import { isValidEmail, normalizeEmail, splitFullName } from '@/lib/email';
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
  const { setSession } = useOtpSession();
  const [tab, setTab] = useState<AuthTab>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [attempted, setAttempted] = useState(false);
  const phoneField = usePhoneFieldState();

  const emailValid = isValidEmail(email);
  const nameValid = tab === 'signin' || fullName.trim().length >= 1;
  const roleValid = tab === 'signin' || role !== null;
  const canSubmit = emailValid && nameValid && roleValid;

  const submitHint = (() => {
    if (!attempted || canSubmit) return null;
    if (!emailValid) return 'Enter a valid email address.';
    if (tab === 'signup' && !nameValid) return 'Enter your name.';
    if (tab === 'signup' && !roleValid) return 'Pick your role.';
    return null;
  })();

  const startOtp = useCallback(async () => {
    const normalized = normalizeEmail(email);
    const purpose = tab === 'signup' ? 'signup' : 'login';
    const { ttlSeconds } = await requestOtp({
      channel: 'EMAIL',
      email: normalized,
      purpose,
    });
    const { firstName, lastName } = splitFullName(fullName);
    setSession({
      channel: 'EMAIL',
      email: normalized,
      phone: phoneField.e164 ?? undefined,
      mode: purpose,
      firstName: tab === 'signup' ? firstName : undefined,
      lastName: tab === 'signup' ? lastName : undefined,
      role: tab === 'signup' ? role ?? undefined : undefined,
      expiresAtMs: Date.now() + ttlSeconds * 1000,
    });
    router.push({ pathname: '/(auth)/otp', params: { mode: purpose } });
  }, [email, fullName, phoneField.e164, role, router, setSession, tab]);

  const { submitting, error, handleSubmit } = useAuthSubmit({
    canSubmit,
    submit: startOtp,
    fallbackError: tab === 'signup' ? 'Could not start sign up' : 'Could not send sign-in code',
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.brandBlock}>
          <CircuitLogo size="md" />
          <Text style={styles.wordmark}>
            CIRCUI<Text style={styles.wordmarkAccent}>IT</Text>
          </Text>
          <Text style={styles.tagline}>FOR FILMMAKERS</Text>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'signup' }}
            onPress={() => setTab('signup')}
            style={[styles.tab, tab === 'signup' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>Sign up</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'signin' }}
            onPress={() => setTab('signin')}
            style={[styles.tab, tab === 'signin' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>Sign In</Text>
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
          />
        ) : null}

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
        />

        {tab === 'signup' ? (
          <View style={styles.phoneBlock}>
            <PhoneField
              label="Phone (optional)"
              country={phoneField.country}
              nationalNumber={phoneField.nationalNumber}
              onCountryChange={phoneField.setCountry}
              onNationalNumberChange={phoneField.setNationalNumber}
              hint="Used for crew invites — OTP is sent to your email."
              showError={attempted && !!phoneField.nationalNumber && !phoneField.isValid}
              error={phoneField.error ?? undefined}
            />
          </View>
        ) : null}

        {tab === 'signup' ? (
          <View style={styles.roleBlock}>
            <Text style={styles.fieldLabel}>I AM A</Text>
            <View style={styles.roleRow}>
              {SIGNUP_ROLES.map(item => {
                const active = role === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setRole(item.id)}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
            {submitting ? 'Sending code…' : tab === 'signup' ? 'Get started →' : 'Send sign-in code →'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  ...rest
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
} & TextInputProps) {
  return (
    <View style={styles.fieldBlock}>
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
  inner: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl, paddingBottom: spacing.xl },
  brandBlock: { alignItems: 'center', marginBottom: spacing.xl },
  wordmark: {
    marginTop: spacing.md,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textPrimary,
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
  roleBlock: { marginBottom: spacing.lg },
  phoneBlock: { marginBottom: spacing.lg },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleChipActive: { borderColor: colors.brand, backgroundColor: colors.accentSoft },
  roleChipText: { ...typography.bodyStrong, color: colors.textSecondary },
  roleChipTextActive: { color: colors.brand },
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
