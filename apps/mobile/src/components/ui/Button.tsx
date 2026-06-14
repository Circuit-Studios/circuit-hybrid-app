import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadows, spacing, typography } from '@/theme';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  loading,
  disabled,
  variant = 'primary',
  style,
  fullWidth = true,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const label = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.onBrand : colors.brand}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelPrimary,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'ghost' && styles.labelGhost,
            variant === 'danger' && styles.labelDanger,
          ]}
        >
          {title}
        </Text>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
          style,
        ]}
        {...rest}
      >
        <LinearGradient
          colors={[colors.amberLight, colors.brand, colors.brandStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientFill, shadows.accent]}
        >
          {label}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientFill: {
    width: '100%',
    minHeight: 54,
    borderRadius: radius.pill,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, zIndex: 1 },
  secondary: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  danger: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  label: { ...typography.bodyStrong, letterSpacing: 0.2 },
  labelPrimary: { color: colors.onBrand },
  labelSecondary: { color: colors.textPrimary },
  labelGhost: { color: colors.brand },
  labelDanger: { color: colors.onBrand },
});
