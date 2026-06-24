import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { authPalette } from '@/theme/authPalette';
import { authFieldRowStyle, authInputTextStyle } from '@/theme/fields';
import { colors, radius, spacing, typography } from '@/theme';
import type { AuthFieldTone } from '@/components/auth/AuthField';

export interface LabeledInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
  trailing?: React.ReactNode;
  tone?: AuthFieldTone;
}

export const LabeledInput = forwardRef<TextInput, LabeledInputProps>(function LabeledInput(
  { label, hint, error, containerStyle, trailing, tone = 'dark', onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const dark = tone === 'dark';
  const labelColor = dark ? authPalette.label : colors.textSecondary;
  const placeholderColor = dark ? authPalette.inputPlaceholder : colors.textMuted;
  const textColor = dark ? authPalette.inputText : colors.textPrimary;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          dark ? styles.inputWrapDark : styles.inputWrapLight,
          focused && !error ? styles.inputFocused : null,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, { color: textColor }]}
          placeholderTextColor={placeholderColor}
          selectionColor={authPalette.brand}
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
        <Text style={[styles.hint, dark && styles.hintDark]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...typography.micro, marginBottom: spacing.xs },
  inputWrap: {
    ...authFieldRowStyle,
    paddingHorizontal: spacing.lg,
  },
  inputWrapDark: {
    backgroundColor: authPalette.inputBg,
    borderWidth: 1,
    borderColor: authPalette.inputBorder,
    borderBottomWidth: 2,
    borderBottomColor: authPalette.inputUnderline,
  },
  inputWrapLight: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inputFocused: {
    borderColor: authPalette.inputAccent,
    borderBottomColor: authPalette.inputAccent,
  },
  inputError: { borderColor: colors.danger },
  input: {
    flex: 1,
    ...authInputTextStyle,
  },
  trailing: { marginLeft: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  hintDark: { color: authPalette.muted },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
});
