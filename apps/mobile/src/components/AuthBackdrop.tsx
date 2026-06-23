import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { authPalette } from '@/theme/authPalette';

/** Warm cream backdrop with subtle gold radial glows — auth screens. */
export function AuthBackdrop() {
  const { width, height } = useWindowDimensions();
  const h = Math.max(height, 800);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="authWarm" cx="88%" cy="8%" rx="55%" ry="38%">
            <Stop offset="0%" stopColor={authPalette.brand} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={authPalette.bg} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="authSoft" cx="12%" cy="72%" rx="48%" ry="42%">
            <Stop offset="0%" stopColor={authPalette.brand} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={authPalette.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={h} fill={authPalette.bg} />
        <Rect width={width} height={h} fill="url(#authSoft)" />
        <Rect width={width} height={h} fill="url(#authWarm)" />
      </Svg>
    </View>
  );
}
