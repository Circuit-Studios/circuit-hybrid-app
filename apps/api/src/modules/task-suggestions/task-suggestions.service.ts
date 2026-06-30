import { DepartmentKind, TaskPriority, TaskSuggestionStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/http.js';
import { canManageSchedule, getActiveMembership } from '../../auth/permissions.js';
import { enqueueConflictScan } from '../../queues/conflicts.queue.js';
import { emitToProject } from '../../realtime/socket.js';

async function assertCanReviewSuggestions(userId: string, projectId: string): Promise<void> {
  const membership = await getActiveMembership(userId, projectId);
  if (!membership) throw forbidden('You are not a member of this project');
  if (!canManageSchedule(membership.role)) {
    throw forbidden('Only leadership can review task suggestions');
  }
}

async function resolveDepartmentId(projectId: string, kind: DepartmentKind): Promise<string> {
  const dept = await prisma.projectDepartment.findUnique({
    where: { projectId_kind: { projectId, kind } },
    select: { id: true },
  });
  if (dept) return dept.id;

  const created = await prisma.projectDepartment.create({
    data: {
      projectId,
      kind,
      displayName: kind.replace(/_/g, ' '),
      required: true,
    },
    select: { id: true },
  });
  return created.id;
}

export async function listTaskSuggestions(projectId: string, status?: TaskSuggestionStatus) {
  return prisma.taskSuggestion.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function approveTaskSuggestion(suggestionId: string, userId: string) {
  const suggestion = await prisma.taskSuggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) throw notFound('Task suggestion not found');
  await assertCanReviewSuggestions(userId, suggestion.projectId);

  if (suggestion.status !== TaskSuggestionStatus.PENDING) {
    throw badRequest(`Suggestion is already ${suggestion.status}`);
  }

  const departmentId = await resolveDepartmentId(suggestion.projectId, suggestion.departmentKind);

  const dueDate =
    suggestion.estimatedDueOffsetDays != null
      ? new Date(Date.now() + suggestion.estimatedDueOffsetDays * 86_400_000)
      : undefined;

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        projectId: suggestion.projectId,
        departmentId,
        title: suggestion.title,
        description: suggestion.description ?? undefined,
        status: TaskStatus.TODO,
        priority: suggestion.priority as TaskPriority,
        dueDate,
      },
    });

    return tx.taskSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: TaskSuggestionStatus.CONVERTED,
        convertedTaskId: task.id,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      },
    });
  });
}

export async function rejectTaskSuggestion(suggestionId: string, userId: string) {
  const suggestion = await prisma.taskSuggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) throw notFound('Task suggestion not found');
  await assertCanReviewSuggestions(userId, suggestion.projectId);

  if (suggestion.status !== TaskSuggestionStatus.PENDING) {
    throw badRequest(`Suggestion is already ${suggestion.status}`);
  }

  return prisma.taskSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: TaskSuggestionStatus.REJECTED,
      reviewedByUserId: userId,
      reviewedAt: new Date(),
    },
  });
}

export async function bulkApproveTaskSuggestions(projectId: string, userId: string, ids: string[]) {
  await assertCanReviewSuggestions(userId, projectId);
  const results = [];
  for (const id of ids) {
    results.push(await approveTaskSuggestion(id, userId));
  }
  return results;
}

export async function getLatestShootingPlan(projectId: string, scriptId?: string) {
  return prisma.shootingPlan.findFirst({
    where: { projectId, ...(scriptId ? { scriptId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

interface PlannedShootDay {
  dayNumber: number;
  location?: string | null;
  sceneNumbers?: string[];
  sceneSummary?: string | null;
  departmentsNeeded?: string[];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addDays(date: Date, count: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
}

/** Next weekday (Mon–Fri) on or after `from` whose midnight isn't already used. */
function nextFreeWeekday(from: Date, usedDates: Set<number>): Date {
  let cursor = startOfDay(from);
  while (isWeekend(cursor) || usedDates.has(cursor.getTime())) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

function buildShootDayNotes(day: PlannedShootDay): string | undefined {
  const parts: string[] = [];
  if (day.sceneNumbers && day.sceneNumbers.length > 0) {
    parts.push(`Scenes: ${day.sceneNumbers.join(', ')}`);
  }
  if (day.departmentsNeeded && day.departmentsNeeded.length > 0) {
    parts.push(`Departments: ${day.departmentsNeeded.join(', ')}`);
  }
  if (day.sceneSummary) parts.push(day.sceneSummary);
  const text = parts.join('\n').trim();
  return text.length > 0 ? text.slice(0, 2000) : undefined;
}

/**
 * Materialize the latest AI shooting plan into real ShootDay rows so they show
 * up on the Schedule tab. Dates are assigned sequentially on weekdays starting
 * today, skipping any day numbers/dates already on the schedule.
 */
export async function applyShootingPlanToSchedule(
  projectId: string,
  userId: string,
  scriptId?: string,
): Promise<{ created: number; skipped: number }> {
  const membership = await getActiveMembership(userId, projectId);
  if (!membership) throw forbidden('You are not a member of this project');
  if (!canManageSchedule(membership.role)) {
    throw forbidden('Only leadership can apply a plan to the schedule');
  }

  const plan = await getLatestShootingPlan(projectId, scriptId);
  if (!plan) throw notFound('No shooting plan found for this project');

  const planJson = plan.plan as { shootDays?: PlannedShootDay[] } | null;
  const shootDays = Array.isArray(planJson?.shootDays) ? planJson!.shootDays! : [];
  if (shootDays.length === 0) {
    throw badRequest('This shooting plan has no shoot days to apply');
  }

  const existing = await prisma.shootDay.findMany({
    where: { projectId },
    select: { dayNumber: true, date: true },
  });
  const usedDayNumbers = new Set(existing.map((d) => d.dayNumber));
  const usedDates = new Set(existing.map((d) => startOfDay(new Date(d.date)).getTime()));

  // Start after the latest scheduled date if any, otherwise today.
  const latestExisting = existing.reduce<Date | null>((max, d) => {
    const dt = startOfDay(new Date(d.date));
    return max == null || dt > max ? dt : max;
  }, null);
  let cursor = latestExisting ? addDays(latestExisting, 1) : startOfDay(new Date());

  const ordered = [...shootDays].sort((a, b) => a.dayNumber - b.dayNumber);
  const toCreate: Array<{
    projectId: string;
    dayNumber: number;
    date: Date;
    location?: string;
    notes?: string;
  }> = [];

  for (const day of ordered) {
    if (usedDayNumbers.has(day.dayNumber)) continue;
    const date = nextFreeWeekday(cursor, usedDates);
    usedDates.add(date.getTime());
    cursor = addDays(date, 1);
    toCreate.push({
      projectId,
      dayNumber: day.dayNumber,
      date,
      location: day.location ?? undefined,
      notes: buildShootDayNotes(day),
    });
  }

  if (toCreate.length === 0) {
    throw badRequest('All shoot days from this plan are already on the schedule');
  }

  await prisma.shootDay.createMany({ data: toCreate });
  await enqueueConflictScan({ projectId, reason: 'shootingplan.applied' });
  emitToProject(projectId, 'shootday.created', { applied: toCreate.length });

  return { created: toCreate.length, skipped: shootDays.length - toCreate.length };
}
