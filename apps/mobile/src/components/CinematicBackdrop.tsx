import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';

/** Soft warm backdrop — light gray base with subtle orange radial glows. */
export function CinematicBackdrop() {
  const { width, height } = useWindowDimensions();
  const h = Math.max(height, 800);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="warmSpill" cx="85%" cy="0%" rx="65%" ry="40%">
            <Stop offset="0%" stopColor={colors.brand} stopOpacity="0.14" />
            <Stop offset="55%" stopColor={colors.amber} stopOpacity="0.05" />
            <Stop offset="100%" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="softGlow" cx="15%" cy="30%" rx="50%" ry="45%">
            <Stop offset="0%" stopColor={colors.amberLight} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="centerLift" cx="50%" cy="45%" rx="40%" ry="35%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <Stop offset="100%" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={h} fill={colors.bg} />
        <Rect width={width} height={h} fill="url(#softGlow)" />
        <Rect width={width} height={h} fill="url(#warmSpill)" />
        <Rect width={width} height={h} fill="url(#centerLift)" />
      </Svg>
    </View>
  );
}
