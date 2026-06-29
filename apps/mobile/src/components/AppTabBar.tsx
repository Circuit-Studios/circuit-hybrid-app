import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import {
  FloatingTabBar,
  floatingTabIconColor,
  floatingTabIconSize,
  type FloatingTabItem,
} from '@/components/ui/FloatingTabBar';

type AppTabKey = 'home' | 'tasks' | 'schedule' | 'team';

const TAB_META: Record<
  AppTabKey,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    href: `/(app)/(tabs)/${AppTabKey}`;
  }
> = {
  home: {
    label: 'Home',
    icon: 'home-outline',
    href: '/(app)/(tabs)/home',
  },
  tasks: {
    label: 'Tasks',
    icon: 'list-outline',
    href: '/(app)/(tabs)/tasks',
  },
  schedule: {
    label: 'Schedule',
    icon: 'calendar-outline',
    href: '/(app)/(tabs)/schedule',
  },
  team: {
    label: 'Team',
    icon: 'people-outline',
    href: '/(app)/(tabs)/team',
  },
};

function resolveActiveTab(pathname: string): AppTabKey {
  if (pathname.includes('/tasks')) return 'tasks';
  if (pathname.includes('/schedule')) return 'schedule';
  if (pathname.includes('/team')) return 'team';
  return 'home';
}

export function AppTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = resolveActiveTab(pathname);

  const items: FloatingTabItem[] = useMemo(() => {
    return (Object.keys(TAB_META) as AppTabKey[]).map((key) => {
      const meta = TAB_META[key];
      const active = key === activeKey;
      return {
        key,
        label: meta.label,
        href: meta.href,
        accessibilityLabel: meta.label,
        icon: (
          <Ionicons
            name={meta.icon}
            size={floatingTabIconSize(active)}
            color={floatingTabIconColor(active)}
          />
        ),
        onPress: () => {
          if (key === activeKey) return;
          router.replace(meta.href);
        },
      };
    });
  }, [activeKey, router]);

  return <FloatingTabBar items={items} activeKey={activeKey} showLabels />;
}
