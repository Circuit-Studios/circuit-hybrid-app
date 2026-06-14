import 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { IdleActivityCapture } from '@/auth/IdleActivityCapture';
import { createQueryClient } from '@/lib/queryClient';
import { RealtimeProvider } from '@/realtime/RealtimeProvider';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

function SplashGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'loading') return;
    void SplashScreen.hideAsync();
  }, [status]);

  return children;
}

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <IdleActivityCapture>
              <RealtimeProvider>
                <StatusBar style="dark" />
                <SplashGate>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.bg },
                      animation: 'slide_from_right',
                    }}
                  />
                </SplashGate>
              </RealtimeProvider>
            </IdleActivityCapture>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
