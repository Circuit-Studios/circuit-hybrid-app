import { StyleSheet, View } from 'react-native';
import { NotificationBell } from '@/components/NotificationBell';
import { AccountButton } from '@/components/AccountButton';
import { spacing } from '@/theme';

/** Bell + account avatar — standard signed-in header trailing actions. */
export function AppHeaderActions() {
  return (
    <View style={styles.row}>
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
