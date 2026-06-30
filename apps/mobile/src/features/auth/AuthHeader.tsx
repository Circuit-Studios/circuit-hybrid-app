import { StyleSheet, Text, View } from 'react-native';
import { CircuitLogo } from '@/components/CircuitLogo';
import { useAuthMetrics } from '@/features/auth/AuthMetricsContext';
import { authPalette } from '@/theme/authPalette';

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
      {!metrics.hideSubtitle ? (
        <Text
          style={[
            styles.tagline,
            {
              fontSize: metrics.subtitleFontSize,
              letterSpacing: metrics.subtitleLetterSpacing,
            },
          ]}
        >
          FOR FILMMAKERS
        </Text>
      ) : null}
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
    fontWeight: '800',
    letterSpacing: 1,
    color: authPalette.ink,
  },
  wordmarkAccent: {
    color: authPalette.brand,
  },
  tagline: {
    color: authPalette.muted,
    marginTop: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
