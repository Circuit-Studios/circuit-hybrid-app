import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { readApiError } from '@/api/client';
import { useMyTasks } from '@/features/tasks/hooks';
import { TaskListItem } from '@/features/tasks/TaskListItem';
import {
  countActiveTasks,
  matchesTaskStatusView,
  sortTasksByUrgency,
  TASK_STATUS_VIEWS,
  type TaskStatusView,
} from '@/features/tasks/taskBoardUtils';
import { colors, spacing, typography } from '@/theme';

/**
 * Cross-project "my work" board: every task assigned to the signed-in user,
 * grouped by film. Tapping a task jumps to that project's task board.
 */
export function MyTasksContent() {
  const router = useRouter();
  const [statusView, setStatusView] = useState<TaskStatusView>('ACTIVE');
  const { data: tasks = [], isLoading, error, refetch } = useMyTasks();

  const visibleTasks = useMemo(
    () => sortTasksByUrgency(tasks.filter((t) => matchesTaskStatusView(statusView, t.status))),
    [statusView, tasks],
  );

  const activeCount = countActiveTasks(tasks);

  const sections = useMemo(() => {
    const byProject = new Map<string, { name: string; tasks: typeof visibleTasks }>();
    for (const task of visibleTasks) {
      const bucket = byProject.get(task.project.id);
      if (bucket) bucket.tasks.push(task);
      else byProject.set(task.project.id, { name: task.project.name, tasks: [task] });
    }
    return Array.from(byProject.entries()).map(([projectId, value]) => ({ projectId, ...value }));
  }, [visibleTasks]);

  if (isLoading) return <LoadingState />;

  if (error) {
    return (
      <EmptyState
        title="Couldn't load your tasks"
        body={readApiError(error)}
        action={<Button title="Retry" onPress={() => refetch()} />}
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks assigned to you"
        body="When a teammate assigns you a task in any production, it shows up here."
      />
    );
  }

  return (
    <View style={styles.flex}>
      <SegmentedControl
        options={TASK_STATUS_VIEWS.map((o) => (o.value === 'ACTIVE' ? { ...o, badge: activeCount } : o))}
        value={statusView}
        onChange={setStatusView}
        style={styles.segment}
      />

      {visibleTasks.length === 0 ? (
        <EmptyState
          title="Nothing here"
          body={statusView === 'DONE' ? 'No completed tasks yet.' : 'No active tasks right now.'}
          action={<Button title="Show all tasks" onPress={() => setStatusView('ALL')} />}
        />
      ) : (
        <View style={styles.sections}>
          {sections.map((section) => (
            <View key={section.projectId} style={styles.section}>
              <Pressable
                style={styles.sectionHead}
                onPress={() => router.push(`/(app)/project/${section.projectId}/tasks`)}
                hitSlop={6}
              >
                <Ionicons name="film-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.sectionName} numberOfLines={1}>
                  {section.name}
                </Text>
                <Text style={styles.sectionCount}>{section.tasks.length}</Text>
                <Text style={styles.sectionChevron}>›</Text>
              </Pressable>
              <View style={styles.list}>
                {section.tasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    departmentLabel={task.department?.displayName}
                    onPress={() => router.push(`/(app)/project/${task.project.id}/tasks`)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  segment: { marginBottom: spacing.lg },
  sections: { gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionName: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  sectionCount: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  sectionChevron: { ...typography.bodyStrong, color: colors.textMuted, marginLeft: 'auto' },
  list: { gap: spacing.sm },
});
