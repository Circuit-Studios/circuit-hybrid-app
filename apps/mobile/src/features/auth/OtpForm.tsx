import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormErrorText } from '@/components/FormErrorText';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/auth/AuthContext';
import { useSignupSession } from '@/auth/SignupSessionContext';
import { requestOtp } from '@/api/auth';
import { readApiError } from '@/api/client';
import { useContentFrame } from '@/hooks/useContentFrame';
import { formatRemainingSession, isSessionExpired } from '@/lib/session';
import { getOtpBoxSize, colors, radius, spacing, typography } from '@/theme';

const RESEND_COOLDOWN = 30;

export default function OtpForm() {
  const router = useRouter();
  const { verifyOtp } = useAuth();
  const { session, clearSession, extendSession } = useSignupSession();
  const { contentWidth, isLandscape, isCompactHeight } = useContentFrame('form');
  const scroll = isLandscape || isCompactHeight;
  const params = useLocalSearchParams<{ mode?: 'signup' }>();
  const isSignup = params.mode === 'signup';
  const phone = session?.phone ?? '';

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const boxSize = useMemo(() => getOtpBoxSize(contentWidth), [contentWidth]);

  useEffect(() => {
    if (!isSignup || session) return;
    router.replace('/(auth)/signup');
  }, [isSignup, router, session]);

  useEffect(() => {
    if (!session) return;

    const tick = () => {
      const remainingMs = session.expiresAtMs - Date.now();
      if (remainingMs <= 0) {
        clearSession();
        router.replace('/(auth)/signup');
        return;
      }
      setOtpSecondsLeft(Math.ceil(remainingMs / 1000));
    };

    if (isSessionExpired(session.expiresAtMs)) {
      clearSession();
      router.replace('/(auth)/signup');
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
      router.replace('/(auth)/signup');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await verifyOtp({
        phone: session.phone,
        code: value,
        signup: {
          firstName: session.firstName,
          lastName: session.lastName,
          role: session.role,
          password: session.password,
        },
      });
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
      const { ttlSeconds } = await requestOtp(session.phone, 'signup');
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

  return (
    <ScreenContainer scroll={scroll} constrained="form">
      <ScreenHeader
        eyebrow="Verify your number"
        title="Enter the code"
        subtitle={`We sent a 6-digit code to ${phone}. Code expires in ${formatRemainingSession(otpSecondsLeft)}.`}
        showRule
        size="large"
      />

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
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={6}
          accessibilityLabel="One-time code"
          caretHidden
        />
      </View>

      {error ? <FormErrorText>{error}</FormErrorText> : null}

      <View style={styles.resendRow}>
        <Text style={styles.resendInfo}>Didn't receive it?</Text>
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
        <Button title="Change number" variant="ghost" onPress={handleBack} />
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
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  resendInfo: { ...typography.body, color: colors.textSecondary },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
