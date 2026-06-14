import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import {
  ProjectHeaderAction,
  ProjectScreenScaffold,
  projectScreenStyles,
} from '@/components/project/ProjectScreenScaffold';
import { ShootDaySheet } from '@/features/schedule/ShootDaySheet';
import { listShootDays, deleteShootDay } from '@/api/workspace';
import { qk } from '@/api/queryKeys';
import { readApiError } from '@/api/client';
import { colors, spacing, typography } from '@/theme';

export default function ScheduleScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const pid = projectId ?? '';

  const [sheetOpen, setSheetOpen] = useState(false);

  const scheduleQ = useQuery({
    queryKey: qk.schedule(pid),
    queryFn: () => listShootDays(pid),
    enabled: Boolean(pid),
  });

  const days = scheduleQ.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShootDay(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.schedule(pid) });
      void qc.invalidateQueries({ queryKey: qk.health(pid) });
      void qc.invalidateQueries({ queryKey: qk.conflicts(pid) });
    },
  });

  return (
    <ProjectScreenScaffold
      projectId={pid}
      activeTab="schedule"
      title="Schedule"
      scroll
      trailing={<ProjectHeaderAction label="+ Day" onPress={() => setSheetOpen(true)} />}
      subtitle={
        <Text style={styles.body}>
          Add shoot days here — the conflict scanner watches for cross-project clashes and missing
          stunt/VFX prep automatically.
        </Text>
      }
      footer={
        <ShootDaySheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          projectId={pid}
          existingDays={days.map(d => d.dayNumber)}
        />
      }
    >
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
          title="No shoot days yet"
          body="Lock down your first shoot day to enable conflict detection and call-time tracking."
          action={<PrimaryButton title="Add shoot day" onPress={() => setSheetOpen(true)} />}
        />
      ) : (
        <View style={styles.timeline}>
          {days.map((day, idx) => {
            const dateObj = new Date(day.date);
            const isPast = dateObj < new Date();
            const isLast = idx === days.length - 1;
            return (
              <View key={day.id} style={styles.timelineRow}>
                <View style={styles.timelineGutter}>
                  <View style={[styles.dayBullet, isPast && styles.dayBulletPast]}>
                    <Text style={styles.dayBulletText}>{day.dayNumber}</Text>
                  </View>
                  {!isLast ? <View style={styles.timelineLine} /> : null}
                </View>
                <Card style={styles.dayCard}>
                  <Text style={styles.dayDate}>
                    {dateObj.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  {day.location ? <Text style={styles.dayLoc}>{day.location}</Text> : null}
                  {day.scenes && day.scenes.length > 0 ? (
                    <Text style={styles.daySceneCount}>
                      {day.scenes.length} scene{day.scenes.length === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                  {day.notes ? <Text style={styles.dayNotes}>{day.notes}</Text> : null}
                  <Pressable
                    onPress={() => deleteMutation.mutate(day.id)}
                    hitSlop={8}
                    disabled={deleteMutation.isPending}
                  >
                    <Text style={styles.dayDelete}>
                      {deleteMutation.isPending ? 'Removing…' : 'Remove'}
                    </Text>
                  </Pressable>
                </Card>
              </View>
            );
          })}
        </View>
      )}
    </ProjectScreenScaffold>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  timeline: { marginTop: spacing.md, paddingBottom: spacing.xxl },
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
  dayLoc: { ...typography.body, color: colors.textSecondary },
  daySceneCount: { ...typography.caption, color: colors.textMuted },
  dayNotes: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  dayDelete: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
});
