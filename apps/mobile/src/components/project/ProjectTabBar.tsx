import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GlassLens, GlassSurface } from '@/components/GlassSurface';
import { useChromeInsets } from '@/hooks/useChromeInsets';
import { useContentFrame } from '@/hooks/useContentFrame';
import { colors, spacing, typography } from '@/theme';

export type ProjectTab = 'workspace' | 'tasks' | 'schedule' | 'team';

interface ProjectTabBarProps {
  projectId: string;
  active: ProjectTab;
}

const TABS: { id: ProjectTab; label: string; shortLabel: string }[] = [
  { id: 'workspace', label: 'Workspace', shortLabel: 'Work' },
  { id: 'tasks', label: 'Tasks', shortLabel: 'Tasks' },
  { id: 'schedule', label: 'Schedule', shortLabel: 'Schedule' },
  { id: 'team', label: 'Team', shortLabel: 'Team' },
];

export function ProjectTabBar({ projectId, active }: ProjectTabBarProps) {
  const router = useRouter();
  const { horizontalPadding, maxWidth } = useContentFrame('auto');
  const { compactTabBar, tabBarMaxWidth } = useChromeInsets();
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
        style={[styles.frame, maxWidth != null && { maxWidth, width: '100%', alignSelf: 'center' }]}
      >
        <GlassSurface
          variant="bar"
          style={[
            styles.bar,
            tabBarMaxWidth != null && { maxWidth: tabBarMaxWidth, alignSelf: 'center' },
          ]}
        >
          <View style={[styles.row, compactTabBar && styles.rowCompact]}>
            {TABS.map((tab) => {
              const isActive = tab.id === active;
              const label = compactTabBar ? tab.shortLabel : tab.label;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.btn, compactTabBar && styles.btnCompact]}
                  onPress={() => {
                    if (isActive) return;
                    router.replace(targets[tab.id]);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tab.label}
                >
                  {isActive ? <GlassLens style={StyleSheet.absoluteFill} /> : null}
                  <Text
                    style={[
                      styles.label,
                      compactTabBar && styles.labelCompact,
                      isActive && styles.labelActive,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassSurface>
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
  bar: { width: '100%' },
  row: {
    flexDirection: 'row',
    padding: spacing.xs,
    gap: spacing.xs,
  },
  rowCompact: {
    padding: 4,
    gap: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    minWidth: 0,
    paddingHorizontal: spacing.xs,
  },
  btnCompact: {
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    zIndex: 1,
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 11,
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
