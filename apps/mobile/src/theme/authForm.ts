import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from './tokens';

/** Shared layout styles for login, signup, and related auth screens. */
export const authFormStyles = StyleSheet.create({
  fieldFlush: { marginBottom: spacing.md },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  submitHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.bodyStrong, color: colors.accent },
});
