import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GlassIconButton } from '@/components/GlassIconButton';
import { NotificationBell } from '@/components/NotificationBell';
import { AccountButton } from '@/components/AccountButton';
import { spacing } from '@/theme';

/** Activity + bell + account avatar — standard signed-in header trailing actions. */
export function AppHeaderActions() {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <GlassIconButton
        icon="pulse-outline"
        accessibilityLabel="Activity"
        onPress={() => router.push('/(app)/(tabs)/activity')}
      />
      <NotificationBell />
      <AccountButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
