import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { taskDueLabel } from '@/features/tasks/taskBoardUtils';
import { colors, priorityMeta, spacing, taskStatusMeta, typography } from '@/theme';
import type { Task } from '@/api/types';

export interface TaskListItemProps {
  task: Pick<Task, 'title' | 'status' | 'priority' | 'dueDate'>;
  onPress: () => void;
  nextShootDay?: { date: string; dayNumber: number } | null;
  /** Shown before priority when grouping by project (cross-project my tasks). */
  departmentLabel?: string | null;
}

export function TaskListItem({ task, onPress, nextShootDay, departmentLabel }: TaskListItemProps) {
  const prio = priorityMeta[task.priority];
  const status = taskStatusMeta[task.status];
  const due = taskDueLabel(task.dueDate, nextShootDay);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.rowPressed]}>
      <Card style={styles.taskCard} padded={false}>
        <View style={[styles.priorityRail, { backgroundColor: prio.color }]} />
        <View style={styles.taskBody}>
          <View style={styles.taskTop}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {task.title}
            </Text>
            <StatusBadge label={status.label} tone={status.tone} />
          </View>
          <View style={styles.taskMeta}>
            {departmentLabel ? (
              <>
                <Text style={styles.taskMetaText}>{departmentLabel}</Text>
                <Text style={styles.metaDivider}>·</Text>
              </>
            ) : null}
            <View style={[styles.prioDot, { backgroundColor: prio.color }]} />
            <Text style={styles.taskMetaText}>{prio.label}</Text>
            {due ? (
              <>
                <Text style={styles.metaDivider}>·</Text>
                <Text style={[styles.taskMetaText, due.urgent && styles.taskMetaUrgent]}>
                  {due.text}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowPressed: { opacity: 0.85 },
  taskCard: { flexDirection: 'row', overflow: 'hidden' },
  priorityRail: { width: 4 },
  taskBody: { flex: 1, gap: spacing.sm, padding: spacing.lg },
  taskTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  taskTitle: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  prioDot: { width: 8, height: 8, borderRadius: 4 },
  taskMetaText: { ...typography.caption, color: colors.textSecondary },
  taskMetaUrgent: { color: colors.danger, fontWeight: '600' },
  metaDivider: { ...typography.caption, color: colors.textMuted },
});
