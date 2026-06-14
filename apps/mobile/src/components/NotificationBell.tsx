// Bell icon with an unread count badge. Reused across multiple screens.

import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUnreadCount } from '@/api/notifications';
import { qk } from '@/api/queryKeys';
import { colors, spacing } from '@/theme';

interface Props {
  // If you want a custom navigation target (default goes to inbox).
  onPress?: () => void;
  // Light variant for screens with darker backgrounds.
  tint?: string;
}

export function NotificationBell({ onPress, tint }: Props) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: qk.unreadCount(),
    queryFn: getUnreadCount,
    // Polling fallback when the socket is offline.
    refetchInterval: 60_000,
    staleTime: 10_000,
  });
  const count = data ?? 0;

  return (
    <Pressable
      onPress={onPress ?? (() => router.push('/notifications'))}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `Notifications, ${count} unread` : 'Notifications'
      }
      hitSlop={10}
    >
      <Ionicons name="notifications-outline" size={22} color={tint ?? colors.textPrimary} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.onBrand,
    fontSize: 10,
    fontWeight: '700',
  },
});
