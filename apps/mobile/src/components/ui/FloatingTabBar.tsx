import type { ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MAX_WIDTH,
  FLOATING_TAB_BAR_WIDTH_RATIO,
  FLOATING_TAB_ITEM_ACTIVE_WIDTH,
  FLOATING_TAB_ITEM_MIN,
} from '@/components/ui/floatingTabBarMetrics';
import { colors, radius, spacing, typography } from '@/theme';

const ICON_INACTIVE = '#6B7280';
const ICON_ACTIVE = '#121212';

export type FloatingTabItem = {
  key: string;
  icon: ReactNode;
  activeIcon?: ReactNode;
  href?: string;
  onPress?: () => void;
  accessibilityLabel: string;
  label?: string;
};

export type FloatingTabBarProps = {
  items: FloatingTabItem[];
  activeKey: string;
  bottomOffset?: number;
  showLabels?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Override computed bar width (defaults to ~86% of screen, max 430). */
  barWidth?: number;
};

/**
 * Instagram-style floating glass capsule tab bar.
 * Absolutely positioned — pair screens with `useChromeInsets().projectTabBarReserve`.
 */
export function FloatingTabBar({
  items,
  activeKey,
  bottomOffset,
  showLabels = false,
  style,
  barWidth: barWidthProp,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const bottomPad = bottomOffset ?? Math.max(insets.bottom, spacing.sm);
  const barWidth =
    barWidthProp ?? Math.min(FLOATING_TAB_BAR_MAX_WIDTH, screenWidth * FLOATING_TAB_BAR_WIDTH_RATIO);

  return (
    <View pointerEvents="box-none" style={[styles.shell, { paddingBottom: bottomPad }, style]}>
      <View style={[styles.capsule, styles.capsuleShadow, { width: barWidth }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 88 : 72}
          tint={Platform.OS === 'ios' ? 'systemChromeMaterialLight' : 'extraLight'}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          style={[StyleSheet.absoluteFill, styles.blur]}
        />
        <View pointerEvents="none" style={styles.glassTint} />
        <View pointerEvents="none" style={styles.specular} />

        <View style={styles.row}>
          {items.map((item) => {
            const active = item.key === activeKey;
            const icon = active && item.activeIcon != null ? item.activeIcon : item.icon;

            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.accessibilityLabel}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.item,
                  active ? styles.itemActive : styles.itemInactive,
                  pressed && !active && styles.itemPressed,
                ]}
              >
                <View style={styles.iconWell}>{icon}</View>
                {showLabels && item.label ? (
                  <Text
                    style={[styles.label, active && styles.labelActive]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Default near-black icon color for tab items. */
export function floatingTabIconColor(active: boolean): string {
  return active ? ICON_ACTIVE : ICON_INACTIVE;
}

const CAPSULE_RADIUS = radius.pill;

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  capsule: {
    minHeight: FLOATING_TAB_BAR_HEIGHT,
    borderRadius: CAPSULE_RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.62)',
  },
  capsuleShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.14,
      shadowRadius: 28,
    },
    android: { elevation: 12 },
    default: {},
  }),
  blur: {
    borderRadius: CAPSULE_RADIUS,
  },
  glassTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: CAPSULE_RADIUS,
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  item: {
    minHeight: FLOATING_TAB_ITEM_MIN,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemInactive: {
    minWidth: FLOATING_TAB_ITEM_MIN,
    paddingHorizontal: spacing.sm,
  },
  itemActive: {
    minWidth: FLOATING_TAB_ITEM_ACTIVE_WIDTH,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.72)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  itemPressed: {
    opacity: 0.75,
  },
  iconWell: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
