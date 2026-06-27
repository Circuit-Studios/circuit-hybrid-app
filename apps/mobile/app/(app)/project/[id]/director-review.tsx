import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SectionHeader } from '@/components/SectionHeader';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { readApiError } from '@/api/client';
import { qk } from '@/api/queryKeys';
import {
  applyShootingPlanToSchedule,
  approveTaskSuggestion,
  bulkApproveTaskSuggestions,
  getShootingPlan,
  listTaskSuggestions,
  rejectTaskSuggestion,
} from '@/api/taskSuggestions';
import { colors, spacing, typography } from '@/theme';

export default function DirectorReviewScreen() {
  const { id: projectId, scriptId } = useLocalSearchParams<{ id: string; scriptId?: string }>();
  const qc = useQueryClient();

  const planQ = useQuery({
    queryKey: ['shooting-plan', projectId, scriptId],
    queryFn: () => getShootingPlan(projectId!, scriptId),
    enabled: !!projectId,
  });

  const suggestionsQ = useQuery({
    queryKey: ['task-suggestions', projectId, 'PENDING'],
    queryFn: () => listTaskSuggestions(projectId!, 'PENDING'),
    enabled: !!projectId,
  });

  const approveOne = useMutation({
    mutationFn: approveTaskSuggestion,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['task-suggestions', projectId] }),
  });

  const rejectOne = useMutation({
    mutationFn: rejectTaskSuggestion,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['task-suggestions', projectId] }),
  });

  const approveAll = useMutation({
    mutationFn: () =>
      bulkApproveTaskSuggestions(
        projectId!,
        (suggestionsQ.data?.suggestions ?? []).map((s) => s.id),
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['task-suggestions', projectId] }),
  });

  const applyToSchedule = useMutation({
    mutationFn: () => applyShootingPlanToSchedule(projectId!, scriptId),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: qk.schedule(projectId!) });
      void qc.invalidateQueries({ queryKey: qk.health(projectId!) });
      Alert.alert(
        'Added to schedule',
        result.created > 0
          ? `${result.created} shoot day${result.created === 1 ? '' : 's'} added${
              result.skipped > 0 ? ` (${result.skipped} already scheduled)` : ''
            }.`
          : 'All shoot days from this plan were already on the schedule.',
        [
          {
            text: 'View schedule',
            onPress: () => router.replace(`/(app)/project/${projectId}/schedule`),
          },
          { text: 'OK' },
        ],
      );
    },
    onError: (err) => Alert.alert('Could not apply plan', readApiError(err)),
  });

  if (planQ.isLoading || suggestionsQ.isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.brand} />
      </ScreenContainer>
    );
  }

  const plan = planQ.data?.plan;
  const pending = suggestionsQ.data?.suggestions ?? [];
  const days = plan?.plan?.shootDays ?? [];

  return (
    <ScreenContainer scroll>
      <SectionHeader
        title="Director review"
        sub="Shooting plan and tasks awaiting your approval."
      />

      {plan ? (
        <Card style={styles.card}>
          <Text style={styles.heading}>Shooting plan</Text>
          <Text style={styles.body}>{plan.summary}</Text>
          <Text style={styles.meta}>{plan.totalShootDays} shoot days estimated</Text>
          {plan.risks?.length ? (
            <View style={styles.block}>
              <Text style={styles.subheading}>Risks</Text>
              {plan.risks.map((risk) => (
                <Text key={risk} style={styles.body}>
                  • {risk}
                </Text>
              ))}
            </View>
          ) : null}
          {days.length ? (
            <View style={styles.block}>
              <Text style={styles.subheading}>Shoot days</Text>
              {days.slice(0, 8).map((day) => (
                <Text key={day.dayNumber} style={styles.body}>
                  Day {day.dayNumber}
                  {day.location ? ` — ${day.location}` : ''}
                  {day.sceneNumbers.length ? ` (Scenes ${day.sceneNumbers.join(', ')})` : ''}
                </Text>
              ))}
              {days.length > 8 ? (
                <Text style={styles.meta}>+ {days.length - 8} more days</Text>
              ) : null}
            </View>
          ) : null}
          {days.length ? (
            <PrimaryButton
              title="Apply to schedule"
              loading={applyToSchedule.isPending}
              onPress={() => applyToSchedule.mutate()}
            />
          ) : null}
        </Card>
      ) : (
        <Text style={styles.body}>No shooting plan yet. Run script analysis first.</Text>
      )}

      <SectionHeader title="Task suggestions" sub={`${pending.length} pending approval`} />

      {pending.length === 0 ? (
        <Text style={styles.body}>No pending task suggestions.</Text>
      ) : (
        pending.map((s) => (
          <Card key={s.id} style={styles.card}>
            <Text style={styles.heading}>{s.title}</Text>
            {s.description ? <Text style={styles.body}>{s.description}</Text> : null}
            <Text style={styles.meta}>
              {s.departmentKind} · {s.priority}
              {s.sceneNumbers.length ? ` · Scenes ${s.sceneNumbers.join(', ')}` : ''}
            </Text>
            <View style={styles.row}>
              <Pressable onPress={() => approveOne.mutate(s.id)} style={styles.approve}>
                <Text style={styles.approveText}>Approve</Text>
              </Pressable>
              <Pressable onPress={() => rejectOne.mutate(s.id)} style={styles.reject}>
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      {pending.length > 1 ? (
        <PrimaryButton
          title="Approve all pending"
          loading={approveAll.isPending}
          onPress={() => approveAll.mutate()}
        />
      ) : null}

      {planQ.error || suggestionsQ.error ? (
        <Text style={styles.error}>
          {readApiError(planQ.error ?? suggestionsQ.error, 'Could not load director review')}
        </Text>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  heading: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  subheading: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.xs },
  meta: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  block: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  approve: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
  },
  approveText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  reject: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rejectText: { ...typography.caption, color: colors.danger },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.md },
});
