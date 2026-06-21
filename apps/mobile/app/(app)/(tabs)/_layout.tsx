import { Tabs } from 'expo-router';
import { AppTabBar, type AppTabBarProps } from '@/components/AppTabBar';
import { ActiveProjectProvider } from '@/context/ActiveProjectContext';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <ActiveProjectProvider>
      <Tabs
        tabBar={props => <AppTabBar {...(props as AppTabBarProps)} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.bg },
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
