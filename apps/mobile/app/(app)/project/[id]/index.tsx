import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { HealthRing, type HealthRingSegment } from '@/components/HealthRing';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { ProjectTabBar } from '@/components/ProjectTabBar';
import { AccountButton } from '@/components/AccountButton';
import { getProject } from '@/api/projects';
import { qk } from '@/api/queryKeys';
import { getProjectHealth, listConflicts } from '@/api/workspace';
import { readApiError } from '@/api/client';
import { useContentFrame } from '@/hooks/useContentFrame';
import { useProjectRoom } from '@/realtime/useProjectRoom';
import { getHealthRingSize, colors, radius, spacing, typography } from '@/theme';
import { formatProjectLanguages, formatRole, formatStatus, relativeTimeFrom } from '@/lib/format';
import type { ConflictAlert, DepartmentKind } from '@/api/types';

const DEPT_COLORS: Record<DepartmentKind, string> = {
  DIRECTION: colors.ringDirection,
  PRODUCTION: colors.ringDirection,
  CASTING: colors.ringDirection,
  DOP_CAMERA: colors.ringDOP,
  ART: colors.ringArt,
  COSTUME: colors.ringCostume,
  MAKEUP_HAIR: colors.ringMakeup,
  STUNTS: colors.ringStunts,
  VFX: colors.ringSound,
  SOUND: colors.ringSound,
  MUSIC: colors.ringSound,
  LOCATION: colors.ringArt,
  EDITORIAL: colors.ringDOP,
  POST_DI: colors.ringSound,
  POST_SOUND: colors.ringSound,
  OTHER: colors.ringDefault,
};

