import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useContentFrame } from '@/hooks/useContentFrame';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export type ProjectTab = 'workspace' | 'tasks' | 'schedule' | 'team';

interface ProjectTabBarProps {
  projectId: string;
  active: ProjectTab;
}

const TABS: { id: ProjectTab; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'team', label: 'Team' },
];

export function ProjectTabBar({ projectId, active }: ProjectTabBarProps) {
  const router = useRouter();
  const { horizontalPadding, maxWidth } = useContentFrame('auto');
  const targets = useMemo(
    () =>
      ({
        workspace: `/(app)/project/${projectId}` as const,
        tasks: `/(app)/project/${projectId}/tasks` as const,
        schedule: `/(app)/project/${projectId}/schedule` as const,
        team: `/(app)/project/${projectId}/team` as const,
      }) satisfies Record<ProjectTab, `/(app)/project/${string}${string}`>,
    [projectId],
  );

  return (
    <View style={[styles.outer, { paddingHorizontal: horizontalPadding }]}>
      <View
        style={[
          styles.frame,
          maxWidth != null && { maxWidth, width: '100%', alignSelf: 'center' },
        ]}
      >
        <View style={[styles.bar, shadows.md]}>
          {TABS.map(tab => {
            const isActive = tab.id === active;
            return (
              <Pressable
                key={tab.id}
                style={[styles.btn, isActive && styles.btnActive]}
                onPress={() => {
                  if (isActive) return;
                  router.replace(targets[tab.id]);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  frame: { width: '100%' },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: colors.brandSoft,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
