import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { HealthRing } from '@/components/HealthRing';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { getProject } from '@/api/projects';
import { qk } from '@/api/queryKeys';
import { getProjectHealth, listConflicts } from '@/api/workspace';
import { readApiError } from '@/api/client';
import { useAppConfig } from '@/config/AppConfigContext';
import { useContentFrame } from '@/hooks/useContentFrame';
import { useProjectRoom } from '@/realtime/useProjectRoom';
import { getHealthRingSize, colors, radius, shadows, spacing, typography } from '@/theme';
import { formatProjectLanguages, formatRole, formatStatus, relativeTimeFrom } from '@/lib/format';
import type { ConflictAlert, DepartmentSummary } from '@/api/types';

interface DepartmentProgress {
  id: string;
  label: string;
  value: number;
  tasks: DepartmentSummary['tasks'];
}

type DepartmentReadinessStatus = 'ready' | 'in_progress' | 'not_started';

function departmentReadiness(dept: DepartmentProgress): DepartmentReadinessStatus {
  const { todo, inProgress, done, blocked } = dept.tasks;
  const total = todo + inProgress + done + blocked;
  if (dept.value >= 100 || (total > 0 && done === total)) return 'ready';
  if (total === 0) return 'not_started';
  if (inProgress > 0 || done > 0 || blocked > 0) return 'in_progress';
  return 'not_started';
}

/** Status colour for the leading dot: muted (not started), gold (in progress), green (ready). */
function departmentStatusColor(dept: DepartmentProgress): string {
  const status = departmentReadiness(dept);
  if (status === 'ready') return colors.success;
  if (status === 'not_started') return colors.textMuted;
  return colors.brand;
}

function departmentStatusLabel(dept: DepartmentProgress): string {
  const status = departmentReadiness(dept);
  if (status === 'ready') return 'Ready';
  if (status === 'not_started') return 'Not started';
  return 'In progress';
}

function departmentPriority(dept: DepartmentProgress): number {
  const status = departmentReadiness(dept);
  if (status === 'in_progress') return 0;
  if (status === 'not_started') return 1;
  return 2;
}

function departmentSort(a: DepartmentProgress, b: DepartmentProgress): number {
  const priorityDelta = departmentPriority(a) - departmentPriority(b);
  if (priorityDelta !== 0) return priorityDelta;
  if (b.tasks.inProgress !== a.tasks.inProgress) return b.tasks.inProgress - a.tasks.inProgress;
  return a.value - b.value;
}

export interface ProjectOverviewContentProps {
  projectId: string;
}

/**
 * Dashboard body for the active project: hero, key stats, department health
 * rings and open conflicts. Rendered inside the Home tab (no header chrome).
 */
