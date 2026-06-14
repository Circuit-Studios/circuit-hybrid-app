import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import {
  ProjectHeaderAction,
  ProjectScreenScaffold,
  projectScreenStyles,
} from '@/components/project/ProjectScreenScaffold';
import { readApiError } from '@/api/client';
import {
  useMoveTask,
  useProjectHealth,
  useProjectTasks,
} from '@/features/tasks/hooks';
import { TaskSheet } from '@/features/tasks/TaskSheet';
import { useContentFrame } from '@/hooks/useContentFrame';
import { getKanbanColumnWidth, colors, radius, spacing, typography } from '@/theme';
import type { Task, TaskPriority, TaskStatus } from '@/api/types';

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'TODO', label: 'To do' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'BLOCKED', label: 'Blocked' },
  { id: 'DONE', label: 'Done' },
];

export default function TasksScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterDept, setFilterDept] = useState<string | null>(null);

  const pid = projectId ?? '';
  const healthQ = useProjectHealth(pid);
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
  } = useProjectTasks(pid, filterDept);
  const moveTask = useMoveTask(pid);

  const departments = healthQ.data?.departments ?? [];

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], BLOCKED: [], DONE: [] };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  const { contentWidth } = useContentFrame('auto');
  const columnWidth = getKanbanColumnWidth(contentWidth);

  return (
    <ProjectScreenScaffold
      projectId={pid}
      activeTab="tasks"
      title="Tasks"
      backLabel={healthQ.data?.project.name ?? 'Project'}
      trailing={
        <ProjectHeaderAction
          label="+ Add"
          onPress={() => setCreateOpen(true)}
          disabled={departments.length === 0}
        />
      }
      footer={
        <TaskSheet
          visible={createOpen || !!editTask}
          onClose={() => {
            setCreateOpen(false);
            setEditTask(null);
          }}
          projectId={pid}
          departments={departments}
          editing={editTask}
          defaultDepartmentId={filterDept ?? null}
        />
      }
    >
      {departments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip label="All" active={filterDept == null} onPress={() => setFilterDept(null)} />
          {departments.map(d => (
            <FilterChip
              key={d.id}
              label={d.displayName}
              active={filterDept === d.id}
              onPress={() => setFilterDept(d.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {isLoading ? (
        <View style={projectScreenStyles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <EmptyState
          title="Couldn't load tasks"
          body={readApiError(error)}
          action={<PrimaryButton title="Retry" onPress={() => refetch()} />}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          body={
            departments.length === 0
              ? 'Upload your script to auto-create departments — tasks belong to one department each.'
              : 'Add your first task to start tracking pre-production work.'
          }
          action={
            departments.length > 0 ? (
              <PrimaryButton title="Add a task" onPress={() => setCreateOpen(true)} />
            ) : null
          }
        />
      ) : (
        <ScrollView
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.board}
        >
          {COLUMNS.map(col => (
            <View key={col.id} style={[styles.column, { width: columnWidth }]}>
              <View style={styles.columnHead}>
                <Text style={styles.columnTitle}>{col.label}</Text>
                <Text style={styles.columnCount}>{grouped[col.id].length}</Text>
              </View>
              {grouped[col.id].map(task => (
                <Pressable
                  key={task.id}
                  onPress={() => setEditTask(task)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Card style={styles.taskCard}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {task.title}
                    </Text>
                    {task.department ? (
                      <Text style={styles.taskDept}>{task.department.displayName}</Text>
                    ) : null}
                    <View style={styles.taskFooter}>
                      <StatusBadge label={task.priority} tone={priorityTone(task.priority)} />
                      {task.dueDate ? (
                        <Text style={styles.taskDue}>
                          {new Date(task.dueDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.moveRow}>
                      {COLUMNS.filter(c => c.id !== col.id).map(target => (
                        <Pressable
                          key={target.id}
                          onPress={() => moveTask.mutate({ taskId: task.id, status: target.id })}
                          hitSlop={6}
                          style={styles.moveBtn}
                        >
                          <Text style={styles.moveBtnText}>→ {target.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </ProjectScreenScaffold>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function priorityTone(p: TaskPriority): 'neutral' | 'info' | 'warning' | 'danger' {
  switch (p) {
    case 'LOW':
      return 'neutral';
    case 'MEDIUM':
      return 'info';
    case 'HIGH':
      return 'warning';
    case 'URGENT':
      return 'danger';
  }
}

const styles = StyleSheet.create({
  filterRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChipText: { ...typography.bodyStrong, color: colors.textPrimary },
  filterChipTextActive: { color: colors.accentInk },
  board: { paddingVertical: spacing.md, gap: spacing.md },
  column: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  columnHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  columnTitle: { ...typography.heading, color: colors.textPrimary },
  columnCount: { ...typography.caption, color: colors.textMuted },
  taskCard: { gap: spacing.xs, padding: spacing.md },
  taskTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  taskDept: { ...typography.caption, color: colors.textMuted },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  taskDue: { ...typography.caption, color: colors.textSecondary },
  moveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.xs },
  moveBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  moveBtnText: { ...typography.caption, color: colors.textSecondary },
});
