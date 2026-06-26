import { DepartmentKind, TaskPriority, TaskSuggestionStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../lib/http.js';
import { canManageSchedule, getActiveMembership } from '../../auth/permissions.js';

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
