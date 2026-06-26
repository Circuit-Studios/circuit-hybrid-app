import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GlassSurface } from '@/components/GlassSurface';
import { useAuth } from '@/auth/AuthContext';
import { colors, typography } from '@/theme';
import { formatUserInitials } from '@/lib/format';

export function AccountButton() {
  const router = useRouter();
  const { user } = useAuth();
  const label = user ? formatUserInitials(user) : '?';

  return (
    <Pressable
      onPress={() => router.push('/(app)/account')}
      accessibilityRole="button"
      accessibilityLabel="Account and settings"
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <GlassSurface variant="circle" style={styles.glass}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{label}</Text>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  glass: {
    width: 42,
    height: 42,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.caption,
    color: colors.brand,
    fontWeight: '700',
  },
});
