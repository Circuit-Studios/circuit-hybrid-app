import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
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
import { colors, priorityMeta, radius, spacing, taskStatusMeta, typography } from '@/theme';
import type { DepartmentSummary, Task, TaskStatus } from '@/api/types';

type StatusView = 'ALL' | 'ACTIVE' | 'DONE';

const STATUS_VIEWS: SegmentOption<StatusView>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DONE', label: 'Done' },
];

const ACTIVE_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED'];
const KANBAN_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

function matchesStatusView(view: StatusView, status: TaskStatus): boolean {
  if (view === 'ALL') return true;
  if (view === 'DONE') return status === 'DONE';
  return ACTIVE_STATUSES.includes(status);
}

function sortTasks(list: Task[]): Task[] {
  const statusOrder: TaskStatus[] = ['BLOCKED', 'IN_PROGRESS', 'TODO', 'DONE'];
  const priorityOrder = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  return [...list].sort((a, b) => {
    const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    const prioDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    if (prioDiff !== 0) return prioDiff;
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return a.title.localeCompare(b.title);
  });
}

export default function TasksScreen() {
  const { id: projectId, dept: deptParam } = useLocalSearchParams<{ id: string; dept?: string }>();
  const { isWide } = useContentFrame('auto');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterDept, setFilterDept] = useState<string | null>(null);
  const [statusView, setStatusView] = useState<StatusView>('ALL');

  const pid = projectId ?? '';
  const healthQ = useProjectHealth(pid);
  const departments = healthQ.data?.departments ?? [];
  const nextShootDay = healthQ.data?.nextShootDay ?? null;
  const deptFromLink = deptParam && departments.some((d) => d.id === deptParam) ? deptParam : null;
  const activeDeptFilter = filterDept ?? deptFromLink;

  const { data: tasks = [], isLoading, error, refetch } = useProjectTasks(pid, activeDeptFilter);

  const visibleTasks = useMemo(
    () => sortTasks(tasks.filter((t) => matchesStatusView(statusView, t.status))),
    [statusView, tasks],
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
    };
    for (const task of tasks) grouped[task.status].push(task);
    return grouped;
  }, [tasks]);

  // Department-grouped sections (the primary lens), ordered to match health.
  const sections = useMemo(() => {
    const deptOrder = new Map(departments.map((d, i) => [d.id, i]));
    const byDept = new Map<string, Task[]>();
    for (const task of visibleTasks) {
      const key = task.departmentId;
      const list = byDept.get(key);
      if (list) list.push(task);
      else byDept.set(key, [task]);
    }
    return Array.from(byDept.entries())
      .map(([deptId, deptTasks]) => {
        const summary = departments.find((d) => d.id === deptId);
        const name = summary?.displayName ?? deptTasks[0]?.department?.displayName ?? 'Unassigned';
        return { deptId, name, summary, tasks: deptTasks };
      })
      .sort((a, b) => (deptOrder.get(a.deptId) ?? 999) - (deptOrder.get(b.deptId) ?? 999));
  }, [visibleTasks, departments]);

  const showKanban = isWide && statusView === 'ALL';
  const activeCount = tasks.filter((t) => t.status !== 'DONE').length;

  return (
    <ProjectScreenScaffold
      projectId={pid}
      activeTab="tasks"
      title="Tasks"
      scroll
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
      <SegmentedControl
        options={STATUS_VIEWS.map((o) => (o.value === 'ACTIVE' ? { ...o, badge: activeCount } : o))}
        value={statusView}
        onChange={setStatusView}
        style={styles.segment}
      />

      {departments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <GlassFilterChip
            label="All depts"
            active={activeDeptFilter == null}
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
                <Text style={styles.kanbanColTitle}>{taskStatusMeta[status].label}</Text>
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
          title="Nothing here"
          body={
            statusView === 'DONE'
              ? 'No completed tasks yet.'
              : 'No active tasks match your filters.'
          }
          action={<PrimaryButton title="Show all tasks" onPress={() => setStatusView('ALL')} />}
        />
      ) : (
        <View style={styles.sections}>
          {sections.map((section) => (
            <View key={section.deptId} style={styles.section}>
              <DepartmentHeader
                name={section.name}
                summary={section.summary}
                focused={activeDeptFilter === section.deptId}
                onPress={() =>
                  setFilterDept((cur) =>
                    (cur ?? deptFromLink) === section.deptId ? null : section.deptId,
                  )
                }
              />
              <View style={styles.list}>
                {section.tasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    nextShootDay={nextShootDay}
                    onPress={() => setEditTask(task)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ProjectScreenScaffold>
  );
}

function DepartmentHeader({
  name,
  summary,
  focused,
  onPress,
}: {
  name: string;
  summary?: DepartmentSummary;
  focused: boolean;
  onPress: () => void;
}) {
  const done = summary?.tasks.done ?? 0;
  const total = summary
    ? summary.tasks.done + summary.tasks.todo + summary.tasks.inProgress + summary.tasks.blocked
    : 0;
  const progress = summary ? Math.round((summary.progress ?? 0) * 100) : 0;
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.deptHeader}>
      <View style={styles.deptHeaderRow}>
        <Text style={[styles.deptName, focused && styles.deptNameFocused]}>
          {name}
          {focused ? '  •  filtered' : ''}
        </Text>
        {total > 0 ? (
          <Text style={styles.deptCount}>
            {done}/{total}
          </Text>
        ) : null}
      </View>
      {total > 0 ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      ) : null}
    </Pressable>
  );
}

function dueLabel(
  dueDate: string | null,
  nextShootDay?: { date: string; dayNumber: number } | null,
): { text: string; urgent: boolean } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const base = `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const overdue = due.getTime() < Date.now();
  if (nextShootDay && due.getTime() <= new Date(nextShootDay.date).getTime()) {
    return { text: `${base} · before Day ${nextShootDay.dayNumber}`, urgent: true };
  }
  return { text: base, urgent: overdue };
}

function TaskListItem({
  task,
  onPress,
  nextShootDay,
}: {
  task: Task;
  onPress: () => void;
  nextShootDay?: { date: string; dayNumber: number } | null;
}) {
  const prio = priorityMeta[task.priority];
  const status = taskStatusMeta[task.status];
  const due = dueLabel(task.dueDate, nextShootDay);
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
  segment: { marginBottom: spacing.md },
  filterRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  sections: { gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  deptHeader: { gap: spacing.xs, marginTop: spacing.xs },
  deptHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deptName: { ...typography.micro, color: colors.textSecondary },
  deptNameFocused: { color: colors.brandStrong },
  deptCount: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  progressTrack: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: radius.pill, backgroundColor: colors.brand },
  kanban: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xl },
  kanbanCol: { width: 280 },
  kanbanColTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  kanbanList: { gap: spacing.sm },
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
