import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadows, spacing } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  /** Glass panel, solid white, or all-gold gradient hero. */
  variant?: 'default' | 'glass' | 'hero';
}

export function Card({ children, style, padded = true, variant = 'glass' }: CardProps) {
  if (variant === 'hero') {
    return (
      <View style={[styles.card, styles.heroOuter, style]}>
        <LinearGradient
          colors={[colors.amberLight, colors.brand, colors.brandStrong]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.heroGradient, padded && styles.padded]}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        variant === 'glass' && styles.glass,
        variant === 'default' && styles.solid,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadows.md,
  },
  glass: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  solid: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  heroOuter: {
    ...shadows.glow,
  },
  heroGradient: {
    borderRadius: radius.card,
  },
  padded: { padding: spacing.lg },
});
