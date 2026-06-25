import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormErrorText } from '@/components/FormErrorText';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthContext';
import { useOtpSession } from '@/auth/OtpSessionContext';
import { requestOtp } from '@/api/auth';
import { readApiError } from '@/api/client';
import { useContentFrame } from '@/hooks/useContentFrame';
import { formatRemainingSession } from '@/lib/session';
import { validateOtpSession, otpSessionErrorMessage, buildVerifySignupPayload } from '@/lib/otp-session';
import { maskEmail, maskPhone } from '@/lib/mask';
import { colors, radius, spacing, typography } from '@/theme';

const RESEND_COOLDOWN = 30;

export default function OtpForm() {
  const router = useRouter();
  const { verifyOtp } = useAuth();
  const { session, clearSession, extendSession } = useOtpSession();
  const { isLandscape, isCompactHeight } = useContentFrame('form');
  const scroll = isLandscape || isCompactHeight;

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionValidation = useMemo(() => validateOtpSession(session), [session]);

  const channel = sessionValidation.ok ? sessionValidation.session.channel : undefined;
  const destination = sessionValidation.ok
    ? sessionValidation.session.channel === 'EMAIL'
      ? (sessionValidation.session.email ?? '')
      : (sessionValidation.session.phone ?? '')
    : '';
  const maskedDestination =
    channel === 'EMAIL'
      ? maskEmail(destination)
      : channel === 'PHONE'
        ? maskPhone(destination)
        : '';

  useEffect(() => {
    if (sessionValidation.ok) return;
    if (sessionValidation.issue === 'expired') {
      clearSession();
      router.replace('/(auth)/auth');
    }
  }, [clearSession, router, sessionValidation]);

  useEffect(() => {
    if (!sessionValidation.ok) return;

    const activeSession = sessionValidation.session;
    const tick = () => {
      const remainingMs = activeSession.expiresAtMs - Date.now();
      if (remainingMs <= 0) {
        clearSession();
        router.replace('/(auth)/auth');
        return;
      }
      setOtpSecondsLeft(Math.ceil(remainingMs / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clearSession, router, sessionValidation]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify(value: string) {
    if (value.length !== 6 || submitting) return;
    const validation = validateOtpSession(session);
    if (!validation.ok) {
      setError(otpSessionErrorMessage(validation.issue));
      return;
    }

    const activeSession = validation.session;
    if (activeSession.channel === 'EMAIL' && !activeSession.email) {
      setError(otpSessionErrorMessage('missing_destination'));
      return;
    }
    if (activeSession.channel === 'PHONE' && !activeSession.phone) {
      setError(otpSessionErrorMessage('missing_destination'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const purpose = activeSession.mode === 'signup' ? 'signup' : 'login';
      const signup =
        activeSession.mode === 'signup' ? buildVerifySignupPayload(activeSession) : undefined;

      if (activeSession.channel === 'EMAIL') {
        const email = activeSession.email;
        if (!email) {
          setError(otpSessionErrorMessage('missing_destination'));
          return;
        }
        await verifyOtp({
          channel: 'EMAIL',
          email,
          code: value,
          purpose,
          signup,
        });
      } else {
        const phone = activeSession.phone;
        if (!phone) {
          setError(otpSessionErrorMessage('missing_destination'));
          return;
        }
        await verifyOtp({
          channel: 'PHONE',
          phone,
          code: value,
          purpose,
          signup,
        });
      }
      clearSession();
    } catch (err) {
      setError(readApiError(err, 'Invalid code, try again'));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    const validation = validateOtpSession(session);
    if (!validation.ok) {
      setError(otpSessionErrorMessage(validation.issue));
      return;
    }

    const activeSession = validation.session;
    if (activeSession.channel === 'EMAIL' && !activeSession.email) {
      setError(otpSessionErrorMessage('missing_destination'));
      return;
    }
    if (activeSession.channel === 'PHONE' && !activeSession.phone) {
      setError(otpSessionErrorMessage('missing_destination'));
      return;
    }

    setResending(true);
    setError(null);
    try {
      const otpPurpose = activeSession.mode === 'login' ? 'login' : 'signup';
      if (activeSession.channel === 'EMAIL') {
        const email = activeSession.email;
        if (!email) {
          setError(otpSessionErrorMessage('missing_destination'));
          return;
        }
        const { ttlSeconds } = await requestOtp({
          channel: 'EMAIL',
          email,
          purpose: otpPurpose,
        });
        extendSession(Date.now() + ttlSeconds * 1000);
      } else {
        const phone = activeSession.phone;
        if (!phone) {
          setError(otpSessionErrorMessage('missing_destination'));
          return;
        }
        const { ttlSeconds } = await requestOtp({
          channel: 'PHONE',
          phone,
          purpose: otpPurpose,
        });
        extendSession(Date.now() + ttlSeconds * 1000);
      }
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(readApiError(err, 'Could not resend'));
    } finally {
      setResending(false);
    }
  }

  function handleBack() {
    clearSession();
    router.back();
  }

  function returnToAuth() {
    clearSession();
    router.replace('/(auth)/auth');
  }

  if (!sessionValidation.ok) {
    return (
      <ScreenContainer scroll={scroll} constrained="form">
        <ScreenHeader
          eyebrow="Verification"
          title="Session problem"
          subtitle={otpSessionErrorMessage(sessionValidation.issue)}
          showRule
          size="large"
        />
        <FormErrorText>{otpSessionErrorMessage(sessionValidation.issue)}</FormErrorText>
        <View style={styles.actions}>
          <Button title="Back to sign in" onPress={returnToAuth} />
        </View>
      </ScreenContainer>
    );
  }

  const activeSession = sessionValidation.session;

  const channelLabel = channel === 'EMAIL' ? 'email' : 'text message';
  const verifyCta = activeSession.mode === 'login' ? 'Sign in' : 'Create account';

  return (
    <ScreenContainer scroll={scroll} constrained="form">
      <ScreenHeader
        eyebrow={channel === 'EMAIL' ? 'Verify your email' : 'Verify your phone'}
        title="Enter the code"
        subtitle={`We sent a 6-digit code via ${channelLabel} to ${maskedDestination}.`}
        showRule
        size="large"
      />

      <View style={styles.expiryBanner}>
        <Text style={styles.expiryText}>
          Code expires in {formatRemainingSession(otpSecondsLeft)}. Enter it before the timer runs
          out.
        </Text>
      </View>

      <OtpCodeInput
        value={code}
        onChange={setCode}
        onComplete={(next) => void handleVerify(next)}
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
          title={verifyCta}
          disabled={code.length !== 6}
          loading={submitting}
          onPress={() => handleVerify(code)}
        />
        <Button
          title={channel === 'EMAIL' ? 'Change email' : 'Change phone'}
          variant="ghost"
          onPress={handleBack}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  expiryBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  expiryText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  resendRow: { gap: spacing.sm, marginTop: spacing.md },
  resendInfo: { ...typography.body, color: colors.textSecondary },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
