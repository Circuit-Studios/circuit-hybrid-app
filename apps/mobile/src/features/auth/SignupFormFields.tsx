import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhoneField, usePhoneFieldState } from '@/components/PhoneField';
import { DropdownPicker } from '@/components/pickers/DropdownPicker';
import { PasswordField } from '@/components/auth/PasswordField';
import type { UserRole } from '@/api/types';
import { colors, radius, spacing, typography } from '@/theme';

export type SignupVerificationChannel = 'EMAIL' | 'PHONE';

type PhoneFieldState = ReturnType<typeof usePhoneFieldState>;

const SIGNUP_ROLES: { id: UserRole; label: string }[] = [
  { id: 'DIRECTOR', label: 'Director' },
  { id: 'PRODUCER', label: 'Producer' },
  { id: 'CREW', label: 'Crew' },
  { id: 'ACTOR', label: 'Actor' },
];

export interface SignupFormFieldsProps {
  channel: SignupVerificationChannel;
  fullName: string;
  onFullNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  role: UserRole | null;
  onRoleChange: (role: UserRole) => void;
  phoneField: PhoneFieldState;
  attempted: boolean;
  signupPhoneRequired: boolean;
  onRoleDropdownOpen: (open: boolean) => void;
  onRoleFieldLayout: (y: number) => void;
  compact?: boolean;
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
    <View style={[styles.field, compact && styles.fieldCompact]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.fieldIcon} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          style={styles.fieldInput}
          {...rest}
        />
      </View>
    </View>
  );
}

/**
 * Channel-aware signup fields. PHONE verifies by SMS today; EMAIL slot is ready
 * for a future verification channel without restructuring the screen.
 */
export function SignupFormFields({
  channel,
  fullName,
  onFullNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  role,
  onRoleChange,
  phoneField,
  attempted,
  signupPhoneRequired,
  onRoleDropdownOpen,
  onRoleFieldLayout,
  compact,
}: SignupFormFieldsProps) {
  const otpTargetHint =
    channel === 'EMAIL' ? "We'll email your verification code." : 'OTP is sent to your phone.';

  return (
    <>
      <AuthField
        label="Name"
        placeholder="Your full name"
        value={fullName}
        onChangeText={onFullNameChange}
        autoCapitalize="words"
        icon="person-outline"
        compact={compact}
      />

      {channel === 'EMAIL' ? (
        <AuthField
          label="Email"
          placeholder="you@studio.com"
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          icon="mail-outline"
          compact={compact}
        />
      ) : null}

      {channel === 'EMAIL' ? (
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
      ) : (
        <View style={styles.phoneBlock}>
          <PhoneField
            label="Phone"
            country={phoneField.country}
            nationalNumber={phoneField.nationalNumber}
            onCountryChange={phoneField.setCountry}
            onNationalNumberChange={phoneField.setNationalNumber}
            hint={otpTargetHint}
            showError={
              attempted && signupPhoneRequired && !!phoneField.nationalNumber && !phoneField.isValid
            }
            error={phoneField.error ?? undefined}
          />
        </View>
      )}

      {channel === 'PHONE' ? (
        <AuthField
          label="Email (optional)"
          placeholder="you@studio.com"
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          icon="mail-outline"
          compact={compact}
        />
      ) : null}

      <View
        onLayout={event => {
          onRoleFieldLayout(event.nativeEvent.layout.y);
        }}
      >
        <DropdownPicker
          label="I am a"
          placeholder="Select your role"
          options={SIGNUP_ROLES.map(item => ({ value: item.id, label: item.label }))}
          value={role}
          onChange={onRoleChange}
          onOpenChange={onRoleDropdownOpen}
        />
      </View>

      <View style={styles.passwordBlock}>
        <PasswordField value={password} onChangeText={onPasswordChange} mode="new" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  fieldCompact: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  fieldIcon: { marginRight: spacing.sm },
  fieldInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
    paddingVertical: spacing.md,
  },
  phoneBlock: { marginBottom: spacing.lg },
  passwordBlock: { marginBottom: spacing.lg },
});
