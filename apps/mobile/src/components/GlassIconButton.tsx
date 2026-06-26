import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from '@/components/GlassSurface';
import { colors, spacing } from '@/theme';

interface GlassIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  badge?: React.ReactNode;
}

/** Circular frosted-glass header/menu control. */
export function GlassIconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 22,
  tint,
  style,
  badge,
}: GlassIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed, style]}
    >
      <GlassSurface variant="circle" style={styles.glass}>
        <View style={styles.inner}>
          <Ionicons name={icon} size={size} color={tint ?? colors.textPrimary} />
        </View>
      </GlassSurface>
      {badge}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 42,
    height: 42,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  glass: {
    width: 42,
    height: 42,
  },
  inner: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
