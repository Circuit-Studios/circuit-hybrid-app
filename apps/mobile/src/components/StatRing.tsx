import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';

interface StatRingProps {
  value: string;
  label: string;
  progress?: number;
  size?: number;
}

export function StatRing({ value, label, progress = 72, size = 96 }: StatRingProps) {
  const thickness = 8;
  const cx = size / 2;
  const r = cx - thickness;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (circumference * clamped) / 100;

  return (
    <View style={[styles.wrap, { width: size, height: size + 28 }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" originX={cx} originY={cx}>
          <Circle
            cx={cx}
            cy={cx}
            r={r}
            stroke={colors.ringTrack}
            strokeWidth={thickness}
            fill="transparent"
          />
          <Circle
            cx={cx}
            cy={cx}
            r={r}
            stroke={colors.brand}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            fill="transparent"
          />
        </G>
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 22, fontWeight: '800', color: colors.brand },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
