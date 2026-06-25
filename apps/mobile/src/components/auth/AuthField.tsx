import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthMetrics } from '@/features/auth/AuthMetricsContext';
import { authPalette } from '@/theme/authPalette';
import { authInputChrome } from '@/theme/authInputChrome';
import { authFieldLabelStyle } from '@/theme/authTypography';
import { authFieldRowStyleFromMetrics, type AuthFieldVariant } from '@/theme/fields';

export interface AuthFieldProps extends TextInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  fieldVariant?: AuthFieldVariant;
  hideLabel?: boolean;
}

/** Glass auth input with leading icon. */
export function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  fieldVariant = 'signIn',
  hideLabel = false,
  ...rest
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const metrics = useAuthMetrics(fieldVariant === 'signUp' ? 'signUp' : 'signIn');

  return (
    <View style={[styles.field, { marginBottom: metrics.fieldGap }]}>
      {!hideLabel ? (
        <Text
          style={[
            styles.fieldLabel,
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
          focused && authInputChrome.focused,
        ]}
      >
        <View style={styles.fieldIconWrap}>
          <Ionicons name={icon} size={18} color={authPalette.inputIcon} />
        </View>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={authPalette.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          selectionColor={authPalette.brand}
          style={[styles.fieldInput, { fontSize: metrics.inputFontSize }]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {},
  fieldLabel: {
    ...authFieldLabelStyle,
    color: authPalette.label,
  },
  fieldIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  fieldInput: {
    flex: 1,
    color: authPalette.inputText,
    paddingVertical: 0,
  },
});
