import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useContentFrame } from '@/hooks/useContentFrame';
import { getOtpBoxSize, colors, radius, spacing, typography } from '@/theme';

const OTP_LENGTH = 6;

interface OtpCodeInputProps {
  value: string;
  onChange(next: string): void;
  onComplete?(code: string): void;
  autoFocus?: boolean;
  editable?: boolean;
}

/** Shared 6-digit OTP entry boxes used across signup/login and password reset. */
export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  autoFocus = true,
  editable = true,
}: OtpCodeInputProps) {
  const { contentWidth } = useContentFrame('form');
  const inputRef = useRef<TextInput>(null);
  const boxSize = useMemo(() => getOtpBoxSize(contentWidth), [contentWidth]);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const digits = value.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).split('');

  return (
    <View style={styles.boxes}>
      {digits.map((d, i) => (
        <View
          key={i}
          style={[
            styles.box,
            { width: boxSize.width, height: boxSize.height },
            i === value.length && styles.boxActive,
            value.length === OTP_LENGTH && styles.boxFilled,
          ]}
        >
          <Text style={styles.boxText}>{d.trim()}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        editable={editable}
        onChangeText={(next) => {
          const sanitized = next.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
          onChange(sanitized);
          if (sanitized.length === OTP_LENGTH) onComplete?.(sanitized);
        }}
        style={styles.hiddenInput}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={OTP_LENGTH}
        accessibilityLabel="One-time code"
        caretHidden
      />
    </View>
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
});
