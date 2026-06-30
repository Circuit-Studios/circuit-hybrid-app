import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { ProjectHeaderAction, projectScreenStyles } from '@/components/project/ProjectScreenScaffold';
import { ShootDaySheet } from '@/features/schedule/ShootDaySheet';
import { listShootDays, deleteShootDay, listConflicts } from '@/api/workspace';
import { getShootingPlan, applyShootingPlanToSchedule } from '@/api/taskSuggestions';
import { qk } from '@/api/queryKeys';
import { readApiError } from '@/api/client';
import { useProjectRoom } from '@/realtime/useProjectRoom';
import { colors, conflictSeverityMeta, radius, spacing, typography } from '@/theme';
import type { ConflictSeverity, ShootDay } from '@/api/types';

type ScheduleView = 'board' | 'agenda';

const VIEWS: SegmentOption<ScheduleView>[] = [
  { value: 'board', label: 'Board' },
  { value: 'agenda', label: 'Agenda' },
];

const SEVERITY_RANK: Record<ConflictSeverity, number> = { INFO: 0, WARNING: 1, CRITICAL: 2 };

export interface ProjectScheduleContentProps {
  projectId: string;
}

/** Shoot schedule body for the active project (board/agenda + conflict scan). */
export function ProjectScheduleContent({ projectId }: ProjectScheduleContentProps) {
  const qc = useQueryClient();
  const pid = projectId;
  useProjectRoom(pid);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<ScheduleView>('board');

  const scheduleQ = useQuery({
    queryKey: qk.schedule(pid),
    queryFn: () => listShootDays(pid),
    enabled: Boolean(pid),
  });

  const conflictsQ = useQuery({
    queryKey: qk.conflicts(pid),
    queryFn: () => listConflicts(pid),
    enabled: Boolean(pid),
  });

  // Used only to know whether an AI plan exists for the empty-state CTA.
  const planQ = useQuery({
    queryKey: ['shooting-plan', pid, undefined],
    queryFn: () => getShootingPlan(pid),
    enabled: Boolean(pid),
    retry: false,
  });

  const days = scheduleQ.data ?? [];
  const conflicts = conflictsQ.data ?? [];
  const topSeverity = conflicts.reduce<ConflictSeverity | null>((max, c) => {
    if (!max || SEVERITY_RANK[c.severity] > SEVERITY_RANK[max]) return c.severity;
    return max;
  }, null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShootDay(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.schedule(pid) });
      void qc.invalidateQueries({ queryKey: qk.health(pid) });
      void qc.invalidateQueries({ queryKey: qk.conflicts(pid) });
    },
  });

  const applyPlan = useMutation({
    mutationFn: () => applyShootingPlanToSchedule(pid),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: qk.schedule(pid) });
      void qc.invalidateQueries({ queryKey: qk.health(pid) });
      Alert.alert(
        'Schedule built',
        result.created > 0
          ? `${result.created} shoot day${result.created === 1 ? '' : 's'} added from the AI plan.`
          : 'All shoot days from the plan were already on the schedule.',
      );
    },
    onError: (err) => Alert.alert('Could not apply plan', readApiError(err)),
  });

  function confirmRemove(day: ShootDay) {
    const dateLabel = new Date(day.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    Alert.alert(
      'Remove shoot day?',
      `Day ${day.dayNumber} (${dateLabel}) will be removed from the schedule. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(day.id) },
      ],
    );
  }

  const planExists = Boolean(planQ.data?.plan);

  return (
    <>
      <View style={styles.toolbar}>
        <Text style={styles.body}>
          Add shoot days here — the conflict scanner watches for cross-project clashes and missing
          stunt/VFX prep automatically.
        </Text>
        <ProjectHeaderAction label="+ Day" onPress={() => setSheetOpen(true)} />
      </View>

      {topSeverity ? (
        <View
          style={[
            styles.conflictBanner,
            { borderLeftColor: conflictSeverityMeta[topSeverity].color },
          ]}
        >
          <StatusBadge
            label={`${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}`}
            tone={conflictSeverityMeta[topSeverity].tone}
          />
          <Text style={styles.conflictText} numberOfLines={2}>
            {conflicts[0]?.title}
          </Text>
        </View>
      ) : null}

      {days.length > 0 ? (
        <SegmentedControl options={VIEWS} value={view} onChange={setView} style={styles.segment} />
      ) : null}

      {scheduleQ.isLoading ? (
        <View style={projectScreenStyles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : scheduleQ.error ? (
        <EmptyState
          title="Couldn't load schedule"
          body={readApiError(scheduleQ.error)}
          action={<PrimaryButton title="Retry" onPress={() => scheduleQ.refetch()} />}
        />
      ) : days.length === 0 ? (
        <EmptyState
          title="Build your shoot calendar"
          body={
            planExists
              ? 'Apply your AI shooting plan to auto-fill shoot days, or add one manually.'
              : 'Add your first shoot day to unlock conflict detection, call-time tracking, and scene planning.'
          }
          action={
            planExists ? (
              <View style={styles.emptyActions}>
                <PrimaryButton
                  title="Apply AI shooting plan"
                  loading={applyPlan.isPending}
                  onPress={() => applyPlan.mutate()}
                />
                <Pressable onPress={() => setSheetOpen(true)} hitSlop={8}>
                  <Text style={styles.secondaryLink}>Add manually instead</Text>
                </Pressable>
              </View>
            ) : (
              <PrimaryButton title="Add first shoot day" onPress={() => setSheetOpen(true)} />
            )
          }
        />
      ) : view === 'agenda' ? (
        <View style={styles.agenda}>
          {days.map((day) => (
            <AgendaRow key={day.id} day={day} onRemove={() => confirmRemove(day)} />
          ))}
        </View>
      ) : (
        <View style={styles.timeline}>
          {days.map((day, idx) => (
            <BoardDay
              key={day.id}
              day={day}
              isLast={idx === days.length - 1}
              onRemove={() => confirmRemove(day)}
              removing={deleteMutation.isPending}
            />
          ))}
        </View>
      )}

      <ShootDaySheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        projectId={pid}
        existingDays={days.map((d) => d.dayNumber)}
      />
    </>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function BoardDay({
  day,
  isLast,
  onRemove,
  removing,
}: {
  day: ShootDay;
  isLast: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  const dateObj = new Date(day.date);
  const isPast = dateObj < new Date();
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineGutter}>
        <View style={[styles.dayBullet, isPast && styles.dayBulletPast]}>
          <Text style={styles.dayBulletText}>{day.dayNumber}</Text>
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <Card style={styles.dayCard}>
        <Text style={styles.dayDate}>{formatDate(dateObj)}</Text>
        {day.callTimeUserId ? (
          <Text style={styles.dayMeta}>Call time assigned</Text>
        ) : (
          <Text style={styles.dayMetaMuted}>Call time not set</Text>
        )}
        {day.location ? <Text style={styles.dayLoc}>{day.location}</Text> : null}
        {day.scenes && day.scenes.length > 0 ? (
          <Text style={styles.daySceneCount}>
            {day.scenes.length} scene{day.scenes.length === 1 ? '' : 's'} scheduled
          </Text>
        ) : null}
        {day.notes ? <Text style={styles.dayNotes}>{day.notes}</Text> : null}
        <Pressable onPress={onRemove} hitSlop={8} disabled={removing}>
          <Text style={styles.dayDelete}>{removing ? 'Removing…' : 'Remove'}</Text>
        </Pressable>
      </Card>
    </View>
  );
}

function AgendaRow({ day, onRemove }: { day: ShootDay; onRemove: () => void }) {
  const dateObj = new Date(day.date);
  const isPast = dateObj < new Date();
  return (
    <Pressable onLongPress={onRemove} style={({ pressed }) => [pressed && styles.rowPressed]}>
      <Card style={styles.agendaCard} padded={false}>
        <View style={[styles.agendaRail, isPast && styles.agendaRailPast]} />
        <View style={[styles.dayBullet, styles.agendaBullet, isPast && styles.dayBulletPast]}>
          <Text style={styles.dayBulletText}>{day.dayNumber}</Text>
        </View>
        <View style={styles.agendaBody}>
          <Text style={styles.agendaDate}>{formatDate(dateObj)}</Text>
          <Text style={styles.agendaMeta} numberOfLines={1}>
            {day.location ?? 'Location TBD'}
            {day.callTimeUserId ? ' · Call set' : ''}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.textSecondary, flex: 1, marginRight: spacing.md },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  segment: { marginBottom: spacing.md },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    backgroundColor: colors.surfaceMuted,
  },
  conflictText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  emptyActions: { gap: spacing.sm, alignItems: 'center' },
  secondaryLink: { ...typography.bodyStrong, color: colors.textSecondary },
  rowPressed: { opacity: 0.85 },
  timeline: { marginTop: spacing.xs, paddingBottom: spacing.xxl },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineGutter: { width: 36, alignItems: 'center' },
  dayBullet: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBulletPast: { backgroundColor: colors.surfaceMuted },
  dayBulletText: { color: colors.accentInk, fontSize: 12, fontWeight: '700' },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  dayCard: { flex: 1, marginLeft: spacing.sm, marginBottom: spacing.md, gap: spacing.xs },
  dayDate: { ...typography.bodyStrong, color: colors.textPrimary },
  dayMeta: { ...typography.caption, color: colors.accent },
  dayMetaMuted: { ...typography.caption, color: colors.textMuted },
  dayLoc: { ...typography.body, color: colors.textSecondary },
  daySceneCount: { ...typography.caption, color: colors.textMuted },
  dayNotes: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  dayDelete: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  agenda: { gap: spacing.sm, paddingBottom: spacing.xxl },
  agendaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
    overflow: 'hidden',
  },
  agendaRail: { width: 4, alignSelf: 'stretch', backgroundColor: colors.accent },
  agendaRailPast: { backgroundColor: colors.surfaceMuted },
  agendaBullet: { marginLeft: spacing.sm },
  agendaBody: { flex: 1, gap: 2 },
  agendaDate: { ...typography.bodyStrong, color: colors.textPrimary },
  agendaMeta: { ...typography.caption, color: colors.textSecondary },
});
