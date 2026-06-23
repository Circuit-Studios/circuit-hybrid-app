import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface LabeledInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
  trailing?: React.ReactNode;
}

export const LabeledInput = forwardRef<TextInput, LabeledInputProps>(function LabeledInput(
  { label, hint, error, containerStyle, trailing, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && !error ? styles.inputFocused : null,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.micro, color: colors.textSecondary, marginBottom: spacing.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  trailing: { marginLeft: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
});
