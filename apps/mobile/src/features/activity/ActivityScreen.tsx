import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AccountButton } from '@/components/AccountButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/Card';
import { useActiveProject } from '@/context/ActiveProjectContext';
import { readApiError } from '@/api/client';
import type { ActivityFilter } from '@/api/home';
import { colors, radius, spacing, typography } from '@/theme';
import { useActivityQuery } from '@/features/home/hooks';

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'team', label: 'Team' },
];

function renderAction(action: string) {
  const parts = action.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={styles.actionText}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text key={i} style={styles.actionBold}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const same =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
  return same ? `TODAY · ${label}` : label;
}

export default function ActivityScreen() {
  const { projectId } = useActiveProject();
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const { data, isLoading, error, refetch } = useActivityQuery(projectId, filter);

  const sections = useMemo(() => {
    if (!data?.items.length) return [];
    const map = new Map<string, typeof data.items>();
    for (const item of data.items) {
      const key = groupLabel(item.createdAt);
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [data?.items]);

  return (
    <ScreenContainer topAligned edges={['top', 'left', 'right']} contentStyle={styles.pad}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <AccountButton />
      </View>

      <View style={styles.filters}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!projectId ? (
        <EmptyState title="No project yet" body="Join or create a project to see activity." />
      ) : isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          title="Couldn't load activity"
          body={readApiError(error)}
          action={<Button title="Retry" onPress={() => refetch()} />}
        />
      ) : (
        <View style={styles.flex}>
          {data ? (
            <Card style={styles.pulse}>
              <View style={styles.pulseHead}>
                <Ionicons name="sunny-outline" size={16} color={colors.brand} />
                <Text style={styles.pulseTitle}>Today's pulse</Text>
              </View>
              <View style={styles.pulseRow}>
                <PulseStat value={data.pulse.actions} label="Actions" />
                <PulseStat value={data.pulse.tasks} label="Tasks" />
                <PulseStat value={data.pulse.active} label="Active" />
              </View>
            </Card>
          ) : null}

          <FlatList
            data={sections}
            keyExtractor={([label]) => label}
            style={styles.flex}
            contentContainerStyle={styles.list}
            renderItem={({ item: [label, items] }) => (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{label}</Text>
                {items.map(row => (
                  <Card key={row.id} style={styles.feedCard}>
                    <View style={styles.feedHead}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{row.userInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.name}>{row.userName}</Text>
                          <Text style={styles.time}>{row.relativeTime}</Text>
                        </View>
                        {renderAction(row.action)}
                      </View>
                    </View>
                    {row.statusBadge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{row.statusBadge}</Text>
                      </View>
                    ) : null}
                  </Card>
                ))}
              </View>
            )}
            ListEmptyComponent={
              <EmptyState title="No activity yet" body="Updates from your team will show up here." />
            }
          />
        </View>
      )}
    </ScreenContainer>
  );
}

function PulseStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.pulseStat}>
      <Text style={styles.pulseValue}>{value}</Text>
      <Text style={styles.pulseLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingBottom: 120 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: colors.textPrimary },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipActive: { backgroundColor: colors.brand },
  chipText: { ...typography.bodyStrong, color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary },
  pulse: { marginBottom: spacing.lg },
  pulseHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  pulseTitle: { ...typography.bodyStrong, color: colors.brand },
  pulseRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pulseStat: { alignItems: 'center' },
  pulseValue: { fontSize: 28, fontWeight: '800', color: colors.brand },
  pulseLabel: { ...typography.caption, color: colors.textSecondary },
  list: { paddingBottom: spacing.xl },
  section: { marginBottom: spacing.lg },
  sectionLabel: { ...typography.micro, color: colors.textMuted, marginBottom: spacing.sm },
  feedCard: { marginBottom: spacing.sm, gap: spacing.sm },
  feedHead: { flexDirection: 'row', gap: spacing.md },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.caption, fontWeight: '700', color: colors.brand },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  time: { ...typography.caption, color: colors.textMuted },
  actionText: { ...typography.body, color: colors.textSecondary },
  actionBold: { fontWeight: '700', color: colors.textPrimary },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.caption, color: colors.brand, fontWeight: '600' },
});
