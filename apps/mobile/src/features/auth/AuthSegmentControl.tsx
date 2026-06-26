import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthMetrics } from '@/features/auth/AuthMetricsContext';
import { authPalette } from '@/theme/authPalette';
import { authTypography } from '@/theme/authTypography';
import { typography } from '@/theme';

export type AuthTab = 'signup' | 'signin';

interface AuthSegmentControlProps {
  value: AuthTab;
  onChange: (tab: AuthTab) => void;
  compact?: boolean;
}

/** Pill segment control for Sign up / Sign In — black active pill. */
export function AuthSegmentControl({ value, onChange, compact = false }: AuthSegmentControlProps) {
  const metrics = useAuthMetrics(compact ? 'signUp' : 'signIn');
  const isSignup = value === 'signup';

  return (
    <View
      style={[
        styles.track,
        {
          height: metrics.segmentHeight,
          borderRadius: metrics.segmentHeight / 2,
          marginTop: metrics.segmentMarginTop,
          marginBottom: metrics.segmentMarginBottom,
        },
      ]}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: isSignup }}
        onPress={() => onChange('signup')}
        style={({ pressed }) => [
          styles.segment,
          {
            height: metrics.segmentInnerHeight,
            borderRadius: metrics.segmentInnerHeight / 2,
          },
          isSignup && styles.segmentActive,
          pressed && styles.segmentPressed,
        ]}
      >
        <Text style={[styles.label, isSignup && styles.labelActive]}>Sign up</Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: !isSignup }}
        onPress={() => onChange('signin')}
        style={({ pressed }) => [
          styles.segment,
          {
            height: metrics.segmentInnerHeight,
            borderRadius: metrics.segmentInnerHeight / 2,
          },
          !isSignup && styles.segmentActive,
          pressed && styles.segmentPressed,
        ]}
      >
        <Text style={[styles.label, !isSignup && styles.labelActive]}>Sign In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: authPalette.tabTrack,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: authPalette.segmentActive,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  segmentPressed: {
    opacity: 0.92,
  },
  label: {
    ...typography.bodyStrong,
    fontSize: authTypography.segmentFontSize,
    color: authPalette.segmentInactiveText,
  },
  labelActive: {
    color: authPalette.segmentActiveText,
    fontWeight: '700',
  },
});
