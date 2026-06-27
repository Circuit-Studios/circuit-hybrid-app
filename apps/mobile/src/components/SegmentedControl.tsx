import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Optional count rendered as a pill after the label. */
  badge?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

/**
 * App-wide segmented control (iOS-style white active pill on a muted track).
 * Shared by Tasks and Schedule so view/status switching feels identical.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
            {opt.badge != null && opt.badge > 0 ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                  {opt.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  pressed: { opacity: 0.85 },
  label: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textSecondary,
  },
  labelActive: { color: colors.textPrimary },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: colors.brandSoft },
  badgeText: { ...typography.micro, letterSpacing: 0, color: colors.textSecondary },
  badgeTextActive: { color: colors.brandStrong },
});
