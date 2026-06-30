import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyState } from '@/components/EmptyState';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ProjectHeaderAction, projectScreenStyles } from '@/components/project/ProjectScreenScaffold';
import { readApiError } from '@/api/client';
import { useProjectHealth, useProjectTasks } from '@/features/tasks/hooks';
import { TaskSheet } from '@/features/tasks/TaskSheet';
import { TaskListItem } from '@/features/tasks/TaskListItem';
import {
  countActiveTasks,
  KANBAN_COLUMNS,
  matchesTaskStatusView,
  sortTasksByUrgency,
  TASK_STATUS_VIEWS,
  type TaskStatusView,
} from '@/features/tasks/taskBoardUtils';
import { GlassFilterChip } from '@/components/GlassFilterChip';
import { useContentFrame } from '@/hooks/useContentFrame';
import { colors, radius, spacing, taskStatusMeta, typography } from '@/theme';
import { fontFamily } from '@/theme/fonts';
import type { DepartmentSummary, Task, TaskStatus } from '@/api/types';

export interface ProjectTasksContentProps {
  projectId: string;
  /** Pre-selected department filter (e.g. from a deep link). */
  initialDept?: string | null;
}

/**
 * Department-grouped task board for a single project.
 */
export function ProjectTasksContent({ projectId, initialDept = null }: ProjectTasksContentProps) {
  const { isWide } = useContentFrame('auto');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterDept, setFilterDept] = useState<string | null>(null);
  const [statusView, setStatusView] = useState<TaskStatusView>('ALL');

  const healthQ = useProjectHealth(projectId);
  const departments = healthQ.data?.departments ?? [];
  const nextShootDay = healthQ.data?.nextShootDay ?? null;
  const deptFromLink =
    initialDept && departments.some((d) => d.id === initialDept) ? initialDept : null;
  const activeDeptFilter = filterDept ?? deptFromLink;

  const { data: tasks = [], isLoading, error, refetch } = useProjectTasks(projectId, activeDeptFilter);

  const visibleTasks = useMemo(
    () => sortTasksByUrgency(tasks.filter((t) => matchesTaskStatusView(statusView, t.status))),
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
  const activeCount = countActiveTasks(tasks);

  return (
    <>
      <View style={styles.toolbar}>
        <ProjectHeaderAction
          label="+ Add task"
          onPress={() => setCreateOpen(true)}
          disabled={departments.length === 0}
        />
      </View>

      <SegmentedControl
        options={TASK_STATUS_VIEWS.map((o) => (o.value === 'ACTIVE' ? { ...o, badge: activeCount } : o))}
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
            statusView === 'DONE' ? 'No completed tasks yet.' : 'No active tasks match your filters.'
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

      <TaskSheet
        visible={createOpen || !!editTask}
        onClose={() => {
          setCreateOpen(false);
          setEditTask(null);
        }}
        projectId={projectId}
        departments={departments}
        editing={editTask}
        defaultDepartmentId={activeDeptFilter}
      />
    </>
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

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.md },
  segment: { marginBottom: spacing.md },
  filterRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  sections: { gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  deptHeader: { gap: spacing.xs, marginTop: spacing.xs },
  deptHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deptName: { ...typography.micro, color: colors.textSecondary },
  deptNameFocused: { color: colors.brandStrong },
  deptCount: { ...typography.caption, fontFamily: fontFamily.semibold, color: colors.textMuted },
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
});
