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
import { colors, spacing, typography } from '@/theme';
import { formatRole } from '@/lib/format';
import type { ProjectInvite } from '@/api/types';
import { ProjectCard } from './ProjectCard';
import {
  useAcceptInviteMutation,
  useMyInvitesQuery,
  useProjectsQuery,
} from './hooks';

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

  return (
    <ScreenContainer topAligned edges={['top', 'left', 'right']}>
      <ScreenHeader
        eyebrow={`Hi ${user?.firstName?.trim() || 'there'}`}
        title={
          inSpiderMode ? 'Your projects' : projects.length === 1 ? 'Your project' : 'Welcome'
        }
        subtitle={
          inSpiderMode ? 'Spider mode — tap a project to open its workspace.' : undefined
        }
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
              <Button title="Start a film project" onPress={() => router.push('/(app)/create-project')} />
            ) : null
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={projects}
          keyExtractor={p => p.id}
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
                {invites.map(inv => (
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
      <View style={styles.inviteHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.projectName}>{invite.project.name}</Text>
          <Text style={styles.projectMeta}>
            Invited as {formatRole(invite.role)}
            {invite.projectDepartment ? ` · ${invite.projectDepartment.displayName}` : ''}
          </Text>
        </View>
        <StatusBadge label="Invite" tone="warning" />
      </View>
      <View style={styles.inviteActions}>
        <Button title="Accept" onPress={onAccept} loading={accepting} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl },
  inviteBlock: { marginBottom: spacing.lg },
  inviteHeader: {
    ...typography.micro,
    color: colors.warning,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  inviteCard: { gap: spacing.md, marginBottom: spacing.sm },
  inviteHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  inviteActions: { marginTop: spacing.sm },
  projectName: {
    ...typography.title,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  projectMeta: { ...typography.caption, color: colors.textSecondary },
});
