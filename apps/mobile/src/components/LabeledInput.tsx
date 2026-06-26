import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthMetrics } from '@/features/auth/AuthMetricsContext';
import { authPalette } from '@/theme/authPalette';
import { authInputChrome } from '@/theme/authInputChrome';
import { typography } from '@/theme';
import { authFieldLabelStyle } from '@/theme/authTypography';
import { authFieldRowStyleFromMetrics, type AuthFieldVariant } from '@/theme/fields';

export interface LabeledInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
  trailing?: React.ReactNode;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  fieldVariant?: AuthFieldVariant;
  hideLabel?: boolean;
}

export const LabeledInput = forwardRef<TextInput, LabeledInputProps>(function LabeledInput(
  {
    label,
    hint,
    error,
    containerStyle,
    trailing,
    leadingIcon,
    fieldVariant = 'signIn',
    hideLabel = false,
    onFocus,
    onBlur,
    secureTextEntry,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);
  const metrics = useAuthMetrics();

  const showEye = secureTextEntry;

  return (
    <View style={[styles.wrap, { marginBottom: metrics.fieldGap }, containerStyle]}>
      {!hideLabel ? (
        <Text
          style={[
            styles.label,
            {
              marginBottom: metrics.labelMarginBottom,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          authFieldRowStyleFromMetrics(metrics),
          authInputChrome.base,
          focused && !error ? authInputChrome.focused : null,
          error ? authInputChrome.error : null,
        ]}
      >
        {leadingIcon ? (
          <View style={styles.leading}>
            <Ionicons name={leadingIcon} size={18} color={authPalette.inputIcon} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          style={[styles.input, { fontSize: metrics.inputFontSize }]}
          placeholderTextColor={authPalette.inputPlaceholder}
          selectionColor={authPalette.brand}
          secureTextEntry={hidden}
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
        {showEye ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((v) => !v)}
            hitSlop={8}
            style={styles.trailing}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={authPalette.inputIcon}
            />
          </Pressable>
        ) : trailing ? (
          <View style={styles.trailing}>{trailing}</View>
        ) : null}
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
  wrap: {},
  label: {
    ...authFieldLabelStyle,
    color: authPalette.label,
  },
  leading: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: authPalette.inputText,
    paddingVertical: 0,
  },
  trailing: { marginLeft: 8 },
  hint: {
    ...typography.caption,
    color: authPalette.segmentInactiveText,
    marginTop: 8,
  },
  errorText: { ...typography.caption, color: authPalette.error, marginTop: 8 },
});
