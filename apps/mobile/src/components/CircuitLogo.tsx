import { Image, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { authPalette } from '@/theme/authPalette';

const LOGO_SOURCE = require('../../assets/circuit-logo.png');

type LogoSize = 'sm' | 'md' | 'lg' | 'auth';

interface CircuitLogoProps {
  size?: LogoSize;
  /** Outer diameter — overrides `size` when set (responsive auth layouts). */
  ringSize?: number;
  style?: ViewStyle;
}

const DIAMETERS: Record<LogoSize, number> = {
  sm: 60,
  md: 78,
  lg: 96,
  auth: 82,
};

/**
 * Circular Circuit emblem — original raster mark at
 * apps/mobile/assets/circuit-logo.png (classical bust, no overlays).
 * Image fills the ring exactly as in the source asset.
 */
export function CircuitLogo({ size = 'md', ringSize, style }: CircuitLogoProps) {
  const diameter = ringSize ?? DIAMETERS[size];

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
    borderColor: authPalette.logoBorder,
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
