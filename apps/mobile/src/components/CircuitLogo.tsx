import { Image, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { authPalette } from '@/theme/authPalette';

const LOGO_SOURCE = require('../../assets/circuit-logo.png');

interface CircuitLogoProps {
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const DIAMETERS = {
  sm: 60,
  md: 78,
  lg: 96,
} as const;

/** Circular Circuit mark — assets/circuit-logo.png (classical bust). */
export function CircuitLogo({ size = 'md', style }: CircuitLogoProps) {
  const diameter = DIAMETERS[size];

  return (
    <View
      style={[
        styles.shell,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
        },
        style,
      ]}
    >
      <Image
        source={LOGO_SOURCE}
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
        }}
        resizeMode="cover"
        accessibilityLabel="Circuit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: authPalette.brand,
    ...Platform.select({
      ios: {
        shadowColor: authPalette.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
});
