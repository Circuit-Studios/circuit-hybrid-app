import { Tabs } from 'expo-router';
import { AppTabBar } from '@/components/AppTabBar';
import { ActiveProjectProvider } from '@/context/ActiveProjectContext';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <ActiveProjectProvider>
      <Tabs
        tabBar={() => <AppTabBar />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.bg },
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
        <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
        <Tabs.Screen name="team" options={{ title: 'Team' }} />
      </Tabs>
    </ActiveProjectProvider>
  );
}