export function ProjectOverviewContent({ projectId }: ProjectOverviewContentProps) {
  const router = useRouter();
  const { isFeatureEnabled } = useAppConfig();
  const scriptUploadEnabled = isFeatureEnabled('scripts.upload');
  const { contentWidth, isWide, height } = useContentFrame('auto');
  const ringSize = useMemo(
    () => getHealthRingSize(contentWidth, isWide, height),
    [contentWidth, height, isWide],
  );
  useProjectRoom(projectId);

  const projectQ = useQuery({
    queryKey: qk.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const healthQ = useQuery({
    queryKey: qk.health(projectId),
    queryFn: () => getProjectHealth(projectId),
    enabled: !!projectId,
    staleTime: 10_000,
  });

  const conflictsQ = useQuery({
    queryKey: qk.conflicts(projectId),
    queryFn: () => listConflicts(projectId),
    enabled: !!projectId,
    staleTime: 10_000,
  });

  if (projectQ.isLoading || healthQ.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const project = projectQ.data;
  const health = healthQ.data;
  if (!project || !health) {
    return (
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
          <PrimaryButton
            title="Retry"
            onPress={() => {
              void projectQ.refetch();
              void healthQ.refetch();
            }}
          />
        }
      />
    );
  }

  const departments: DepartmentProgress[] = health.departments
    .filter((d) => {
      const taskCount = d.tasks.todo + d.tasks.inProgress + d.tasks.done + d.tasks.blocked;
      return d.required || taskCount > 0;
    })
    .map((d) => ({
      id: d.id,
      label: d.displayName,
      value: d.progress,
      tasks: d.tasks,
    }))
    .sort(departmentSort);
  const readyCount = departments.filter((d) => departmentReadiness(d) === 'ready').length;

  return (
    <>
      <View style={styles.heroGlow}>
        <LinearGradient
          colors={[colors.amberLight, colors.brand, colors.brandStrong]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>Production workspace</Text>
          <Text style={styles.title}>{project.name}</Text>
          <View style={styles.metaRow}>
            <HeroMetaPill label={formatStatus(project.currentStage)} />
            {project.role ? <HeroMetaPill label={formatRole(project.role)} /> : null}
            <HeroMetaPill label={formatProjectLanguages(project)} />
          </View>
        </LinearGradient>
      </View>

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

      <SectionHeader
        title="Project health"
        sub="See which departments need attention before the next shoot day."
      />
      <Card variant="glass" style={styles.healthCard}>
        {departments.length === 0 ? (
          <View style={styles.healthEmpty}>
            <Text style={styles.placeholder}>
              Upload your script and Circuit will map required departments here.
            </Text>
            {scriptUploadEnabled ? (
              <PrimaryButton
                title="Upload script"
                variant="secondary"
                onPress={() => router.push(`/(app)/project/${project.id}/upload-script`)}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.readinessConsole}>
            <View style={styles.readinessHeader}>
              <View style={styles.readinessCopy}>
                <Text style={styles.readinessEyebrow}>Project readiness</Text>
                <Text style={styles.readinessTitle}>
                  {readyCount} of {departments.length} departments ready
                </Text>
                <Text style={styles.readinessSub}>
                  Focus on the open departments before moving the shoot forward.
                </Text>
              </View>
              <HealthRing
                size={ringSize}
                thickness={10}
                value={health.overallProgress}
                centerLabel={`${health.overallProgress}%`}
              />
            </View>

            <View style={[styles.departmentList, isWide && styles.departmentListTablet]}>
              {departments.map((dept) => (
                <DepartmentRow
                  key={dept.id}
                  dept={dept}
                  onPress={() => router.push(`/(app)/(tabs)/activity?dept=${dept.id}`)}
                />
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
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConflictRow alert={item} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      ) : (
        <Card variant="glass" style={styles.conflictEmptyCard}>
          <Text style={styles.conflictEmptyTitle}>No open conflicts</Text>
          <Text style={styles.placeholder}>
            Circuit scans your schedule and department progress. You will see alerts here when a
            teammate is double-booked, a department falls behind, or stunt/VFX prep is missing.
          </Text>
        </Card>
      )}

      {scriptUploadEnabled ? (
        <>
          <SectionHeader title="Script & AI" />
          <PrimaryButton
            title="Upload a new script"
            variant="secondary"
            onPress={() => router.push(`/(app)/project/${project.id}/upload-script`)}
          />
        </>
      ) : null}

      <View style={{ height: spacing.lg }} />
    </>
  );
}

function DepartmentRow({ dept, onPress }: { dept: DepartmentProgress; onPress: () => void }) {
  const value = Math.max(0, Math.min(100, dept.value));
  const statusColor = departmentStatusColor(dept);
  const status = departmentReadiness(dept);
  const statusLabel = departmentStatusLabel(dept);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View tasks for ${dept.label}, ${statusLabel}, ${value}% ready`}
      onPress={onPress}
      style={({ pressed }) => [styles.deptRow, pressed && styles.deptRowPressed]}
    >
      <View style={styles.deptHead}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.deptLabel} numberOfLines={1}>
          {dept.label}
        </Text>
        <View
          style={[
            styles.statusPill,
            status === 'ready' && styles.statusPillReady,
            status === 'in_progress' && styles.statusPillInProgress,
            status === 'not_started' && styles.statusPillNotStarted,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              status === 'ready' && styles.statusPillTextReady,
              status === 'in_progress' && styles.statusPillTextInProgress,
              status === 'not_started' && styles.statusPillTextNotStarted,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
        <Text style={styles.deptValue}>{value}%</Text>
        <Text style={styles.deptChevron}>›</Text>
      </View>
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            status === 'ready' && styles.progressBarFillReady,
            { width: `${value}%` },
          ]}
        />
      </View>
    </Pressable>
  );
}

function HeroMetaPill({ label }: { label: string }) {
  return (
    <View style={styles.heroPill}>
      <Text style={styles.heroPillText}>{label}</Text>
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
  const isCritical = alert.severity === 'CRITICAL';
  const tone =
    alert.severity === 'CRITICAL' ? 'danger' : alert.severity === 'WARNING' ? 'warning' : 'info';
  return (
    <Card style={isCritical ? styles.conflictCritical : undefined}>
      <View style={styles.conflictHead}>
        <StatusBadge label={alert.severity} tone={tone} />
        <Text style={styles.conflictTime}>{relativeTimeFrom(alert.createdAt)}</Text>
      </View>
      <Text style={[styles.conflictTitle, isCritical && styles.conflictTitleCritical]}>
        {alert.title}
      </Text>
      <Text style={styles.conflictBody}>{alert.body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  heroGlow: {
    alignSelf: 'stretch',
    borderRadius: radius.card,
    marginBottom: spacing.lg,
    ...shadows.glow,
  },
  heroCard: {
    borderRadius: radius.card,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  heroEyebrow: {
    ...typography.micro,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.onBrand,
    marginBottom: spacing.md,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heroPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  heroPillText: { ...typography.micro, color: colors.onBrand },
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
  healthCard: { marginBottom: spacing.sm },
  readinessConsole: { gap: spacing.md },
  readinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  readinessCopy: { flex: 1, gap: 3 },
  readinessEyebrow: { ...typography.micro, color: colors.brandStrong },
  readinessTitle: { ...typography.heading, color: colors.textPrimary },
  readinessSub: { ...typography.caption, color: colors.textSecondary },
  departmentList: { gap: spacing.sm },
  departmentListTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  deptRow: {
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  deptRowPressed: { backgroundColor: colors.accentSoft },
  deptHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 999 },
  deptLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  deptValue: { ...typography.bodyStrong, color: colors.textSecondary },
  deptChevron: { ...typography.bodyStrong, color: colors.textMuted },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusPillReady: { backgroundColor: colors.successSoft },
  statusPillInProgress: { backgroundColor: colors.accentSoft },
  statusPillNotStarted: { backgroundColor: colors.surfaceMuted },
  statusPillText: { ...typography.micro, letterSpacing: 0.4 },
  statusPillTextReady: { color: colors.success },
  statusPillTextInProgress: { color: colors.brandStrong },
  statusPillTextNotStarted: { color: colors.textSecondary },
  progressBarTrack: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginLeft: spacing.sm + 10,
  },
  progressBarFill: { height: 4, borderRadius: radius.pill, backgroundColor: colors.brand },
  progressBarFillReady: { backgroundColor: colors.success },
  healthEmpty: { gap: spacing.md, alignItems: 'flex-start' },
  placeholder: { ...typography.body, color: colors.textSecondary },
  conflictEmptyCard: { gap: spacing.sm },
  conflictEmptyTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  conflictCritical: {
    borderColor: colors.danger,
    borderWidth: 1,
    backgroundColor: colors.danger + '0D',
  },
  conflictTitleCritical: { color: colors.danger },
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
