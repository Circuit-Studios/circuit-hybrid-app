import { StyleSheet, Text, View } from 'react-native';
import { CircuitLogo } from '@/components/CircuitLogo';
import { useAuthMetrics } from '@/features/auth/AuthMetricsContext';
import { authPalette } from '@/theme/authPalette';
import { fontFamily } from '@/theme/fonts';

interface AuthHeaderProps {
  /** Landscape two-column: brand block aligned left in column. */
  column?: boolean;
}

/**
 * Auth brand header — original Circuit logo asset + original wordmark styling.
 */
export function AuthHeader({ column = false }: AuthHeaderProps) {
  const metrics = useAuthMetrics();

  return (
    <View
      style={[
        styles.wrap,
        column && styles.wrapColumn,
        {
          marginTop: metrics.headerTopMargin,
          marginBottom: metrics.headerBottomMargin,
        },
      ]}
    >
      <CircuitLogo ringSize={metrics.logoRingSize} />
      <Text
        style={[
          styles.wordmark,
          {
            marginTop: metrics.headerBottomMargin * 0.6,
            fontSize: metrics.wordmarkFontSize,
          },
        ]}
      >
        CIRCU<Text style={styles.wordmarkAccent}>IT</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: '100%',
  },
  wrapColumn: {
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  wordmark: {
    fontFamily: fontFamily.extrabold,
    letterSpacing: 1,
    color: authPalette.ink,
  },
  wordmarkAccent: {
    color: authPalette.brand,
  },
});
