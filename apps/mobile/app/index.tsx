import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

/** Entry route — immediately forwards to the correct group once auth is ready. */
export default function Index() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'loading') return;
    router.replace(status === 'signedIn' ? '/(app)/(tabs)/home' : '/(auth)/splash');
  }, [router, status]);

  return (
    <View style={styles.boot}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
