import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  FloatingTabBar,
  type FloatingTabItem,
} from '@/components/navigation/FloatingTabBar';
import { useChromeInsets } from '@/hooks/useChromeInsets';
import { colors } from '@/theme';
import type { ProjectTab } from './ProjectTabBar';

const TAB_META: Record<
  ProjectTab,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  workspace: { label: 'Overview', icon: 'grid-outline', activeIcon: 'grid' },
  tasks: { label: 'Tasks', icon: 'checkbox-outline', activeIcon: 'checkbox' },
  schedule: { label: 'Schedule', icon: 'calendar-outline', activeIcon: 'calendar' },
  team: { label: 'Team', icon: 'people-outline', activeIcon: 'people' },
};

export interface FloatingProjectTabBarProps {
  projectId: string;
  active: ProjectTab;
}

export function FloatingProjectTabBar({ projectId, active }: FloatingProjectTabBarProps) {
  const router = useRouter();
  const { safeHorizontal, tabBarMaxWidth } = useChromeInsets();

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
    const iconColor = (selected: boolean) => (selected ? colors.textPrimary : colors.textMuted);
    return {
      key: tab,
      label: meta.label,
      accessibilityLabel: meta.label,
      icon: <Ionicons name={meta.icon} size={24} color={iconColor(false)} />,
      activeIcon: <Ionicons name={meta.activeIcon} size={24} color={iconColor(true)} />,
      onPress: () => {
        if (tab === active) return;
        router.replace(targets[tab]);
      },
    };
  });

  return (
    <FloatingTabBar
      items={items}
      activeKey={active}
      horizontalInset={safeHorizontal}
      maxWidth={tabBarMaxWidth}
    />
  );
}
