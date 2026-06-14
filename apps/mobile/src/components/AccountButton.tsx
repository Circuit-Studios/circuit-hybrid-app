import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { colors, radius, typography } from '@/theme';

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
      <View style={styles.avatar}>
        <Text style={styles.initials}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 2,
  },
  pressed: { opacity: 0.7 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.caption,
    color: colors.brand,
    fontWeight: '700',
  },
});
