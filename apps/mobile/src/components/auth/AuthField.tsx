import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';

export interface AuthFieldProps extends TextInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}

/** Glass auth input with leading icon — shared by sign-in and sign-up. */
export function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  compact = false,
  ...rest
}: AuthFieldProps) {
  return (
    <View style={[styles.field, compact && styles.fieldCompact]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.fieldIcon} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          style={styles.fieldInput}
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
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  fieldIcon: { marginRight: spacing.sm },
  fieldInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
    paddingVertical: spacing.md,
  },
});
