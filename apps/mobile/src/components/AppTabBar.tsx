import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import {
  FloatingTabBar,
  floatingTabIconColor,
  floatingTabIconSize,
  type FloatingTabItem,
} from '@/components/ui/FloatingTabBar';
import { useChromeInsets } from '@/hooks/useChromeInsets';

type AppTabKey = 'home' | 'activity' | 'schedule' | 'team';

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
  activity: {
    label: 'Activity',
    icon: 'pulse-outline',
    href: '/(app)/(tabs)/activity',
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

/** Stack overlays sit above tabs — no footer tab should look selected. */
function isOverlayRoute(pathname: string): boolean {
  return (
    pathname.includes('/notifications') ||
    pathname.includes('/account') ||
    pathname.includes('/projects') ||
    pathname.includes('/create-project') ||
    pathname.includes('/project/')
  );
}

function resolveActiveTab(pathname: string): AppTabKey | null {
  if (isOverlayRoute(pathname)) return null;
  if (pathname.includes('/activity')) return 'activity';
  if (pathname.includes('/schedule')) return 'schedule';
  if (pathname.includes('/team')) return 'team';
  if (pathname.includes('/home')) return 'home';
  return null;
}

export function AppTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { compactTabBar } = useChromeInsets();
  const activeKey = resolveActiveTab(pathname);
  const onTabRoute = activeKey !== null;

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
          // On overlays (notifications, account, …) a tab may look inactive but
          // still match the fallback key — always navigate back to tabs.
          if (key === activeKey && onTabRoute) return;
          router.replace(meta.href);
        },
      };
    });
  }, [activeKey, onTabRoute, router]);

  return (
    <FloatingTabBar
      items={items}
      activeKey={activeKey ?? ''}
      showLabels
      compact={compactTabBar}
    />
  );
}
