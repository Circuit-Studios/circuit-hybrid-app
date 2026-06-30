import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '@/theme';

interface HealthRingProps {
  size?: number;
  thickness?: number;
  /** Overall progress 0..100 shown by the gold arc. */
  value: number;
  /** Big number shown in the middle of the ring. Defaults to `${value}%`. */
  centerLabel?: string;
  centerSub?: string;
  trackColor?: string;
}

/** Single bold progress ring with a gold gradient arc. */
export function HealthRing({
  size = 104,
  thickness = 10,
  value,
  centerLabel,
  centerSub,
  trackColor = colors.ringTrack,
}: HealthRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - thickness / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dashoffset = circumference - (circumference * clamped) / 100;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="healthRingGold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.amberLight} />
            <Stop offset="0.5" stopColor={colors.brand} />
            <Stop offset="1" stopColor={colors.brandStrong} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={trackColor}
          strokeWidth={thickness}
          fill="transparent"
        />
        <G rotation="-90" originX={cx} originY={cy}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke="url(#healthRingGold)"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={dashoffset}
            fill="transparent"
          />
        </G>
      </Svg>
      <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
        <Text style={styles.bigNumber}>{centerLabel ?? `${Math.round(clamped)}%`}</Text>
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
  bigNumber: { ...typography.title, color: colors.textPrimary, fontSize: 22, lineHeight: 26 },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2, fontSize: 11 },
});
