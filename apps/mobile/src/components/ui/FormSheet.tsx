import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/theme';

export interface FormSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  scroll?: boolean;
}

/** Full-screen form layout (no Modal) — for routed sheets like create-project. */
export function FormSheetChrome({
  title,
  onClose,
  children,
  scroll = true,
}: Omit<FormSheetProps, 'visible'>) {
  return (
    <ScreenContainer scroll={scroll} topAligned constrained="form">
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
          <Text style={styles.close}>Cancel</Text>
        </Pressable>
      </View>
      {children}
    </ScreenContainer>
  );
}

export function FormSheet({ visible, title, onClose, children, scroll = true }: FormSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <FormSheetChrome title={title} onClose={onClose} scroll={scroll}>
        {children}
      </FormSheetChrome>
    </Modal>
  );
}

export function FormSheetIntro({ children }: { children: ReactNode }) {
  return <Text style={formSheetStyles.intro}>{children}</Text>;
}

export function FormSheetError({ children }: { children: string }) {
  return <Text style={formSheetStyles.error}>{children}</Text>;
}

export function FormSheetActions({ children }: { children: ReactNode }) {
  return <View style={formSheetStyles.actions}>{children}</View>;
}

export function FormSheetFieldLabel({ children }: { children: string }) {
  return <Text style={formSheetStyles.fieldLabel}>{children}</Text>;
}

export const formSheetStyles = StyleSheet.create({
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
  fieldLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { ...typography.bodyStrong, color: colors.textPrimary },
  chipTextActive: { color: colors.accentInk },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: colors.textPrimary, flex: 1 },
  close: { ...typography.bodyStrong, color: colors.brand },
});
