import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthMetrics } from '@/features/auth/AuthMetricsContext';
import { authPalette } from '@/theme/authPalette';

interface AuthPrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  mode?: 'signIn' | 'signUp';
}

/** Champagne gold gradient CTA for auth screens. */
export function AuthPrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  height,
  mode = 'signIn',
}: AuthPrimaryButtonProps) {
  const metrics = useAuthMetrics(mode);
  const buttonHeight = height ?? metrics.ctaHeight;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { height: buttonHeight, borderRadius: metrics.ctaRadius },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={
          isDisabled
            ? [authPalette.ctaBgDisabled, authPalette.ctaBgDisabled, authPalette.ctaBgDisabled]
            : [authPalette.ctaGradientStart, authPalette.ctaGradientMid, authPalette.ctaGradientEnd]
        }
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.gradient, { height: buttonHeight, borderRadius: metrics.ctaRadius }]}
      >
        <Text
          style={[
            styles.label,
            { fontSize: metrics.ctaFontSize },
            isDisabled && styles.labelDisabled,
          ]}
        >
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: authPalette.ctaShadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontWeight: '800',
    color: authPalette.ctaText,
    letterSpacing: 0.2,
  },
  labelDisabled: {
    color: authPalette.ctaTextDisabled,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
