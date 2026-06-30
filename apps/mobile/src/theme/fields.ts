import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import type { AuthLayoutMetrics } from '@/features/auth/getAuthLayoutMetrics';
import { colors, radius, spacing, typography } from './tokens';
import { authLayout } from './authLayout';

export type AuthFieldVariant = 'signIn' | 'signUp';

export function getAuthFieldHeight(variant: AuthFieldVariant = 'signIn'): number {
  return variant === 'signUp' ? authLayout.fieldHeightSignUp : authLayout.fieldHeightSignIn;
}

export function authFieldRowStyle(variant: AuthFieldVariant = 'signIn'): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    height: getAuthFieldHeight(variant),
    paddingHorizontal: 16,
    borderRadius: authLayout.fieldRadius,
  };
}

export function authFieldRowStyleFromMetrics(metrics: AuthLayoutMetrics): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    height: metrics.inputHeight,
    paddingHorizontal: 16,
    borderRadius: metrics.inputRadius,
  };
}

/** TextInput styles that avoid iOS/Android baseline drift inside icon rows. */
export const authInputTextStyle: TextStyle = Platform.select({
  ios: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    lineHeight: typography.body.lineHeight,
    paddingVertical: 0,
  },
  android: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    lineHeight: typography.body.lineHeight,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  default: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    lineHeight: typography.body.lineHeight,
    paddingVertical: 0,
  },
})!;

/** @deprecated Use getAuthFieldHeight('signIn') */
export const AUTH_FIELD_HEIGHT = authLayout.fieldHeightSignIn;

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
