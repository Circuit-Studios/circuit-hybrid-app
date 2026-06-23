import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import CircuitLogoSvg from '../../assets/circuit-logo.svg';

interface CircuitLogoProps {
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const DIAMETERS = {
  sm: 60,
  md: 78,
  lg: 96,
} as const;

/** Circular Circuit mark — always rendered from assets/circuit-logo.svg. */
export function CircuitLogo({ size = 'md', style }: CircuitLogoProps) {
  const diameter = DIAMETERS[size];

  return (
    <View style={[styles.shell, { width: diameter, height: diameter }, style]}>
      <CircuitLogoSvg width={diameter} height={diameter} accessibilityLabel="Circuit" />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#E8C547',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
});
