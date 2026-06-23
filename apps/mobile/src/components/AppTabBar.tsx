import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import {
  FloatingTabBar,
  floatingTabIconColor,
  type FloatingTabItem,
} from '@/components/ui/FloatingTabBar';

type AppTabKey = 'home' | 'activity' | 'schedule' | 'team';

const TAB_META: Record<
  AppTabKey,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    href: `/(app)/(tabs)/${AppTabKey}`;
  }
> = {
  home: {
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
    href: '/(app)/(tabs)/home',
  },
  activity: {
    label: 'Activity',
    icon: 'notifications-outline',
    activeIcon: 'notifications',
    href: '/(app)/(tabs)/activity',
  },
  schedule: {
    label: 'Schedule',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
    href: '/(app)/(tabs)/schedule',
  },
  team: {
    label: 'Team',
    icon: 'people-outline',
    activeIcon: 'people',
    href: '/(app)/(tabs)/team',
  },
};

function resolveActiveTab(pathname: string): AppTabKey {
  if (pathname.includes('/activity')) return 'activity';
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
      return {
        key,
        label: meta.label,
        href: meta.href,
        accessibilityLabel: meta.label,
        icon: <Ionicons name={meta.icon} size={24} color={floatingTabIconColor(false)} />,
        activeIcon: <Ionicons name={meta.activeIcon} size={24} color={floatingTabIconColor(true)} />,
        onPress: () => {
          if (key === activeKey) return;
          router.replace(meta.href);
        },
      };
    });
  }, [activeKey, router]);

  return <FloatingTabBar items={items} activeKey={activeKey} />;
}
