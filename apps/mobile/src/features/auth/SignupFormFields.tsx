import { View, StyleSheet } from 'react-native';
import { PhoneField, usePhoneFieldState } from '@/components/PhoneField';
import { DropdownPicker } from '@/components/pickers/DropdownPicker';
import { AuthField } from '@/components/auth/AuthField';
import { PasswordField } from '@/components/auth/PasswordField';
import type { UserRole } from '@/api/types';

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
  onRolePickerOpenChange?: (open: boolean) => void;
}

/** Channel-aware signup fields. EMAIL verifies via Resend; PHONE via SMS OTP. */
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
  onRolePickerOpenChange,
}: SignupFormFieldsProps) {
  const otpTargetHint =
    channel === 'EMAIL'
      ? "We'll email a 6-digit code to verify your account."
      : 'OTP is sent to your phone.';

  return (
    <>
      <AuthField
        label="Name"
        placeholder="Full name"
        value={fullName}
        onChangeText={onFullNameChange}
        autoCapitalize="words"
        icon="person-outline"
        hideLabel
      />

      {channel === 'EMAIL' ? (
        <AuthField
          label="Email"
          placeholder="Email address"
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          icon="mail-outline"
          hideLabel
        />
      ) : null}

      {channel === 'EMAIL' ? (
        <View style={styles.phoneBlock}>
          <PhoneField
            label="Phone"
            country={phoneField.country}
            nationalNumber={phoneField.nationalNumber}
            onCountryChange={phoneField.setCountry}
            onNationalNumberChange={phoneField.setNationalNumber}
            showError={attempted && !!phoneField.nationalNumber && !phoneField.isValid}
            error={phoneField.error ?? undefined}
            hideLabel
            placeholder="Mobile number optional"
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
          label="Email"
          placeholder="Email address"
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          icon="mail-outline"
          hideLabel
        />
      ) : null}

      <View style={styles.roleBlock}>
        <DropdownPicker
          label="I am a"
          placeholder="Select your role"
          options={SIGNUP_ROLES.map((item) => ({ value: item.id, label: item.label }))}
          value={role}
          onChange={onRoleChange}
          variant="auth"
          onOpenChange={onRolePickerOpenChange}
        />
      </View>

      <PasswordField
        value={password}
        onChangeText={onPasswordChange}
        mode="new"
        containerStyle={styles.passwordField}
      />
    </>
  );
}

const styles = StyleSheet.create({
  phoneBlock: { marginBottom: 0 },
  roleBlock: { marginBottom: 0 },
  passwordField: { marginBottom: 0 },
});
