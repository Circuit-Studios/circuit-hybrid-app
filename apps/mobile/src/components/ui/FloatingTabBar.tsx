import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/GlassSurface';
import {
  FLOATING_TAB_BAR_ACTIVE_PILL_HEIGHT,
  FLOATING_TAB_BAR_ACTIVE_PILL_WIDTH,
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MAX_WIDTH,
  FLOATING_TAB_BAR_WIDTH_RATIO,
  FLOATING_TAB_ITEM_MIN,
} from '@/components/ui/floatingTabBarMetrics';
import { radius, spacing, tabBar, typography } from '@/theme';

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
    barWidthProp ??
    Math.min(FLOATING_TAB_BAR_MAX_WIDTH, screenWidth * FLOATING_TAB_BAR_WIDTH_RATIO);

  return (
    <View pointerEvents="box-none" style={[styles.shell, { paddingBottom: bottomPad }, style]}>
      <GlassSurface
        variant="tabBar"
        borderRadius={radius.pill}
        intensity={tabBar.blurIntensity}
        style={{ width: barWidth, height: FLOATING_TAB_BAR_HEIGHT, alignSelf: 'center' }}
      >
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
                  styles.slot,
                  active ? styles.slotActive : styles.slotInactive,
                  pressed && !active && styles.slotPressed,
                ]}
              >
                {active ? <View style={styles.activePill} /> : null}
                <View
                  style={[
                    styles.iconWell,
                    active ? styles.iconWellActive : styles.iconWellInactive,
                  ]}
                >
                  {icon}
                </View>
                {showLabels && item.label ? (
                  <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                    {item.label}
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

/** Near-black / muted icon colors for the dock. */
export function floatingTabIconColor(active: boolean): string {
  return active ? tabBar.iconActive : tabBar.iconInactive;
}

/** Filled glyphs read larger — nudge active size down for optical balance. */
export function floatingTabIconSize(active: boolean): number {
  return active ? tabBar.iconSizeActive : tabBar.iconSizeInactive;
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: FLOATING_TAB_BAR_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActive: {
    height: FLOATING_TAB_BAR_ACTIVE_PILL_HEIGHT,
    minWidth: FLOATING_TAB_BAR_ACTIVE_PILL_WIDTH,
  },
  slotInactive: {
    minWidth: FLOATING_TAB_ITEM_MIN,
    minHeight: FLOATING_TAB_ITEM_MIN,
  },
  activePill: {
    position: 'absolute',
    width: FLOATING_TAB_BAR_ACTIVE_PILL_WIDTH,
    height: FLOATING_TAB_BAR_ACTIVE_PILL_HEIGHT,
    borderRadius: FLOATING_TAB_BAR_ACTIVE_PILL_HEIGHT / 2,
    backgroundColor: tabBar.activePillFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tabBar.activePillBorder,
  },
  slotPressed: {
    opacity: tabBar.slotPressedOpacity,
  },
  iconWell: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWellActive: {
    width: FLOATING_TAB_BAR_ACTIVE_PILL_WIDTH,
    height: FLOATING_TAB_BAR_ACTIVE_PILL_HEIGHT,
  },
  iconWellInactive: {
    width: FLOATING_TAB_ITEM_MIN,
    height: FLOATING_TAB_ITEM_MIN,
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    color: tabBar.labelInactive,
    marginTop: 2,
    zIndex: 1,
  },
  labelActive: {
    color: tabBar.labelActive,
    fontWeight: '700',
  },
});
