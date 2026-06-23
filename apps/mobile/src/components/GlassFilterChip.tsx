import { Pressable, StyleSheet, Text } from 'react-native';
import { GlassLens } from '@/components/GlassSurface';
import { colors, radius, spacing, typography } from '@/theme';

interface GlassFilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

/** Segmented filter chip with liquid-glass active lens. */
export function GlassFilterChip({ label, active, onPress }: GlassFilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      {active ? <GlassLens style={StyleSheet.absoluteFill} /> : null}
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    position: 'relative',
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  text: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    zIndex: 1,
  },
  textActive: {
    color: colors.brand,
  },
});
