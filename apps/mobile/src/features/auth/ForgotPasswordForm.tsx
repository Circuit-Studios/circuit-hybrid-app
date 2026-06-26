import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormErrorText } from '@/components/FormErrorText';
import { LabeledInput } from '@/components/LabeledInput';
import { PasswordField } from '@/components/auth/PasswordField';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { Button } from '@/components/ui/Button';
import { requestPasswordReset, resetPassword } from '@/api/auth';
import { readApiError } from '@/api/client';
import { useContentFrame } from '@/hooks/useContentFrame';
import { isValidEmail, normalizeEmail } from '@/lib/email';
import { isValidPassword, passwordTooShortHint } from '@/lib/password';
import { maskEmail } from '@/lib/mask';
import { colors, radius, spacing, typography } from '@/theme';

type Step = 'request' | 'reset';

const RESEND_COOLDOWN = 30;

export default function ForgotPasswordForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { isLandscape, isCompactHeight } = useContentFrame('form');
  const scroll = isLandscape || isCompactHeight;

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(params.email ?? '');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailValid = isValidEmail(email);
  const passwordValid = isValidPassword(newPassword);
  const codeValid = code.length === 6;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = useCallback(async (targetEmail: string) => {
    const { message } = await requestPasswordReset(targetEmail);
    setSubmittedEmail(targetEmail);
    setNotice(message);
    setCooldown(RESEND_COOLDOWN);
  }, []);

  const handleRequest = useCallback(async () => {
    if (!emailValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const normalized = normalizeEmail(email);
      await sendCode(normalized);
      setStep('reset');
    } catch (err) {
      setError(readApiError(err, 'Could not send reset code. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }, [email, emailValid, sendCode, submitting]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resending || !submittedEmail) return;
    setResending(true);
    setError(null);
    try {
      await sendCode(submittedEmail);
    } catch (err) {
      setError(readApiError(err, 'Could not resend the code.'));
    } finally {
      setResending(false);
    }
  }, [cooldown, resending, sendCode, submittedEmail]);

  const handleReset = useCallback(async () => {
    if (!codeValid || !passwordValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(submittedEmail, code, newPassword);
      router.replace({ pathname: '/(auth)/auth', params: { tab: 'signin' } });
    } catch (err) {
      setError(readApiError(err, 'Invalid or expired code. Try again.'));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }, [code, codeValid, newPassword, passwordValid, router, submittedEmail, submitting]);

  if (step === 'request') {
    return (
      <ScreenContainer scroll={scroll} constrained="form">
        <ScreenHeader
          eyebrow="Forgot password"
          title="Reset your password"
          subtitle="Enter your account email and we'll send a 6-digit code to reset your password."
          showRule
          size="large"
        />

        <LabeledInput
          label="Email"
          placeholder="you@studio.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        {error ? <FormErrorText>{error}</FormErrorText> : null}

        <View style={styles.actions}>
          <Button
            title="Send reset code"
            disabled={!emailValid}
            loading={submitting}
            onPress={handleRequest}
          />
          <Button title="Back to sign in" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={scroll} constrained="form">
      <ScreenHeader
        eyebrow="Forgot password"
        title="Enter the code"
        subtitle={`We sent a 6-digit code to ${maskEmail(submittedEmail)}. Enter it and choose a new password.`}
        showRule
        size="large"
      />

      {notice ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <OtpCodeInput value={code} onChange={setCode} />

      <PasswordField
        value={newPassword}
        onChangeText={setNewPassword}
        mode="new"
        hint={passwordTooShortHint()}
      />

      {error ? <FormErrorText>{error}</FormErrorText> : null}

      <View style={styles.resendRow}>
        <Text style={styles.resendInfo}>
          {cooldown > 0
            ? `You can request a new code in ${cooldown}s.`
            : "Didn't receive it? Tap below to resend."}
        </Text>
        <Button
          title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          variant="ghost"
          disabled={cooldown > 0}
          loading={resending}
          onPress={handleResend}
          fullWidth={false}
        />
      </View>

      <View style={styles.actions}>
        <Button
          title="Reset password"
          disabled={!codeValid || !passwordValid}
          loading={submitting}
          onPress={handleReset}
        />
        <Button
          title="Use a different email"
          variant="ghost"
          onPress={() => {
            setStep('request');
            setCode('');
            setNewPassword('');
            setError(null);
            setNotice(null);
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noticeBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noticeText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  resendRow: { gap: spacing.sm, marginTop: spacing.md },
  resendInfo: { ...typography.body, color: colors.textSecondary },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
