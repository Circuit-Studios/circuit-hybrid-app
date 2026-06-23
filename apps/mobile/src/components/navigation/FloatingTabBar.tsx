import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassLens, GlassSurface } from '@/components/GlassSurface';
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MAX_WIDTH,
  FLOATING_TAB_ITEM_SIZE,
} from '@/components/navigation/floatingTabBarMetrics';
import { colors, radius, spacing, typography } from '@/theme';

export type FloatingTabItem = {
  key: string;
  icon: ReactNode;
  activeIcon?: ReactNode;
  href?: string;
  onPress?: () => void;
  accessibilityLabel: string;
  /** Shown when `showLabels` is true. */
  label?: string;
};

export type FloatingTabBarProps = {
  items: FloatingTabItem[];
  activeKey: string;
  bottomOffset?: number;
  showLabels?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Horizontal inset from screen edges (e.g. safe area on notched devices). */
  horizontalInset?: number;
  maxWidth?: number;
};

/**
 * Instagram-style floating glass capsule tab bar.
 * Absolutely positioned — pair with `useChromeInsets().appTabBarReserve` on screen content.
 */
export function FloatingTabBar({
  items,
  activeKey,
  bottomOffset,
  showLabels = false,
  style,
  horizontalInset = spacing.lg,
  maxWidth = FLOATING_TAB_BAR_MAX_WIDTH,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = bottomOffset ?? Math.max(insets.bottom, spacing.sm);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.shell,
        {
          paddingBottom: bottomPad,
          paddingHorizontal: horizontalInset,
        },
        style,
      ]}
    >
      <GlassSurface
        variant="tabBar"
        borderRadius={radius.pill}
        style={[styles.capsule, maxWidth != null && { maxWidth, alignSelf: 'center' }]}
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
                  styles.item,
                  pressed && !active && styles.itemPressed,
                ]}
              >
                {active ? <GlassLens style={styles.activeLens} /> : null}
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
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  capsule: {
    width: '100%',
    minHeight: FLOATING_TAB_BAR_HEIGHT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  item: {
    minWidth: FLOATING_TAB_ITEM_SIZE,
    minHeight: FLOATING_TAB_ITEM_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  activeLens: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
  },
  itemPressed: {
    opacity: 0.72,
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
