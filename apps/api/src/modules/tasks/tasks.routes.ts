import { Router } from 'express';
import { z } from 'zod';
import { MembershipStatus, TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/require-feature.js';
import {
  assertDeptHeadDepartmentScope,
  can,
  getActiveMembership,
  isTaskManager,
} from '../../auth/permissions.js';
import { recomputeDepartmentProgress } from '../workspace/progress.service.js';
import { emitToProject } from '../../realtime/socket.js';
import { dispatchNotification } from '../../notifications/notifications.service.js';

const router: Router = Router();

// Roles allowed to create or assign tasks. Crew can move their own tasks
// (handled below as a separate check) but can't create or reassign.
// Permission map lives in auth/permissions.ts — local aliases kept for readability.

async function getMembershipOrThrow(userId: string, projectId: string) {
  const m = await getActiveMembership(userId, projectId);
  if (!m) throw forbidden('You are not a member of this project');
  return m;
}

const createTaskSchema = z.object({
  departmentId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.coerce.date().optional(),
  assigneeUserId: z.string().uuid().optional(),
  characterId: z.string().uuid().optional(),
  sceneId: z.string().uuid().optional(),
  shootDayId: z.string().uuid().optional(),
});

// POST /projects/:projectId/tasks
router.post(
  '/projects/:projectId/tasks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const me = await getMembershipOrThrow(userId, projectId);

    if (!can(me.role, 'tasks.create')) {
      throw forbidden(`Role ${me.role} cannot create tasks`);
    }

    const input = createTaskSchema.parse(req.body);

    const dept = await prisma.projectDepartment.findUnique({
      where: { id: input.departmentId },
    });
    if (!dept || dept.projectId !== projectId) {
      throw badRequest('Department does not belong to this project');
    }

    if (me.role === UserRole.DEPT_HEAD && me.projectDepartmentId !== dept.id) {
      throw forbidden('Department heads can only create tasks in their own department');
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        departmentId: input.departmentId,
        title: input.title,
        description: input.description,
        status: input.status ?? TaskStatus.TODO,
        priority: input.priority ?? TaskPriority.MEDIUM,
        dueDate: input.dueDate,
        assigneeUserId: input.assigneeUserId,
        characterId: input.characterId,
        sceneId: input.sceneId,
        shootDayId: input.shootDayId,
      },
    });

    await recomputeDepartmentProgress(input.departmentId);
    emitToProject(projectId, 'task.created', { taskId: task.id, departmentId: dept.id });

    if (task.assigneeUserId && task.assigneeUserId !== userId) {
      void dispatchNotification({
        userIds: [task.assigneeUserId],
        kind: 'TASK_ASSIGNED',
        title: `New task: ${task.title}`,
        body: `Assigned to you in ${dept.displayName}.`,
        projectId,
        deepLink: `/project/${projectId}/tasks`,
        context: { taskId: task.id, departmentId: dept.id, priority: task.priority },
      });
    }

    res.status(201).json(task);
  }),
);

const patchTaskSchema = createTaskSchema.partial().extend({
  status: z.nativeEnum(TaskStatus).optional(),
});

