// Bell icon with an unread count badge. Reused across multiple screens.

import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GlassIconButton } from '@/components/GlassIconButton';
import { getUnreadCount } from '@/api/notifications';
import { qk } from '@/api/queryKeys';
import { colors } from '@/theme';

interface Props {
  onPress?: () => void;
  tint?: string;
}

export function NotificationBell({ onPress, tint }: Props) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: qk.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
    staleTime: 10_000,
  });
  const count = data ?? 0;

  return (
    <GlassIconButton
      icon="notifications-outline"
      tint={tint}
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      onPress={onPress ?? (() => router.push('/notifications'))}
      badge={
        count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    color: colors.onBrand,
    fontSize: 10,
    fontWeight: '700',
  },
});
