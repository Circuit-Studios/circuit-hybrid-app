import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useProjectHealth, useProjectTasks } from '@/features/tasks/hooks';
import { TaskSheet } from '@/features/tasks/TaskSheet';
import { GlassFilterChip } from '@/components/GlassFilterChip';
import { useContentFrame } from '@/hooks/useContentFrame';
import { colors, radius, spacing, typography } from '@/theme';
import type { Task, TaskPriority, TaskStatus } from '@/api/types';

const STATUS_FILTERS: { id: TaskStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'TODO', label: 'To do' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'BLOCKED', label: 'Blocked' },
  { id: 'DONE', label: 'Done' },
];

const KANBAN_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

const STATUS_TONE: Record<TaskStatus, 'neutral' | 'info' | 'warning' | 'success'> = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  BLOCKED: 'warning',
  DONE: 'success',
};

export default function TasksScreen() {
  const { id: projectId, dept: deptParam } = useLocalSearchParams<{ id: string; dept?: string }>();
  const { isWide } = useContentFrame('auto');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterDept, setFilterDept] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');

  const pid = projectId ?? '';
  const healthQ = useProjectHealth(pid);
  const departments = healthQ.data?.departments ?? [];
  const deptFromLink = deptParam && departments.some((d) => d.id === deptParam) ? deptParam : null;
  const activeDeptFilter = filterDept ?? deptFromLink;

  const { data: tasks = [], isLoading, error, refetch } = useProjectTasks(pid, activeDeptFilter);

  const visibleTasks = useMemo(() => {
    const filtered =
      filterStatus === 'ALL' ? tasks : tasks.filter((task) => task.status === filterStatus);
    return [...filtered].sort((a, b) => {
      const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];
      const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      if (statusDiff !== 0) return statusDiff;
      const priorityOrder: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
      const priorityDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return a.title.localeCompare(b.title);
    });
  }, [filterStatus, tasks]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
    };
    for (const task of tasks) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [tasks]);

  const showKanban = isWide && filterStatus === 'ALL';

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
          defaultDepartmentId={activeDeptFilter}
        />
      }
    >
      {departments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <GlassFilterChip
            label="All depts"
            active={filterDept == null && deptFromLink == null}
            onPress={() => setFilterDept(null)}
          />
          {departments.map((d) => (
            <GlassFilterChip
              key={d.id}
              label={d.displayName}
              active={activeDeptFilter === d.id}
              onPress={() => setFilterDept(d.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {!showKanban ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((item) => (
            <GlassFilterChip
              key={item.id}
              label={item.label}
              active={filterStatus === item.id}
              onPress={() => setFilterStatus(item.id)}
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
      ) : showKanban ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.kanban}>
            {KANBAN_COLUMNS.map((status) => (
              <View key={status} style={styles.kanbanCol}>
                <Text style={styles.kanbanColTitle}>{STATUS_LABEL[status]}</Text>
                <View style={styles.kanbanList}>
                  {tasksByStatus[status].map((task) => (
                    <TaskListItem key={task.id} task={task} onPress={() => setEditTask(task)} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          title="No tasks in this view"
          body={`No ${STATUS_LABEL[filterStatus as TaskStatus].toLowerCase()} tasks match your filters.`}
          action={<PrimaryButton title="Show all tasks" onPress={() => setFilterStatus('ALL')} />}
        />
      ) : (
        <View style={styles.list}>
          {visibleTasks.map((task) => (
            <TaskListItem key={task.id} task={task} onPress={() => setEditTask(task)} />
          ))}
        </View>
      )}
    </ProjectScreenScaffold>
  );
}

function TaskListItem({ task, onPress }: { task: Task; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.rowPressed]}>
      <Card style={styles.taskCard}>
        <View style={styles.taskTop}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.title}
          </Text>
          <StatusBadge label={STATUS_LABEL[task.status]} tone={STATUS_TONE[task.status]} />
        </View>

        {task.description ? (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        <View style={styles.taskMeta}>
          {task.department ? (
            <Text style={styles.taskDept}>{task.department.displayName}</Text>
          ) : null}
          <StatusBadge label={task.priority} tone={priorityTone(task.priority)} />
          {task.dueDate ? (
            <Text style={styles.taskDue}>
              Due{' '}
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          ) : null}
        </View>

        <Text style={styles.taskHint}>Tap to edit or change status</Text>
      </Card>
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
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  kanban: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xl },
  kanbanCol: { width: 280 },
  kanbanColTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  kanbanList: { gap: spacing.sm },
  rowPressed: { opacity: 0.85 },
  taskCard: { gap: spacing.sm, padding: spacing.lg },
  taskTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  taskTitle: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  taskDescription: { ...typography.body, color: colors.textSecondary },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskDept: { ...typography.caption, color: colors.textMuted },
  taskDue: { ...typography.caption, color: colors.textSecondary },
  taskHint: { ...typography.micro, color: colors.textMuted, marginTop: spacing.xs },
});
