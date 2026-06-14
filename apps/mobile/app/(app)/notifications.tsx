// Notifications inbox.
//
// Lives at `/notifications` so push-tap deep links + the bell icon both
// land here. Supports:
//   - Infinite scroll via cursor pagination
//   - "Unread only" toggle
//   - Tap to mark-read + deep link
//   - "Mark all read" action

import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AccountButton } from '@/components/AccountButton';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/notifications';
import { qk } from '@/api/queryKeys';
import { colors, radius, spacing, typography } from '@/theme';
import { relativeTimeFrom } from '@/lib/format';
import type { NotificationKind, NotificationRecord } from '@/api/types';

const KIND_META: Record<
  NotificationKind,
  { label: string; icon: keyof typeof Ionicons.glyphMap; tint: string }
> = {
  CONFLICT_ALERT: { label: 'Conflict', icon: 'warning', tint: colors.danger },
  TASK_ASSIGNED: { label: 'Task', icon: 'list', tint: colors.info },
  TASK_DUE_SOON: { label: 'Due soon', icon: 'time', tint: colors.warning },
  SHOOT_DAY_UPDATED: { label: 'Schedule', icon: 'calendar', tint: colors.accent },
  SHOOT_DAY_CALL: { label: 'Call time', icon: 'megaphone', tint: colors.accent },
  PROJECT_INVITE: { label: 'Invite', icon: 'person-add', tint: colors.success },
  AI_ANALYSIS_DONE: { label: 'AI ready', icon: 'sparkles', tint: colors.accent },
  GENERIC: { label: 'Update', icon: 'notifications', tint: colors.textSecondary },
};

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const infinite = useInfiniteQuery({
    queryKey: qk.notificationsList(unreadOnly),
    queryFn: ({ pageParam }) =>
      listNotifications({
        cursor: pageParam as string | undefined,
        unreadOnly,
        limit: 30,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notifications() });
      void qc.invalidateQueries({ queryKey: qk.unreadCount() });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notifications() });
      void qc.invalidateQueries({ queryKey: qk.unreadCount() });
    },
  });

  const items: NotificationRecord[] =
    infinite.data?.pages.flatMap(p => p.items) ?? [];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <AccountButton />
      </View>

      <View style={styles.filterRow}>
        <FilterPill label="All" active={!unreadOnly} onPress={() => setUnreadOnly(false)} />
        <FilterPill label="Unread" active={unreadOnly} onPress={() => setUnreadOnly(true)} />
        <Pressable
          onPress={() => markAll.mutate()}
          disabled={markAll.isPending || items.length === 0}
          hitSlop={8}
          style={styles.markAllWrap}
        >
          <Text
            style={[
              styles.markAll,
              (markAll.isPending || items.length === 0) && styles.markAllDisabled,
            ]}
          >
            Mark all read
          </Text>
        </Pressable>
      </View>

      {infinite.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          title={unreadOnly ? 'No unread alerts' : 'Inbox is empty'}
          body="When teammates clash onto your shoot day, hand you a task, or finish a script breakdown, you'll see it here."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          renderItem={({ item }) => (
            <NotificationRow
              n={item}
              onPress={() => {
                if (!item.readAt) markRead.mutate(item.id);
                if (item.deepLink) router.push(item.deepLink as never);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (infinite.hasNextPage && !infinite.isFetchingNextPage) {
              void infinite.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            infinite.isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.accent}
                style={{ marginVertical: spacing.lg }}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={infinite.isRefetching && !infinite.isFetchingNextPage}
              onRefresh={() => infinite.refetch()}
              tintColor={colors.accent}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      accessibilityRole="button"
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NotificationRow({
  n,
  onPress,
}: {
  n: NotificationRecord;
  onPress: () => void;
}) {
  const meta = KIND_META[n.kind] ?? KIND_META.GENERIC;
  const unread = !n.readAt;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={unread ? [styles.row, styles.rowUnread] : [styles.row]}>
        <View style={[styles.iconWrap, { backgroundColor: meta.tint + '22' }]}>
          <Ionicons name={meta.icon} size={18} color={meta.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowHead}>
            <Text style={styles.kind}>{meta.label.toUpperCase()}</Text>
            <Text style={styles.time}>{relativeTimeFrom(n.createdAt)}</Text>
          </View>
          <Text style={styles.rowTitle}>{n.title}</Text>
          {n.body ? (
            <Text style={styles.rowBody} numberOfLines={2}>
              {n.body}
            </Text>
          ) : null}
        </View>
        {unread ? <View style={styles.unreadDot} /> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: colors.textPrimary },
  markAll: { ...typography.bodyStrong, color: colors.accent },
  markAllDisabled: { color: colors.textMuted },
  markAllWrap: { marginLeft: 'auto', justifyContent: 'center' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { ...typography.bodyStrong, color: colors.textSecondary },
  pillTextActive: { color: colors.accentInk },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  list: { paddingBottom: spacing.xxxl },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rowUnread: { borderColor: colors.accentMuted },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  kind: { ...typography.micro, color: colors.textMuted },
  time: { ...typography.micro, color: colors.textMuted },
  rowTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: 2 },
  rowBody: { ...typography.caption, color: colors.textSecondary },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
});
