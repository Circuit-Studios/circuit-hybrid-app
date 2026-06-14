import { Router } from 'express';
import { z } from 'zod';
import { MembershipStatus, TaskPriority, TaskStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { recomputeDepartmentProgress } from '../workspace/progress.service.js';
import { emitToProject } from '../../realtime/socket.js';
import { dispatchNotification } from '../../notifications/notifications.service.js';

const router: Router = Router();

// Roles allowed to create or assign tasks. Crew can move their own tasks
// (handled below as a separate check) but can't create or reassign.
const TASK_MANAGER_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.PRODUCER,
  UserRole.EXECUTIVE_PRODUCER,
  UserRole.LINE_PRODUCER,
  UserRole.AD,
  UserRole.DEPT_HEAD,
];

async function getMembershipOrThrow(userId: string, projectId: string) {
  const m = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: MembershipStatus.ACTIVE },
    select: { id: true, role: true, projectDepartmentId: true },
  });
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

    if (!TASK_MANAGER_ROLES.includes(me.role)) {
      throw forbidden(`Role ${me.role} cannot create tasks`);
    }

    const input = createTaskSchema.parse(req.body);

    const dept = await prisma.projectDepartment.findUnique({
      where: { id: input.departmentId },
    });
    if (!dept || dept.projectId !== projectId) {
      throw badRequest('Department does not belong to this project');
    }

    // Dept heads can only create tasks inside their own department — a soft
    // version of Module 4's role-scoped data view, enforced server-side.
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
    const isManager = TASK_MANAGER_ROLES.includes(me.role);
    const isAssignee = existing.assigneeUserId === userId;

    if (!isManager) {
      if (!isAssignee) throw forbidden('Only managers or the assignee can edit this task');
      const allowedKeys: Array<keyof typeof input> = ['status'];
      const restricted = Object.keys(input).filter(k => !allowedKeys.includes(k as keyof typeof input));
      if (restricted.length > 0) {
        throw forbidden(`Cannot modify fields: ${restricted.join(', ')} as an assignee`);
      }
    }

    if (me.role === UserRole.DEPT_HEAD && me.projectDepartmentId !== existing.departmentId) {
      throw forbidden('Department heads can only edit tasks in their own department');
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
    await Promise.all([...deptsToRecompute].map(id => recomputeDepartmentProgress(id)));

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
        context: { taskId: updated.id, departmentId: updated.departmentId, priority: updated.priority },
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
    if (!TASK_MANAGER_ROLES.includes(me.role)) {
      throw forbidden('Only managers can delete tasks');
    }
    if (me.role === UserRole.DEPT_HEAD && me.projectDepartmentId !== existing.departmentId) {
      throw forbidden('Department heads can only delete tasks in their own department');
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

export default router;
