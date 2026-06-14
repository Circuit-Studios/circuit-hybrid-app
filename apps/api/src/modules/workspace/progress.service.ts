// Department progress = DONE / (TODO+IN_PROGRESS+DONE+BLOCKED) * 100, clamped.
// Recomputed whenever a task's status changes. Cheap enough to do inline; if
// task volumes ever grow past ~50k per project we'd move this into a queued
// job and only recompute the affected departments at most once every few s.

import { prisma } from '../../lib/prisma.js';

export async function recomputeDepartmentProgress(departmentId: string): Promise<number> {
  const grouped = await prisma.task.groupBy({
    by: ['status'],
    where: { departmentId },
    _count: true,
  });

  let total = 0;
  let done = 0;
  for (const row of grouped) {
    total += row._count;
    if (row.status === 'DONE') done += row._count;
  }

  const progress = total === 0 ? 0 : Math.min(100, Math.max(0, Math.round((done / total) * 100)));

  await prisma.projectDepartment.update({
    where: { id: departmentId },
    data: { progress },
  });

  return progress;
}
