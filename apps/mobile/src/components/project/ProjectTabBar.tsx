import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  FloatingTabBar,
  floatingTabIconColor,
  floatingTabIconSize,
  type FloatingTabItem,
} from '@/components/ui/FloatingTabBar';

export type ProjectTab = 'workspace' | 'tasks' | 'schedule' | 'team';

const TAB_META: Record<
  ProjectTab,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  workspace: { label: 'Overview', icon: 'home-outline' },
  tasks: { label: 'Tasks', icon: 'list-outline' },
  schedule: { label: 'Schedule', icon: 'calendar-outline' },
  team: { label: 'Team', icon: 'people-outline' },
};

export interface ProjectTabBarProps {
  projectId: string;
  active: ProjectTab;
}

/** Project workspace navigation — floating glass capsule tab bar. */
export function ProjectTabBar({ projectId, active }: ProjectTabBarProps) {
  const router = useRouter();

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

  const items: FloatingTabItem[] = (Object.keys(TAB_META) as ProjectTab[]).map((tab) => {
    const meta = TAB_META[tab];
    const isActive = tab === active;
    return {
      key: tab,
      label: meta.label,
      accessibilityLabel: meta.label,
      icon: (
        <Ionicons
          name={meta.icon}
          size={floatingTabIconSize(isActive)}
          color={floatingTabIconColor(isActive)}
        />
      ),
      onPress: () => {
        if (tab === active) return;
        router.replace(targets[tab]);
      },
    };
  });

  return <FloatingTabBar items={items} activeKey={active} showLabels />;
}
