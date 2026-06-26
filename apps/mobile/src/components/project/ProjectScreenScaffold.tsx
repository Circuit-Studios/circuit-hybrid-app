import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AccountButton } from '@/components/AccountButton';
import { useProjectRoom } from '@/realtime/useProjectRoom';
import { colors, radius, spacing, typography } from '@/theme';
import type { ProjectTab } from './ProjectTabBar';

export interface ProjectScreenScaffoldProps {
  projectId: string;
  activeTab: ProjectTab;
  title: string;
  /** Shown after ‹ in the back row. Defaults to "Project". */
  backLabel?: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Right side of the header row — use `ProjectHeaderAction` + `AccountButton`. */
  trailing?: ReactNode;
  scroll?: boolean;
  /** Modals/sheets rendered below the tab bar. */
  footer?: ReactNode;
}

export function ProjectScreenScaffold({
  projectId,
  activeTab,
  title,
  backLabel = 'Project',
  subtitle,
  children,
  trailing,
  scroll = false,
  footer,
}: ProjectScreenScaffoldProps) {
  useProjectRoom(projectId);

  return (
    <View style={styles.root}>
      <ScreenContainer topAligned scroll={scroll} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace(`/(app)/project/${projectId}`)}
            hitSlop={12}
            style={styles.headerBack}
            accessibilityRole="button"
          >
            <Text style={styles.back}>‹ {backLabel}</Text>
          </Pressable>
          <View style={styles.headerTrailing}>
            {trailing}
            <AccountButton />
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        {subtitle}

        {children}
      </ScreenContainer>
      {footer}
    </View>
  );
}

interface ProjectHeaderActionProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

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
  root: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerBack: { flex: 1, marginRight: spacing.sm },
  headerTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { ...typography.bodyStrong, color: colors.textSecondary },
  addBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  addBtnText: { ...typography.bodyStrong, color: colors.accentInk },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.md },
});
