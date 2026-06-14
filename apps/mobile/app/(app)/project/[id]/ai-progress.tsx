import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { getAnalysis, triggerAnalysis } from '@/api/scripts';
import { readApiError } from '@/api/client';
import { qk } from '@/api/queryKeys';
import { colors, radius, spacing, typography } from '@/theme';
import type { ScriptAnalysisStatus } from '@/api/types';

// Mirrors the backend's ScriptAnalysisStatus enum and the 6 pipeline steps.
// Each entry tells the UI: "if status === phase, this is the active line."
interface PipelinePhase {
  status: ScriptAnalysisStatus;
  label: string;
  detail: string;
}

const PIPELINE: PipelinePhase[] = [
  { status: 'EXTRACTING_TEXT', label: 'Reading your PDF', detail: 'Extracting clean text from the script.' },
  { status: 'ANALYZING_CHARACTERS', label: 'Mapping characters', detail: 'Leads, supports, day-roles, screen time.' },
  { status: 'ANALYZING_SCENES', label: 'Breaking down scenes', detail: 'INT/EXT · day/night · who appears where.' },
  { status: 'ANALYZING_COMBINATIONS', label: 'Finding combination scenes', detail: 'Scenes to shoot together for fewer days.' },
  { status: 'SUGGESTING_DEPARTMENTS', label: 'Suggesting departments', detail: 'Only the departments your story needs.' },
  { status: 'ESTIMATING_SHOOT_DAYS', label: 'Estimating shoot days', detail: 'Per-actor day estimates and optimisation hints.' },
  { status: 'DRAFTING_BUDGET', label: 'Drafting your budget', detail: 'Line items by department in ₹ INR.' },
];

function phaseIndex(status: ScriptAnalysisStatus): number {
  const idx = PIPELINE.findIndex(p => p.status === status);
  if (idx >= 0) return idx;
  if (status === 'PENDING') return -1;
  if (status === 'COMPLETED') return PIPELINE.length;
  return -1; // FAILED or unknown
}

export default function AIProgressScreen() {
  const { id: projectId, scriptId } = useLocalSearchParams<{ id: string; scriptId?: string }>();
  const router = useRouter();

  const { data, error, refetch } = useQuery({
    queryKey: qk.analysis(scriptId!),
    queryFn: () => getAnalysis(scriptId!),
    enabled: !!scriptId,
    // Poll until we hit a terminal state. 2.5s strikes a balance between
    // perceived liveness and not hammering the backend.
    refetchInterval: q => {
      const status = q.state.data?.script.analysisStatus;
      if (!status) return 2500;
      if (status === 'COMPLETED' || status === 'FAILED') return false;
      return 2500;
    },
  });

  const status = data?.script.analysisStatus;
  const currentIdx = status ? phaseIndex(status) : -1;

  // When analysis finishes, jump to the results screen automatically.
  useEffect(() => {
    if (status === 'COMPLETED' && projectId && scriptId) {
      router.replace(`/(app)/project/${projectId}/ai-results?scriptId=${scriptId}`);
    }
  }, [status, projectId, scriptId, router]);

  async function handleRetry() {
    if (!scriptId) return;
    try {
      await triggerAnalysis(scriptId);
      void refetch();
    } catch (err) {
      // Surface inline if we ever miss a status flip.
      console.warn('retry failed', err);
    }
  }

  return (
    <ScreenContainer scroll>
      <Pressable onPress={() => router.replace(`/(app)/project/${projectId}`)} hitSlop={12}>
        <Text style={styles.back}>‹ Back to project</Text>
      </Pressable>

      <Text style={styles.title}>Analysing your script</Text>
      <Text style={styles.body}>
        This usually takes 30–90 seconds depending on script length. You can leave the screen — we
        keep working and you can come back any time.
      </Text>

      {status === 'FAILED' ? (
        <Card style={styles.failedCard}>
          <StatusBadge label="Failed" tone="danger" />
          <Text style={styles.failedText}>
            {data?.script.analysisError ?? 'Something went wrong analysing this script.'}
          </Text>
          <PrimaryButton title="Try again" onPress={handleRetry} />
        </Card>
      ) : null}

      <Card style={styles.pipelineCard} padded={false}>
        {PIPELINE.map((phase, idx) => {
          const done = idx < currentIdx || status === 'COMPLETED';
          const active = idx === currentIdx && status !== 'COMPLETED';
          return (
            <View
              key={phase.status}
              style={[
                styles.row,
                idx !== PIPELINE.length - 1 && styles.rowDivider,
              ]}
            >
              <View style={styles.iconCol}>
                {done ? (
                  <View style={[styles.dot, styles.dotDone]}>
                    <Text style={styles.check}>✓</Text>
                  </View>
                ) : active ? (
                  <View style={[styles.dot, styles.dotActive]}>
                    <ActivityIndicator color={colors.accentInk} />
                  </View>
                ) : (
                  <View style={styles.dot} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{phase.label}</Text>
                <Text style={styles.rowDetail}>{phase.detail}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      {error ? <Text style={styles.errorText}>{readApiError(error)}</Text> : null}

      <View style={styles.actions}>
        <PrimaryButton
          title="Leave it running"
          variant="ghost"
          onPress={() => router.replace(`/(app)/project/${projectId}`)}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { ...typography.bodyStrong, color: colors.textSecondary, marginBottom: spacing.md },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  pipelineCard: { marginTop: spacing.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconCol: { width: 28, alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  check: { color: '#0B0F1A', fontSize: 14, fontWeight: '800' },
  rowLabel: { ...typography.bodyStrong, color: colors.textSecondary },
  rowLabelActive: { color: colors.textPrimary },
  rowDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  failedCard: { gap: spacing.md, marginTop: spacing.md, borderColor: colors.danger, borderWidth: 1, padding: spacing.lg, borderRadius: radius.lg },
  failedText: { ...typography.body, color: colors.textPrimary },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.md },
  actions: { marginTop: spacing.xl },
});
