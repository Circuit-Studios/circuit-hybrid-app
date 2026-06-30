import 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { AppConfigProvider } from '@/config/AppConfigContext';
import { IdleActivityCapture } from '@/auth/IdleActivityCapture';
import { ScriptAnalysisSessionKeepAlive } from '@/auth/ScriptAnalysisSessionKeepAlive';
import { createQueryClient } from '@/lib/queryClient';
import { RealtimeProvider } from '@/realtime/RealtimeProvider';
import { colors } from '@/theme';
import { fontAssets } from '@/theme/fonts';

void SplashScreen.preventAutoHideAsync();

function SplashGate({ fontsReady, children }: { fontsReady: boolean; children: React.ReactNode }) {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'loading' || !fontsReady) return;
    void SplashScreen.hideAsync();
  }, [status, fontsReady]);

  // Hold the splash (keep tree mounted) until fonts resolve so text never
  // flashes in the system font before swapping to Plus Jakarta Sans.
  if (!fontsReady) return null;

  return children;
}

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fontsReady = fontsLoaded || fontError != null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppConfigProvider>
            <AuthProvider>
              <ScriptAnalysisSessionKeepAlive />
              <IdleActivityCapture>
                <RealtimeProvider>
                  <StatusBar style="dark" />
                  <SplashGate fontsReady={fontsReady}>
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
          </AppConfigProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
