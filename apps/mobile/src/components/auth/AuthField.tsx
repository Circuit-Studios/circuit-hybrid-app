import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authPalette } from '@/theme/authPalette';
import { authFieldRowStyle, authInputTextStyle } from '@/theme/fields';
import { colors, radius, spacing, typography } from '@/theme';

export type AuthFieldTone = 'light' | 'dark';

export interface AuthFieldProps extends TextInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  tone?: AuthFieldTone;
}

/** Auth input with leading icon — dark fields on the sign-up mockup palette. */
export function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  compact = false,
  tone = 'dark',
  ...rest
}: AuthFieldProps) {
  const dark = tone === 'dark';
  const labelColor = dark ? authPalette.label : colors.textSecondary;
  const iconColor = dark ? authPalette.muted : colors.textMuted;
  const placeholderColor = dark ? authPalette.inputPlaceholder : colors.textMuted;
  const textColor = dark ? authPalette.inputText : colors.textPrimary;

  return (
    <View style={[styles.field, compact && styles.fieldCompact]}>
      <Text style={[styles.fieldLabel, { color: labelColor }]}>{label}</Text>
      <View style={[styles.fieldRow, dark ? styles.fieldRowDark : styles.fieldRowLight]}>
        <View style={styles.fieldIconWrap}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
          selectionColor={authPalette.brand}
          style={[styles.fieldInput, { color: textColor }]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  fieldCompact: { marginBottom: spacing.md },
  fieldLabel: {
    ...typography.micro,
    marginBottom: spacing.xs,
  },
  fieldRow: {
    ...authFieldRowStyle,
  },
  fieldRowDark: {
    backgroundColor: authPalette.inputBg,
    borderWidth: 1,
    borderColor: authPalette.inputBorder,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(232,185,49,0.35)',
  },
  fieldRowLight: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  fieldIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  fieldInput: {
    flex: 1,
    ...authInputTextStyle,
  },
});
