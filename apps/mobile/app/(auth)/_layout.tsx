import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { OtpSessionProvider } from '@/auth/OtpSessionContext';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

export default function AuthLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (status === 'signedIn') {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  return (
    <OtpSessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      />
    </OtpSessionProvider>
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
