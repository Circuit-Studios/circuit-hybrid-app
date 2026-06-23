import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassLens, GlassSurface } from '@/components/GlassSurface';
import { useChromeInsets } from '@/hooks/useChromeInsets';
import { colors, spacing, typography } from '@/theme';

type TabKey = 'home' | 'activity' | 'schedule' | 'team';

interface TabRoute {
  key: string;
  name: string;
}

interface TabBarProps {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit(event: { type: 'tabPress'; target: string; canPreventDefault: boolean }): {
      defaultPrevented: boolean;
    };
    navigate(name: string): void;
  };
}

const TAB_META: Record<
  TabKey,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  home: { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  activity: { label: 'Activity', icon: 'pulse-outline', activeIcon: 'pulse' },
  schedule: { label: 'Schedule', icon: 'calendar-outline', activeIcon: 'calendar' },
  team: { label: 'Team', icon: 'people-outline', activeIcon: 'people' },
};

function routeToTab(name: string): TabKey | null {
  if (name === 'home') return 'home';
  if (name === 'activity') return 'activity';
  if (name === 'schedule') return 'schedule';
  if (name === 'team') return 'team';
  return null;
}

export type AppTabBarProps = TabBarProps;

export function AppTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { compactTabBar, safeHorizontal, tabBarMaxWidth } = useChromeInsets();

  return (
    <View
      style={[
        styles.shell,
        {
          left: safeHorizontal,
          right: safeHorizontal,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      <GlassSurface
        variant="bar"
        style={[
          styles.bar,
          tabBarMaxWidth != null && { maxWidth: tabBarMaxWidth, alignSelf: 'center' },
        ]}
      >
        <View style={[styles.row, compactTabBar && styles.rowCompact]}>
          {state.routes.map((route, index) => {
            const tab = routeToTab(route.name);
            if (!tab) return null;

            const focused = state.index === index;
            const meta = TAB_META[tab];
            const { options } = descriptors[route.key]!;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.label}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={styles.item}
              >
                {focused ? (
                  <GlassLens
                    style={[styles.activeLens, compactTabBar && styles.activeLensCompact]}
                  />
                ) : null}
                <View style={[styles.iconWrap, compactTabBar && styles.iconWrapCompact]}>
                  <Ionicons
                    name={focused ? meta.activeIcon : meta.icon}
                    size={compactTabBar ? 22 : 20}
                    color={focused ? colors.brand : colors.textMuted}
                  />
                </View>
                {!compactTabBar ? (
                  <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                    {meta.label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    bottom: 0,
  },
  bar: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  rowCompact: {
    paddingVertical: spacing.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    position: 'relative',
    minWidth: 0,
  },
  activeLens: {
    position: 'absolute',
    top: 0,
    left: spacing.xs,
    right: spacing.xs,
    bottom: 18,
  },
  activeLensCompact: {
    bottom: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrapCompact: {
    width: 44,
    height: 44,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    zIndex: 1,
  },
  labelActive: {
    color: colors.brand,
    fontWeight: '700',
  },
});
