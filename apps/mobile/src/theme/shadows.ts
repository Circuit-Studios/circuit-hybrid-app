import { Platform, type ViewStyle } from 'react-native';
import { colors } from './tokens';

/**
 * Cross-platform elevation presets for the light glass theme. Tuned for a
 * premium "soft floating glass" feel: larger radii, lower opacity, gentle lift.
 */
export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#1A140A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#1A140A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.07,
      shadowRadius: 28,
    },
    android: { elevation: 4 },
    default: {},
  }),
  accent: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.brand,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.26,
      shadowRadius: 18,
    },
    android: { elevation: 6 },
    default: {},
  }),
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.amber,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.34,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;
