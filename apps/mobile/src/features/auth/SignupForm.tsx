import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthFormCard } from '@/components/AuthFormCard';
import { AuthFormActions } from '@/components/auth/AuthFormActions';
import { AuthSwitchLink } from '@/components/auth/AuthSwitchLink';
import { PasswordField } from '@/components/auth/PasswordField';
import { LabeledInput } from '@/components/LabeledInput';
import { PhoneField, usePhoneFieldState } from '@/components/PhoneField';
import { RolePicker } from '@/components/RolePicker';
import { useSignupSession } from '@/auth/SignupSessionContext';
import { useAuthSubmit } from '@/features/auth/hooks';
import { requestOtp } from '@/api/auth';
import { choosePasswordHint, isValidPassword } from '@/lib/password';
import { authFormStyles } from '@/theme';
import type { UserRole } from '@/api/types';

export default function SignupForm() {
  const router = useRouter();
  const { setSession } = useSignupSession();
  const { ctx } = useLocalSearchParams<{ ctx?: 'starter' | 'invitee' | 'all' }>();
  const context: 'starter' | 'invitee' | 'all' =
    ctx === 'starter' || ctx === 'invitee' ? ctx : 'all';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const phoneField = usePhoneFieldState();
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const canSubmit =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    phoneField.isValid &&
    isValidPassword(password) &&
    role !== null;

  const submitHint = (() => {
    if (!attemptedSubmit || canSubmit) return null;
    if (firstName.trim().length < 1) return 'Enter your first name.';
    if (lastName.trim().length < 1) return 'Enter your last name.';
    if (!phoneField.isValid) {
      return phoneField.error ?? 'Enter your complete 10-digit mobile number.';
    }
    if (!isValidPassword(password)) return choosePasswordHint();
    if (!role) return 'Pick your role on the production.';
    return null;
  })();

  const sendVerificationCode = useCallback(async () => {
    if (!phoneField.e164 || !role) return;
    const { ttlSeconds } = await requestOtp(phoneField.e164, 'signup');
    setSession({
      phone: phoneField.e164,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      password,
      expiresAtMs: Date.now() + ttlSeconds * 1000,
    });
    router.push({ pathname: '/(auth)/otp', params: { mode: 'signup' } });
  }, [firstName, lastName, password, phoneField.e164, role, router, setSession]);

  const { submitting, error, showPhoneError, handleSubmit } = useAuthSubmit({
    canSubmit,
    phoneE164: phoneField.e164,
    submit: sendVerificationCode,
    fallbackError: 'Could not send verification code',
  });

  return (
    <ScreenContainer scroll constrained="form">
      <ScreenHeader
        eyebrow="Create your account"
        title="Tell us about you"
        subtitle="We'll text a 6-digit code to verify your mobile number before creating your account."
        showRule
        size="large"
      />

      <AuthFormCard>
        <LabeledInput
          label="First name"
          placeholder="e.g. Anand"
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          value={firstName}
          onChangeText={setFirstName}
          containerStyle={authFormStyles.fieldFlush}
        />
        <LabeledInput
          label="Last name"
          placeholder="e.g. Reddy"
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          value={lastName}
          onChangeText={setLastName}
          containerStyle={authFormStyles.fieldFlush}
        />
        <PhoneField
          country={phoneField.country}
          nationalNumber={phoneField.nationalNumber}
          onCountryChange={phoneField.setCountry}
          onNationalNumberChange={phoneField.setNationalNumber}
          showError={showPhoneError}
          error={showPhoneError ? phoneField.error : undefined}
          containerStyle={authFormStyles.fieldFlush}
        />
        <PasswordField
          mode="new"
          value={password}
          onChangeText={setPassword}
          containerStyle={authFormStyles.fieldFlush}
        />
        <RolePicker
          value={role}
          onChange={setRole}
          signupContext={context}
          variant="dropdown"
          placeholder="Pick your role"
        />
      </AuthFormCard>

      <AuthFormActions
        error={error}
        submitHint={submitHint}
        submitTitle="Send verification code"
        canSubmit={canSubmit}
        submitting={submitting}
        onSubmit={() => {
          setAttemptedSubmit(true);
          void handleSubmit();
        }}
        onBack={() => router.back()}
        footer={
          <AuthSwitchLink
            prompt="Already have an account?"
            linkLabel="Sign in"
            href="/(auth)/login"
            replace
          />
        }
      />
    </ScreenContainer>
  );
}
