import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme';

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

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar}>
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
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons
                  name={focused ? meta.activeIcon : meta.icon}
                  size={20}
                  color={focused ? colors.textPrimary : colors.textMuted}
                />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.brand },
  label: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  labelActive: { color: colors.brand, fontWeight: '700' },
});
