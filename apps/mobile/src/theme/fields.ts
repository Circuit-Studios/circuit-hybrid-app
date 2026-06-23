import { Platform, StyleSheet, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from './tokens';

/** Fixed-height auth row — icon + text stay vertically centered. */
export const AUTH_FIELD_HEIGHT = 52;

/** TextInput styles that avoid iOS/Android baseline drift inside icon rows. */
export const authInputTextStyle: TextStyle = Platform.select({
  ios: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    paddingVertical: 0,
  },
  android: {
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  default: {
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 0,
  },
})!;

export const authFieldRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  height: AUTH_FIELD_HEIGHT,
  paddingHorizontal: spacing.md,
  borderRadius: radius.lg,
};

/** Shared field chrome for inputs, dropdowns, and date pickers. */
export const fieldStyles = StyleSheet.create({
  label: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 52,
  },
  triggerFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.surface,
  },
  triggerPressed: {
    borderColor: colors.brandStrong,
  },
  value: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textMuted },
  chev: { ...typography.bodyStrong, color: colors.textSecondary, marginLeft: spacing.sm },
  list: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...StyleSheet.flatten({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    }),
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  optionActive: { backgroundColor: colors.brandSoft },
  optionText: { ...typography.body, color: colors.textPrimary },
  optionTextActive: { ...typography.bodyStrong, color: colors.brand },
});
