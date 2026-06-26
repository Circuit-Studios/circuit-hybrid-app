import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

const OPTIONS_MAX_HEIGHT = 240;

/** Shared styles for dropdown and chip pickers. */
export { OPTIONS_MAX_HEIGHT };
export const pickerStyles = StyleSheet.create({
  label: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dropdownWrap: { marginBottom: spacing.lg },
  dropdownWrapOpen: { zIndex: 30, elevation: 8 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dropdownTriggerPressed: { borderColor: colors.accent },
  dropdownTriggerOpen: { borderColor: colors.accent },
  dropdownValue: { ...typography.body, color: colors.textPrimary, flex: 1 },
  dropdownPlaceholder: { color: colors.textMuted },
  chev: { ...typography.bodyStrong, color: colors.textSecondary, marginLeft: spacing.sm },
  dropdownList: {
    marginTop: spacing.sm,
    maxHeight: OPTIONS_MAX_HEIGHT,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 8,
  },
  dropdownOptionsScroll: {
    maxHeight: OPTIONS_MAX_HEIGHT,
  },
  dropdownOptionsContent: {
    flexGrow: 0,
  },
  dropdownOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownOptionActive: { backgroundColor: colors.accentSoft },
  dropdownOptionPressed: { opacity: 0.85 },
  dropdownOptionText: { ...typography.body, color: colors.textPrimary },
  dropdownOptionTextActive: { ...typography.bodyStrong, color: colors.accent },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.accent,
  },
  doneBtnPressed: { opacity: 0.85 },
  doneBtnText: { ...typography.bodyStrong, color: colors.accentInk },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.pill,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { ...typography.bodyStrong, color: colors.textPrimary },
  chipTextActive: { color: colors.accentInk },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  modalList: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
