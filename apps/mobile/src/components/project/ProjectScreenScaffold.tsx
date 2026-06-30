import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface ProjectHeaderActionProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** Pill action button used in project tab headers (e.g. "+ Add task"). */
export function ProjectHeaderAction({ label, onPress, disabled }: ProjectHeaderActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.addBtn,
        pressed && !disabled && { opacity: 0.7 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={styles.addBtnText}>{label}</Text>
    </Pressable>
  );
}

export const projectScreenStyles = StyleSheet.create({
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
});

const styles = StyleSheet.create({
  addBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  addBtnText: { ...typography.bodyStrong, color: colors.accentInk },
});
