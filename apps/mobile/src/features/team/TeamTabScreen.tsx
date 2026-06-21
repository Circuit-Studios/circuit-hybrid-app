import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AccountButton } from '@/components/AccountButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/Card';
import { useActiveProject } from '@/context/ActiveProjectContext';
import { useAuth } from '@/auth/AuthContext';
import { useTeamMembersQuery } from '@/features/team/hooks';
import { readApiError } from '@/api/client';
import type { ProjectMember, SetStatus } from '@/api/types';
import { formatRole, formatUserInitials, formatUserName } from '@/lib/format';
import { colors, radius, spacing, typography } from '@/theme';

const STATUS_META: Record<
  SetStatus,
  { label: string; color: string; dot: string }
> = {
  ON_SET: { label: 'On set', color: colors.brand, dot: colors.brand },
  EN_ROUTE: { label: 'En route', color: '#E0A24A', dot: '#E0A24A' },
  DONE: { label: 'Done', color: '#C9A227', dot: '#C9A227' },
  OFF: { label: 'Off', color: colors.textMuted, dot: colors.textMuted },
};

export default function TeamTabScreen() {
  const { user } = useAuth();
  const { projectId } = useActiveProject();
  const { data, isLoading, error, refetch } = useTeamMembersQuery(projectId ?? undefined);

  const members = (data ?? []).filter(m => m.status === 'ACTIVE');

  return (
    <ScreenContainer scroll edges={['top', 'left', 'right']} contentStyle={styles.pad}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Team status</Text>
          <Text style={styles.legendTitle}>Railway · On set today</Text>
        </View>
        <AccountButton />
      </View>

      <View style={styles.legend}>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: meta.dot }]} />
            <Text style={styles.legendText}>{meta.label}</Text>
          </View>
        ))}
      </View>

      {!projectId ? (
        <EmptyState title="No project yet" body="Join a project to see your crew." />
      ) : isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          title="Couldn't load team"
          body={readApiError(error)}
          action={<Button title="Retry" onPress={() => refetch()} />}
        />
      ) : (
        members.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            isYou={member.userId === user?.id}
          />
        ))
      )}
    </ScreenContainer>
  );
}

function MemberCard({ member, isYou }: { member: ProjectMember; isYou: boolean }) {
  const status = member.setStatus ?? 'OFF';
  const meta = STATUS_META[status];
  const person = member.user;
  const name = person
    ? formatUserName(person)
    : member.inviteeName ?? 'Invited member';
  const initials = person
    ? formatUserInitials(person)
    : (member.inviteeName?.slice(0, 2).toUpperCase() ?? '??');
  const note = member.setStatusNote ?? `${formatRole(member.role)} on set`;

  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.personRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{name}</Text>
              {isYou ? <Text style={styles.youTag}>You</Text> : null}
            </View>
            <Text style={styles.role}>{formatRole(member.role)}</Text>
          </View>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.dot, { backgroundColor: meta.dot }]} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      <View style={styles.taskBar}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        <Text style={styles.taskText}>{note}</Text>
        <View
          style={[
            styles.taskIcon,
            status === 'DONE' ? styles.taskIconDone : styles.taskIconPending,
          ]}
        >
          <Ionicons
            name={status === 'DONE' ? 'checkmark' : 'time-outline'}
            size={12}
            color={status === 'DONE' ? colors.onBrand : colors.textMuted}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  pad: { paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  eyebrow: { ...typography.micro, color: colors.textMuted },
  legendTitle: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  legendText: { ...typography.caption, color: colors.textSecondary },
  card: { marginBottom: spacing.md, gap: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  personRow: { flexDirection: 'row', gap: spacing.md, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.bodyStrong, color: colors.brand },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.heading, color: colors.textPrimary },
  youTag: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  role: { ...typography.caption, color: colors.textSecondary },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  statusText: { ...typography.caption, fontWeight: '600' },
  taskBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  taskText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  taskIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconDone: { backgroundColor: colors.brand },
  taskIconPending: { backgroundColor: colors.surface },
});