export default function ProjectWorkspaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { contentWidth, isWide, height } = useContentFrame('auto');
  const ringSize = useMemo(
    () => getHealthRingSize(contentWidth, isWide, height),
    [contentWidth, height, isWide],
  );
  useProjectRoom(id);

  const projectQ = useQuery({
    queryKey: qk.project(id!),
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const healthQ = useQuery({
    queryKey: qk.health(id!),
    queryFn: () => getProjectHealth(id!),
    enabled: !!id,
    // Realtime fills in updates, but we still refresh on focus to catch
    // missed events (e.g. socket reconnect during a brief blip).
    staleTime: 10_000,
  });

  const conflictsQ = useQuery({
    queryKey: qk.conflicts(id!),
    queryFn: () => listConflicts(id!),
    enabled: !!id,
    staleTime: 10_000,
  });

  if (projectQ.isLoading || healthQ.isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </ScreenContainer>
    );
  }

  const project = projectQ.data;
  const health = healthQ.data;
  if (!project || !health) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Couldn't load this project"
          body={
            projectQ.error
              ? readApiError(projectQ.error)
              : healthQ.error
                ? readApiError(healthQ.error)
                : 'It may have been removed.'
          }
          action={
            <View style={{ gap: spacing.sm }}>
              <PrimaryButton
                title="Retry"
                onPress={() => {
                  void projectQ.refetch();
                  void healthQ.refetch();
                }}
              />
              <PrimaryButton title="Back" variant="ghost" onPress={() => router.back()} />
            </View>
          }
        />
      </ScreenContainer>
    );
  }

  const segments: HealthRingSegment[] = health.departments
    .filter(d => d.required)
    .slice(0, 6)
    .map(d => ({
      id: d.id,
      label: d.displayName,
      value: d.progress,
      color: DEPT_COLORS[d.kind] ?? colors.ringDefault,
    }));

  return (
    <View style={styles.root}>
      <ScreenContainer scroll edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.replace('/(app)/projects')} hitSlop={12}>
              <Text style={styles.back}>‹ Projects</Text>
            </Pressable>
            <AccountButton />
          </View>
        </View>

        <Card variant="hero" style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Production workspace</Text>
          <Text style={styles.title}>{project.name}</Text>
          <View style={styles.metaRow}>
            <StatusBadge label={formatStatus(project.currentStage)} tone="info" />
            {project.role ? <StatusBadge label={formatRole(project.role)} tone="accent" /> : null}
            <StatusBadge label={formatProjectLanguages(project)} tone="neutral" />
          </View>
        </Card>

        <View style={styles.statsRow}>
          <Stat big={`${health.overallProgress}%`} label="Overall ready" />
          <Stat
            big={String(health.openConflicts)}
            label="Open conflicts"
            tone={health.openConflicts > 0 ? 'danger' : 'success'}
          />
          <Stat
            big={
              health.nextShootDay
                ? new Date(health.nextShootDay.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'
            }
            label="Next shoot day"
          />
        </View>

        <SectionHeader title="Project health" sub="Per-department progress" />
        <Card variant="glass">
          {segments.length === 0 ? (
            <Text style={styles.placeholder}>
              Upload your script and we'll set up your required departments.
            </Text>
          ) : (
            <View style={[styles.ringWrap, isWide && styles.ringWrapTablet]}>
              <HealthRing
                size={ringSize}
                segments={segments}
                centerLabel={`${health.overallProgress}%`}
                centerSub="Pre-production"
              />
              <View style={[styles.legend, isWide && styles.legendTablet]}>
                {segments.map(seg => (
                  <View key={seg.id} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                    <Text style={styles.legendLabel}>{seg.label}</Text>
                    <Text style={styles.legendValue}>{seg.value}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        <SectionHeader
          title="Open conflicts"
          sub={
            health.openConflicts === 0
              ? 'All clear right now'
              : `${health.openConflicts} alert${health.openConflicts === 1 ? '' : 's'}`
          }
        />
        {conflictsQ.data && conflictsQ.data.length > 0 ? (
          <FlatList
            scrollEnabled={false}
            data={conflictsQ.data.slice(0, 5)}
            keyExtractor={c => c.id}
            renderItem={({ item }) => <ConflictRow alert={item} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        ) : (
          <Card>
            <Text style={styles.placeholder}>
              The conflict scanner will alert you when a teammate is double-booked, a required
              department falls behind, or a stunt/VFX scene doesn't have prep done.
            </Text>
          </Card>
        )}

        <SectionHeader title="Script & AI" />
        <PrimaryButton
          title="Upload a new script"
          variant="secondary"
          onPress={() => router.push(`/(app)/project/${project.id}/upload-script`)}
        />

        <View style={{ height: spacing.xxl }} />
      </ScreenContainer>

      <ProjectTabBar projectId={project.id} active="workspace" />
    </View>
  );
}

function Stat({ big, label, tone }: { big: string; label: string; tone?: 'success' | 'danger' }) {
  return (
    <View style={styles.statTile}>
      <Text
        style={[
          styles.statBig,
          tone === 'success' && { color: colors.success },
          tone === 'danger' && { color: colors.danger },
        ]}
      >
        {big}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ConflictRow({ alert }: { alert: ConflictAlert }) {
  const tone =
    alert.severity === 'CRITICAL' ? 'danger' : alert.severity === 'WARNING' ? 'warning' : 'info';
  return (
    <Card>
      <View style={styles.conflictHead}>
        <StatusBadge label={alert.severity} tone={tone} />
        <Text style={styles.conflictTime}>{relativeTimeFrom(alert.createdAt)}</Text>
      </View>
      <Text style={styles.conflictTitle}>{alert.title}</Text>
      <Text style={styles.conflictBody}>{alert.body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingBottom: spacing.sm },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { ...typography.bodyStrong, color: colors.brand },
  heroCard: { marginBottom: spacing.lg },
  heroEyebrow: {
    ...typography.micro,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.onBrand,
    marginBottom: spacing.md,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statTile: {
    flex: 1,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    alignItems: 'center',
    ...StyleSheet.flatten({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    }),
  },
  statBig: {
    ...typography.title,
    fontSize: 22,
    color: colors.brand,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  ringWrap: { alignItems: 'center', paddingVertical: spacing.md },
  ringWrapTablet: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  legend: { alignSelf: 'stretch', marginTop: spacing.lg, width: '100%', gap: spacing.sm },
  legendTablet: { marginTop: 0, flex: 1, maxWidth: 360 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 999 },
  legendLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  legendValue: { ...typography.bodyStrong, color: colors.textSecondary },
  placeholder: { ...typography.body, color: colors.textSecondary },
  conflictHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  conflictTime: { ...typography.caption, color: colors.textMuted },
  conflictTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: 2 },
  conflictBody: { ...typography.body, color: colors.textSecondary },
});
