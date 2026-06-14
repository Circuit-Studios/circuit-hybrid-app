import { StyleSheet, View, type ViewStyle } from 'react-native';
import CircuitLogoSvg from '../../assets/circuit-logo.svg';
import { shadows } from '@/theme';

interface CircuitLogoProps {
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

/** Render sizes — SVG viewBox is 104×104. */
const SIZES = {
  sm: 52,
  md: 80,
  lg: 104,
} as const;

/** Welcome / in-app branding — always sourced from assets/circuit-logo.svg. */
export function CircuitLogo({ size = 'md', style }: CircuitLogoProps) {
  const side = SIZES[size];

  return (
    <View style={[styles.wrap, { width: side, height: side }, shadows.glow, style]}>
      <CircuitLogoSvg width={side} height={side} accessibilityLabel="Circuit" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
