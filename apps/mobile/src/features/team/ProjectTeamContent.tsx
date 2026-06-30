import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { ProjectHeaderAction, projectScreenStyles } from '@/components/project/ProjectScreenScaffold';
import { InviteMemberSheet } from '@/features/team/InviteMemberSheet';
import { canRemoveMember, memberRemoveLabel } from '@/features/team/memberActions';
import { listMembers, removeMember } from '@/api/members';
import { qk } from '@/api/queryKeys';
import { readApiError } from '@/api/client';
import { useProjectRoom } from '@/realtime/useProjectRoom';
import { colors, spacing, typography } from '@/theme';
import { formatRole, formatUserName } from '@/lib/format';
import type { ProjectMember } from '@/api/types';

export interface ProjectTeamContentProps {
  projectId: string;
}

/** Crew roster for the active project (members + pending invites). */
export function ProjectTeamContent({ projectId }: ProjectTeamContentProps) {
  const qc = useQueryClient();
  const pid = projectId;
  useProjectRoom(pid);

  const [inviteOpen, setInviteOpen] = useState(false);

  const membersQ = useQuery({
    queryKey: qk.members(pid),
    queryFn: () => listMembers(pid),
    enabled: Boolean(pid),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.members(pid) });
    },
  });

  const active = (membersQ.data ?? []).filter((m) => m.status === 'ACTIVE');
  const invited = (membersQ.data ?? []).filter((m) => m.status === 'INVITED');

  function confirmRemove(member: ProjectMember) {
    if (!canRemoveMember(member)) return;

    const displayName =
      (member.user ? formatUserName(member.user) : null) ??
      member.inviteeName ??
      member.inviteePhone ??
      member.inviteeEmail ??
      'this member';

    const isInvite = member.status === 'INVITED';
    Alert.alert(
      isInvite ? 'Cancel invite?' : 'Remove member?',
      isInvite
        ? `Cancel the invite for ${displayName}? They will no longer be able to join from this link.`
        : `Remove ${displayName} from this project? They will lose access immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isInvite ? 'Cancel invite' : 'Remove',
          style: 'destructive',
          onPress: () => removeMutation.mutate(member.id),
        },
      ],
    );
  }

  return (
    <>
      <View style={styles.toolbar}>
        <ProjectHeaderAction label="+ Invite" onPress={() => setInviteOpen(true)} />
      </View>

      {membersQ.isLoading ? (
        <View style={projectScreenStyles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : membersQ.error ? (
        <EmptyState
          title="Couldn't load team"
          body={readApiError(membersQ.error)}
          action={<PrimaryButton title="Retry" onPress={() => membersQ.refetch()} />}
        />
      ) : (
        <>
          <Text style={styles.sectionLabel}>Active ({active.length})</Text>
          {active.length === 0 ? (
            <Card>
              <Text style={styles.empty}>No active members yet.</Text>
            </Card>
          ) : (
            active.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                removing={removeMutation.isPending}
                onRemove={() => confirmRemove(m)}
              />
            ))
          )}

          {invited.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Pending invites ({invited.length})</Text>
              {invited.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  removing={removeMutation.isPending}
                  onRemove={() => confirmRemove(m)}
                />
              ))}
            </>
          ) : null}
        </>
      )}

      <InviteMemberSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} projectId={pid} />
    </>
  );
}

function MemberRow({
  member,
  removing,
  onRemove,
}: {
  member: ProjectMember;
  removing: boolean;
  onRemove: () => void;
}) {
  const displayName =
    (member.user ? formatUserName(member.user) : null) ??
    member.inviteeName ??
    member.inviteePhone ??
    member.inviteeEmail ??
    'Pending';
  const subtitle =
    member.user?.phone ?? member.inviteePhone ?? member.user?.email ?? member.inviteeEmail ?? '';
  const removeLabel = memberRemoveLabel(member);
  const showRemove = canRemoveMember(member);

  return (
    <Card style={styles.memberCard}>
      <View style={{ flex: 1 }}>
        <View style={styles.memberHeader}>
          <Text style={styles.memberName}>{displayName}</Text>
          <StatusBadge label={formatRole(member.role)} tone="accent" />
        </View>
        {subtitle ? <Text style={styles.memberSub}>{subtitle}</Text> : null}
        {member.projectDepartment ? (
          <Text style={styles.memberDept}>{member.projectDepartment.displayName}</Text>
        ) : null}
        <View style={styles.memberFoot}>
          <StatusBadge
            label={member.status === 'INVITED' ? 'Invited' : member.status}
            tone={member.status === 'ACTIVE' ? 'success' : 'warning'}
          />
          {showRemove ? (
            <Pressable onPress={onRemove} hitSlop={6} disabled={removing}>
              <Text style={styles.remove}>{removing ? 'Working…' : removeLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  sectionLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: { ...typography.body, color: colors.textSecondary },
  memberCard: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  memberName: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  memberSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  memberDept: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  memberFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  remove: { ...typography.caption, color: colors.danger },
});
