import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormErrorText } from '@/components/FormErrorText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthContext';
import { useOtpSession } from '@/auth/OtpSessionContext';
import { requestOtp } from '@/api/auth';
import { readApiError } from '@/api/client';
import { useContentFrame } from '@/hooks/useContentFrame';
import { formatRemainingSession } from '@/lib/session';
import { validateOtpSession, otpSessionErrorMessage } from '@/lib/otp-session';
import { maskEmail, maskPhone } from '@/lib/mask';
import { getOtpBoxSize, colors, radius, spacing, typography } from '@/theme';

const RESEND_COOLDOWN = 30;

export default function OtpForm() {
  const router = useRouter();
  const { verifyOtp } = useAuth();
  const { session, clearSession, extendSession } = useOtpSession();
  const { contentWidth, isLandscape, isCompactHeight } = useContentFrame('form');
  const scroll = isLandscape || isCompactHeight;

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionValidation = useMemo(() => validateOtpSession(session), [session]);

  const boxSize = useMemo(() => getOtpBoxSize(contentWidth), [contentWidth]);
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

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

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
          signup:
            activeSession.mode === 'signup' && activeSession.role && activeSession.password
              ? {
                  firstName: activeSession.firstName ?? '',
                  lastName: activeSession.lastName ?? '',
                  role: activeSession.role,
                  phone: activeSession.phone,
                  password: activeSession.password,
                }
              : undefined,
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
          signup:
            activeSession.mode === 'signup' && activeSession.role && activeSession.password
              ? {
                  firstName: activeSession.firstName ?? '',
                  lastName: activeSession.lastName ?? '',
                  role: activeSession.role,
                  email: activeSession.email,
                  password: activeSession.password,
                }
              : undefined,
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

  const digits = code.padEnd(6, ' ').slice(0, 6).split('');
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

      <View style={styles.boxes}>
        {digits.map((d, i) => (
          <View
            key={i}
            style={[
              styles.box,
              { width: boxSize.width, height: boxSize.height },
              i === code.length && styles.boxActive,
              code.length === 6 && styles.boxFilled,
            ]}
          >
            <Text style={styles.boxText}>{d.trim()}</Text>
          </View>
        ))}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(value) => {
            const next = value.replace(/[^0-9]/g, '').slice(0, 6);
            setCode(next);
            if (next.length === 6) void handleVerify(next);
          }}
          style={styles.hiddenInput}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          accessibilityLabel="One-time code"
          caretHidden
        />
      </View>

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
  boxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  box: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  boxFilled: { borderColor: colors.accentMuted },
  boxText: { ...typography.title, color: colors.textPrimary },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: 1 },
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