// PATCH /tasks/:taskId
router.patch(
  '/tasks/:taskId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const taskId = req.params.taskId!;
    const userId = req.user!.sub;

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { department: true },
    });
    if (!existing) throw notFound('Task not found');

    const me = await getMembershipOrThrow(userId, existing.projectId);
    const input = patchTaskSchema.parse(req.body);

    // Permission model:
    //   - Manager roles: can change anything.
    //   - Assignee: can move status (TODO -> IN_PROGRESS -> DONE/BLOCKED only)
    //     but can't reassign or rewrite the title.
    const isManager = isTaskManager(me.role);
    const isAssignee = existing.assigneeUserId === userId;

    if (!isManager) {
      if (!isAssignee) throw forbidden('Only managers or the assignee can edit this task');
      if (!can(me.role, 'tasks.updateStatus')) {
        throw forbidden('Your role cannot update task status');
      }
      const allowedKeys: Array<keyof typeof input> = ['status'];
      const restricted = Object.keys(input).filter(
        (k) => !allowedKeys.includes(k as keyof typeof input),
      );
      if (restricted.length > 0) {
        throw forbidden(`Cannot modify fields: ${restricted.join(', ')} as an assignee`);
      }
    }

    if (me.role === UserRole.DEPT_HEAD) {
      assertDeptHeadDepartmentScope(me, existing.departmentId);
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(input.title != null && { title: input.title }),
        ...(input.description != null && { description: input.description }),
        ...(input.status != null && { status: input.status }),
        ...(input.priority != null && { priority: input.priority }),
        ...(input.dueDate != null && { dueDate: input.dueDate }),
        ...(input.assigneeUserId != null && { assigneeUserId: input.assigneeUserId }),
        ...(input.departmentId != null && { departmentId: input.departmentId }),
        ...(input.characterId != null && { characterId: input.characterId }),
        ...(input.sceneId != null && { sceneId: input.sceneId }),
        ...(input.shootDayId != null && { shootDayId: input.shootDayId }),
      },
    });

    // Status changes recompute progress; if the department moved, we need
    // to recompute both old and new departments.
    const deptsToRecompute = new Set<string>();
    if (input.status != null) deptsToRecompute.add(updated.departmentId);
    if (input.departmentId != null && input.departmentId !== existing.departmentId) {
      deptsToRecompute.add(existing.departmentId);
      deptsToRecompute.add(input.departmentId);
    }
    await Promise.all([...deptsToRecompute].map((id) => recomputeDepartmentProgress(id)));

    emitToProject(existing.projectId, 'task.updated', {
      taskId: updated.id,
      departmentId: updated.departmentId,
      status: updated.status,
    });

    // Reassignment: notify the new assignee (unless they're the one editing).
    const reassigned =
      input.assigneeUserId != null &&
      input.assigneeUserId !== existing.assigneeUserId &&
      input.assigneeUserId !== userId;
    if (reassigned) {
      const dept = await prisma.projectDepartment.findUnique({
        where: { id: updated.departmentId },
        select: { displayName: true },
      });
      void dispatchNotification({
        userIds: [input.assigneeUserId!],
        kind: 'TASK_ASSIGNED',
        title: `Task assigned to you: ${updated.title}`,
        body: dept ? `In ${dept.displayName}.` : 'You picked up a new task.',
        projectId: existing.projectId,
        deepLink: `/project/${existing.projectId}/tasks`,
        context: {
          taskId: updated.id,
          departmentId: updated.departmentId,
          priority: updated.priority,
        },
      });
    }

    res.json(updated);
  }),
);

// DELETE /tasks/:taskId
router.delete(
  '/tasks/:taskId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const taskId = req.params.taskId!;
    const userId = req.user!.sub;

    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) throw notFound('Task not found');

    const me = await getMembershipOrThrow(userId, existing.projectId);
    if (!can(me.role, 'tasks.delete')) {
      throw forbidden('Only managers can delete tasks');
    }
    if (me.role === UserRole.DEPT_HEAD) {
      assertDeptHeadDepartmentScope(me, existing.departmentId);
    }

    await prisma.task.delete({ where: { id: taskId } });
    await recomputeDepartmentProgress(existing.departmentId);
    emitToProject(existing.projectId, 'task.deleted', {
      taskId: existing.id,
      departmentId: existing.departmentId,
    });

    res.status(204).end();
  }),
);

// GET /me/tasks — tasks assigned to the signed-in user across every project
// they're an active member of. Powers the global "Tasks" tab (cross-project
// "my work" / Spider mode), as opposed to a single project's department board.
router.get(
  '/me/tasks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const status = req.query.status as TaskStatus | undefined;

    const memberships = await prisma.projectMember.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);
    if (projectIds.length === 0) {
      res.json([]);
      return;
    }

    const tasks = await prisma.task.findMany({
      where: {
        assigneeUserId: userId,
        projectId: { in: projectIds },
        ...(status ? { status } : {}),
      },
      include: {
        department: { select: { id: true, displayName: true, kind: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    res.json(tasks);
  }),
);

export default router;
