import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppHeaderActions } from '@/components/AppHeaderActions';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { readApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';
import { formatRole } from '@/lib/format';
import { useChromeInsets } from '@/hooks/useChromeInsets';
import type { ProjectInvite } from '@/api/types';
import { ProjectCard } from './ProjectCard';
import { useAcceptInviteMutation, useMyInvitesQuery, useProjectsQuery } from './hooks';

export default function ProjectList() {
  const router = useRouter();
  const { user } = useAuth();
  const canStartProject = user?.defaultRole === 'DIRECTOR' || user?.defaultRole === 'PRODUCER';

  const { data, isLoading, error, refetch, isRefetching } = useProjectsQuery();
  const invitesQ = useMyInvitesQuery();
  const acceptMutation = useAcceptInviteMutation();

  const projects = data ?? [];
  const invites = invitesQ.data ?? [];
  const inSpiderMode = projects.length >= 2;
  const { appTabBarReserve } = useChromeInsets();

  return (
    <ScreenContainer
      topAligned
      edges={['top', 'left', 'right']}
      contentStyle={{ paddingBottom: appTabBarReserve }}
    >
      <ScreenHeader
        eyebrow={`Hi ${user?.firstName?.trim() || 'there'}`}
        title={inSpiderMode ? 'Your projects' : projects.length === 1 ? 'Your project' : 'Welcome'}
        subtitle={inSpiderMode ? 'Spider mode — tap a project to open its workspace.' : undefined}
        trailing={<AppHeaderActions />}
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          title="Couldn't load projects"
          body={readApiError(error)}
          action={<Button title="Retry" onPress={() => refetch()} />}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title={canStartProject ? 'No Film projects yet' : 'Waiting on an invite'}
          body={
            canStartProject
              ? 'Start your first film project to upload a script and let Circuit map characters, scenes, departments and a budget for you.'
              : 'Ask a director or producer on your team to send you an invite. Once they add your number, your projects will show up here.'
          }
          action={
            canStartProject ? (
              <Button
                title="Start a film project"
                onPress={() => router.push('/(app)/create-project')}
              />
            ) : null
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={projects}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProjectCard project={item} />}
          onRefresh={() => {
            void refetch();
            void invitesQ.refetch();
          }}
          refreshing={isRefetching}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            invites.length > 0 ? (
              <View style={styles.inviteBlock}>
                <Text style={styles.inviteHeader}>
                  Pending invite{invites.length === 1 ? '' : 's'} ({invites.length})
                </Text>
                {invites.map((inv) => (
                  <InviteCard
                    key={inv.id}
                    invite={inv}
                    accepting={acceptMutation.isPending}
                    onAccept={() => acceptMutation.mutate(inv.id)}
                  />
                ))}
              </View>
            ) : null
          }
          ListFooterComponent={
            canStartProject ? (
              <View style={{ marginTop: spacing.xl }}>
                <Button
                  title="Start a new project"
                  variant="secondary"
                  onPress={() => router.push('/(app)/create-project')}
                />
              </View>
            ) : null
          }
        />
      )}
    </ScreenContainer>
  );
}

function InviteCard({
  invite,
  accepting,
  onAccept,
}: {
  invite: ProjectInvite;
  accepting: boolean;
  onAccept: () => void;
}) {
  return (
    <Card variant="hero" style={styles.inviteCard}>
      <View style={styles.inviteAccent} />
      <View style={styles.inviteContent}>
        <View style={styles.inviteHead}>
          <View style={styles.inviteIcon}>
            <Ionicons name="mail-unread-outline" size={22} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inviteEyebrow}>Action required</Text>
            <Text style={styles.inviteProjectName}>{invite.project.name}</Text>
            <Text style={styles.projectMeta}>
              Invited as {formatRole(invite.role)}
              {invite.projectDepartment ? ` · ${invite.projectDepartment.displayName}` : ''}
            </Text>
          </View>
          <StatusBadge label="Pending" tone="warning" />
        </View>
        <View style={styles.inviteActions}>
          <Button title="Accept invite" onPress={onAccept} loading={accepting} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl },
  inviteBlock: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warning + '14',
    borderWidth: 1,
    borderColor: colors.warning + '44',
  },
  inviteHeader: {
    ...typography.micro,
    color: colors.warning,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  inviteCard: {
    overflow: 'hidden',
    marginBottom: spacing.sm,
    padding: 0,
  },
  inviteAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.warning,
  },
  inviteContent: { padding: spacing.lg, paddingLeft: spacing.lg + 4, gap: spacing.md },
  inviteHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteEyebrow: {
    ...typography.micro,
    color: colors.warning,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  inviteProjectName: {
    ...typography.title,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  inviteActions: { marginTop: spacing.xs },
  projectMeta: { ...typography.caption, color: colors.textSecondary },
});
