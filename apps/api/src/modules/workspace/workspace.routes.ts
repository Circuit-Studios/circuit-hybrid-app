import { Router } from 'express';
import { MembershipStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { hasFullProjectVisibility } from '../../auth/permissions.js';
import { computeProgressFromTasks } from './progress.service.js';

const router: Router = Router();

interface Membership {
  id: string;
  role: UserRole;
  projectDepartmentId: string | null;
}

async function getMembershipOrThrow(userId: string, projectId: string): Promise<Membership> {
  const m = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: MembershipStatus.ACTIVE },
    select: { id: true, role: true, projectDepartmentId: true },
  });
  if (!m) throw forbidden('You are not a member of this project');
  return m;
}

// Spider mode: dept heads see *only* their department's work surface — this
// matches Module 4 "role-scoped data view". Leadership roles get everything.
function isDeptScoped(m: Membership): boolean {
  return m.role === UserRole.DEPT_HEAD && !!m.projectDepartmentId;
}

// GET /projects/:projectId/health
//   Aggregates per-department progress, open task counts, conflict alerts and
//   the next upcoming shoot day. Powers the Health Ring on the workspace
//   dashboard. Kept as a single read so the dashboard can fetch in one call.
router.get(
  '/projects/:projectId/health',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const me = await getMembershipOrThrow(userId, projectId);
    const deptScope = isDeptScoped(me) ? me.projectDepartmentId! : null;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        currentStage: true,
        shootStartDate: true,
        shootEndDate: true,
      },
    });
    if (!project) throw notFound('Project not found');

    const [departments, taskAgg, openConflicts, nextShootDay] = await Promise.all([
      prisma.projectDepartment.findMany({
        where: { projectId, ...(deptScope ? { id: deptScope } : {}) },
        select: { id: true, kind: true, displayName: true, required: true, progress: true },
        orderBy: { displayName: 'asc' },
      }),
      prisma.task.groupBy({
        by: ['departmentId', 'status'],
        where: { projectId, ...(deptScope ? { departmentId: deptScope } : {}) },
        _count: true,
      }),
      prisma.conflictAlert.count({
        where: {
          projectId,
          resolved: false,
          ...(deptScope
            ? {
                OR: [
                  { contextJson: { path: ['departmentId'], equals: deptScope } },
                  { kind: 'SCHEDULE_CLASH' },
                ],
              }
            : {}),
        },
      }),
      prisma.shootDay.findFirst({
        where: { projectId, date: { gte: new Date() } },
        orderBy: { date: 'asc' },
        select: { id: true, dayNumber: true, date: true, location: true },
      }),
    ]);

    // Fold the groupBy result into a per-department task count map.
    const tasksByDept = new Map<
      string,
      { todo: number; inProgress: number; done: number; blocked: number }
    >();
    for (const row of taskAgg) {
      const bucket = tasksByDept.get(row.departmentId) ?? {
        todo: 0,
        inProgress: 0,
        done: 0,
        blocked: 0,
      };
      switch (row.status) {
        case 'TODO':
          bucket.todo += row._count;
          break;
        case 'IN_PROGRESS':
          bucket.inProgress += row._count;
          break;
        case 'DONE':
          bucket.done += row._count;
          break;
        case 'BLOCKED':
          bucket.blocked += row._count;
          break;
      }
      tasksByDept.set(row.departmentId, bucket);
    }

    const segments = departments.map((d) => {
      const tasks = tasksByDept.get(d.id) ?? { todo: 0, inProgress: 0, done: 0, blocked: 0 };
      return {
        ...d,
        progress: computeProgressFromTasks(tasks),
        tasks,
      };
    });

    // Weighted average across required departments only — optional depts
    // (like POST_DI in early pre-prod) shouldn't drag the headline number
    // down before they've started.
    const required = segments.filter((s) => s.required);
    const overallProgress = required.length
      ? Math.round(required.reduce((sum, s) => sum + s.progress, 0) / required.length)
      : 0;

    res.json({
      project,
      overallProgress,
      departments: segments,
      openConflicts,
      nextShootDay,
    });
  }),
);

// GET /projects/:projectId/tasks?status=TODO&departmentId=...
router.get(
  '/projects/:projectId/tasks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const me = await getMembershipOrThrow(userId, projectId);
    const deptScope = isDeptScoped(me) ? me.projectDepartmentId! : null;

    const status = req.query.status as string | undefined;
    const departmentId = req.query.departmentId as string | undefined;
    const assigneeUserId = req.query.assigneeUserId as string | undefined;

    // Crew (non-leadership, non-dept-head): see only tasks assigned to them.
    // Dept head: see only their department.
    // Leadership: unscoped (default).
    const crewScope =
      !hasFullProjectVisibility(me.role) && me.role !== UserRole.DEPT_HEAD ? userId : null;

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        ...(status ? { status: status as 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(assigneeUserId ? { assigneeUserId } : {}),
        ...(deptScope ? { departmentId: deptScope } : {}),
        ...(crewScope ? { assigneeUserId: crewScope } : {}),
      },
      include: {
        department: { select: { id: true, displayName: true, kind: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    res.json(tasks);
  }),
);

// GET /projects/:projectId/schedule?from=2026-01-01&to=2026-02-01
router.get(
  '/projects/:projectId/schedule',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    await getMembershipOrThrow(userId, projectId);

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const days = await prisma.shootDay.findMany({
      where: {
        projectId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        scenes: { include: { scene: { select: { id: true, sceneNumber: true, heading: true } } } },
      },
      orderBy: { date: 'asc' },
    });
    res.json(days);
  }),
);

// GET /projects/:projectId/conflicts
router.get(
  '/projects/:projectId/conflicts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const me = await getMembershipOrThrow(userId, projectId);
    const deptScope = isDeptScoped(me) ? me.projectDepartmentId! : null;

    const includeResolved = req.query.includeResolved === 'true';
    const conflicts = await prisma.conflictAlert.findMany({
      where: {
        projectId,
        ...(includeResolved ? {} : { resolved: false }),
        ...(deptScope
          ? {
              OR: [
                { contextJson: { path: ['departmentId'], equals: deptScope } },
                { kind: 'SCHEDULE_CLASH' },
              ],
            }
          : {}),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    res.json(conflicts);
  }),
);

export default router;
