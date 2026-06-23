import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormErrorText } from '@/components/FormErrorText';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/auth/AuthContext';
import { useOtpSession } from '@/auth/OtpSessionContext';
import { requestOtp } from '@/api/auth';
import { readApiError } from '@/api/client';
import { useAppConfig } from '@/config/AppConfigContext';
import { useContentFrame } from '@/hooks/useContentFrame';
import { formatRemainingSession, isSessionExpired } from '@/lib/session';
import { maskEmail, maskPhone } from '@/lib/mask';
import { getOtpBoxSize, colors, radius, spacing, typography } from '@/theme';

const RESEND_COOLDOWN = 30;

export default function OtpForm() {
  const router = useRouter();
  const { verifyOtp } = useAuth();
  const { config } = useAppConfig();
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

  const boxSize = useMemo(() => getOtpBoxSize(contentWidth), [contentWidth]);
  const channel = session?.channel ?? config.signupVerificationChannel;
  const destination = channel === 'EMAIL' ? (session?.email ?? '') : (session?.phone ?? '');
  const maskedDestination = channel === 'EMAIL' ? maskEmail(destination) : maskPhone(destination);

  useEffect(() => {
    if (!session) {
      router.replace('/(auth)/auth');
    }
  }, [router, session]);

  useEffect(() => {
    if (!session) return;

    const tick = () => {
      const remainingMs = session.expiresAtMs - Date.now();
      if (remainingMs <= 0) {
        clearSession();
        router.replace('/(auth)/auth');
        return;
      }
      setOtpSecondsLeft(Math.ceil(remainingMs / 1000));
    };

    if (isSessionExpired(session.expiresAtMs)) {
      clearSession();
      router.replace('/(auth)/auth');
      return;
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clearSession, router, session]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  async function handleVerify(value: string) {
    if (value.length !== 6 || submitting || !session) return;
    if (isSessionExpired(session.expiresAtMs)) {
      setError('This code expired. Request a new one.');
      clearSession();
      router.replace('/(auth)/auth');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (channel === 'EMAIL') {
        await verifyOtp({
          channel: 'EMAIL',
          email: session.email!,
          code: value,
          signup:
            session.mode === 'signup' && session.role
              ? {
                  firstName: session.firstName ?? '',
                  lastName: session.lastName ?? '',
                  role: session.role,
                  phone: session.phone,
                  password: session.password,
                }
              : undefined,
        });
      } else {
        await verifyOtp({
          channel: 'PHONE',
          phone: session.phone!,
          code: value,
          signup:
            session.mode === 'signup' && session.role
              ? {
                  firstName: session.firstName ?? '',
                  lastName: session.lastName ?? '',
                  role: session.role,
                  email: session.email,
                  password: session.password,
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
    if (cooldown > 0 || resending || !session) return;
    setResending(true);
    setError(null);
    try {
      const { ttlSeconds } =
        channel === 'EMAIL'
          ? await requestOtp({
              channel: 'EMAIL',
              email: session.email!,
              purpose: 'signup',
            })
          : await requestOtp({
              channel: 'PHONE',
              phone: session.phone!,
              purpose: 'signup',
            });
      extendSession(Date.now() + ttlSeconds * 1000);
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

  if (!session) {
    return (
      <ScreenContainer scroll={scroll} constrained="form">
        <LoadingState />
      </ScreenContainer>
    );
  }

  const digits = code.padEnd(6, ' ').slice(0, 6).split('');
  const channelLabel = channel === 'EMAIL' ? 'email' : 'text message';

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
          onChangeText={value => {
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
          title="Create account"
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
