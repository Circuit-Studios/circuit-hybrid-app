import type { SegmentOption } from '@/components/SegmentedControl';
import type { Task, TaskPriority, TaskStatus } from '@/api/types';

export type TaskStatusView = 'ALL' | 'ACTIVE' | 'DONE';

export const TASK_STATUS_VIEWS: SegmentOption<TaskStatusView>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DONE', label: 'Done' },
];

export const KANBAN_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

const ACTIVE_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED'];
const STATUS_SORT_ORDER: TaskStatus[] = ['BLOCKED', 'IN_PROGRESS', 'TODO', 'DONE'];
const PRIORITY_SORT_ORDER: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export function matchesTaskStatusView(view: TaskStatusView, status: TaskStatus): boolean {
  if (view === 'ALL') return true;
  if (view === 'DONE') return status === 'DONE';
  return ACTIVE_STATUSES.includes(status);
}

export function sortTasksByUrgency<T extends Pick<Task, 'status' | 'priority' | 'dueDate' | 'title'>>(
  list: T[],
): T[] {
  return [...list].sort((a, b) => {
    const statusDiff = STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    const prioDiff = PRIORITY_SORT_ORDER.indexOf(a.priority) - PRIORITY_SORT_ORDER.indexOf(b.priority);
    if (prioDiff !== 0) return prioDiff;
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return a.title.localeCompare(b.title);
  });
}

export function countActiveTasks<T extends Pick<Task, 'status'>>(tasks: T[]): number {
  return tasks.filter((t) => t.status !== 'DONE').length;
}

export function taskDueLabel(
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
