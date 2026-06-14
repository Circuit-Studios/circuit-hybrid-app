import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, typography } from '@/theme';

export interface HealthRingSegment {
  id: string;
  label: string;
  value: number; // 0..100
  color: string;
}

interface HealthRingProps {
  size?: number;
  thickness?: number;
  segments: HealthRingSegment[];
  /** Big number shown in the middle of the ring. Defaults to weighted avg. */
  centerLabel?: string;
  centerSub?: string;
}

export function HealthRing({
  size = 220,
  thickness = 12,
  segments,
  centerLabel,
  centerSub,
}: HealthRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radii = segments.map((_, idx) => cx - thickness * (idx + 0.5) - 2);
  const avg = segments.length
    ? Math.round(segments.reduce((sum, s) => sum + s.value, 0) / segments.length)
    : 0;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {segments.map((seg, idx) => {
          const r = radii[idx] ?? cx - thickness;
          const circumference = 2 * Math.PI * r;
          const clamped = Math.max(0, Math.min(100, seg.value));
          const stroke = circumference - (circumference * clamped) / 100;
          return (
            <G key={seg.id} rotation="-90" originX={cx} originY={cy}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={colors.ringTrack}
                strokeWidth={thickness}
                fill="transparent"
              />
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={seg.color}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={stroke}
                fill="transparent"
              />
            </G>
          );
        })}
      </Svg>
      <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
        <Text style={styles.bigNumber}>{centerLabel ?? `${avg}%`}</Text>
        {centerSub ? <Text style={styles.sub}>{centerSub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigNumber: { ...typography.display, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
});
