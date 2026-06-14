import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthFormCard } from '@/components/AuthFormCard';
import { AuthFormActions } from '@/components/auth/AuthFormActions';
import { PasswordField } from '@/components/auth/PasswordField';
import { PhoneField, usePhoneFieldState } from '@/components/PhoneField';
import { useAuth } from '@/auth/AuthContext';
import { useAuthSubmit } from '@/features/auth/hooks';
import { isValidPassword, passwordTooShortHint } from '@/lib/password';
import { authFormStyles } from '@/theme';

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const phoneField = usePhoneFieldState();
  const [password, setPassword] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const canSubmit = phoneField.isValid && isValidPassword(password);
  const submitHint =
    attemptedSubmit && !canSubmit
      ? !phoneField.isValid
        ? (phoneField.error ?? 'Enter your complete mobile number.')
        : passwordTooShortHint()
      : null;

  const submitLogin = useCallback(async () => {
    if (!phoneField.e164) return;
    await login(phoneField.e164, password);
  }, [login, password, phoneField.e164]);

  const { submitting, error, showPhoneError, handleSubmit } = useAuthSubmit({
    canSubmit,
    phoneE164: phoneField.e164,
    submit: submitLogin,
    fallbackError: 'Could not sign in',
  });

  return (
    <ScreenContainer scroll constrained="form">
      <ScreenHeader
        eyebrow="Welcome back"
        title="Sign in"
        subtitle="Use your registered mobile number and password."
        showRule
        size="large"
      />

      <AuthFormCard>
        <PhoneField
          label="Mobile number"
          hint="Your registered mobile number"
          country={phoneField.country}
          nationalNumber={phoneField.nationalNumber}
          onCountryChange={phoneField.setCountry}
          onNationalNumberChange={phoneField.setNationalNumber}
          showError={showPhoneError}
          error={showPhoneError ? phoneField.error : undefined}
          containerStyle={authFormStyles.fieldFlush}
        />
        <PasswordField
          value={password}
          onChangeText={setPassword}
          containerStyle={authFormStyles.fieldFlush}
        />
      </AuthFormCard>

      <AuthFormActions
        error={error}
        submitHint={submitHint}
        submitTitle="Sign in"
        canSubmit={canSubmit}
        submitting={submitting}
        onSubmit={() => {
          setAttemptedSubmit(true);
          void handleSubmit();
        }}
        onBack={() => router.back()}
      />
    </ScreenContainer>
  );
}
