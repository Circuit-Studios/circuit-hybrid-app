// Department progress weights DONE at 100% and IN_PROGRESS at 50% so active work
// shows up on the readiness dashboard before tasks are fully closed.
// Recomputed whenever a task's status changes. Cheap enough to do inline; if
// task volumes ever grow past ~50k per project we'd move this into a queued
// job and only recompute the affected departments at most once every few s.

import { prisma } from '../../lib/prisma.js';

export interface TaskProgressBucket {
  todo: number;
  inProgress: number;
  done: number;
  blocked: number;
}

export function computeProgressFromTasks(tasks: TaskProgressBucket): number {
  const total = tasks.todo + tasks.inProgress + tasks.done + tasks.blocked;
  if (total === 0) return 0;
  const weighted = tasks.done + tasks.inProgress * 0.5;
  return Math.min(100, Math.max(0, Math.round((weighted / total) * 100)));
}

export async function recomputeDepartmentProgress(departmentId: string): Promise<number> {
  const grouped = await prisma.task.groupBy({
    by: ['status'],
    where: { departmentId },
    _count: true,
  });

  const tasks: TaskProgressBucket = { todo: 0, inProgress: 0, done: 0, blocked: 0 };
  for (const row of grouped) {
    switch (row.status) {
      case 'TODO':
        tasks.todo += row._count;
        break;
      case 'IN_PROGRESS':
        tasks.inProgress += row._count;
        break;
      case 'DONE':
        tasks.done += row._count;
        break;
      case 'BLOCKED':
        tasks.blocked += row._count;
        break;
    }
  }

  const progress = computeProgressFromTasks(tasks);

  await prisma.projectDepartment.update({
    where: { id: departmentId },
    data: { progress },
  });

  return progress;
}
