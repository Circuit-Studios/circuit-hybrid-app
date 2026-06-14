import { Router } from 'express';
import { z } from 'zod';
import { MembershipStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, conflict, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { emitToProject } from '../../realtime/socket.js';
import { enqueueConflictScan } from '../../queues/conflicts.queue.js';
import { dispatchNotification } from '../../notifications/notifications.service.js';

const router: Router = Router();

const SCHEDULE_MANAGER_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.PRODUCER,
  UserRole.EXECUTIVE_PRODUCER,
  UserRole.LINE_PRODUCER,
  UserRole.AD,
];

async function assertCanManageSchedule(userId: string, projectId: string): Promise<void> {
  const m = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: MembershipStatus.ACTIVE },
    select: { role: true },
  });
  if (!m) throw forbidden('You are not a member of this project');
  if (!SCHEDULE_MANAGER_ROLES.includes(m.role)) {
    throw forbidden(`Role ${m.role} cannot manage the schedule`);
  }
}

const createShootDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.coerce.date(),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  callTimeUserId: z.string().uuid().optional(),
  sceneIds: z.array(z.string().uuid()).max(40).optional(),
});

// POST /projects/:projectId/shoot-days
router.post(
  '/projects/:projectId/shoot-days',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    await assertCanManageSchedule(userId, projectId);

    const input = createShootDaySchema.parse(req.body);

    // The (projectId, dayNumber) and (projectId, date) tuples are unique in
    // Prisma. Surface a friendlier 409 than the default P2002.
    const dupe = await prisma.shootDay.findFirst({
      where: {
        projectId,
        OR: [{ dayNumber: input.dayNumber }, { date: input.date }],
      },
    });
    if (dupe) throw conflict('A shoot day already exists for that number or date');

    const shootDay = await prisma.shootDay.create({
      data: {
        projectId,
        dayNumber: input.dayNumber,
        date: input.date,
        location: input.location,
        notes: input.notes,
        callTimeUserId: input.callTimeUserId,
        scenes: input.sceneIds
          ? { create: input.sceneIds.map((sceneId, order) => ({ sceneId, order })) }
          : undefined,
      },
    });

    await enqueueConflictScan({ projectId, reason: 'shootday.created', shootDayId: shootDay.id });
    emitToProject(projectId, 'shootday.created', { shootDayId: shootDay.id });

    res.status(201).json(shootDay);
  }),
);

const patchShootDaySchema = z.object({
  date: z.coerce.date().optional(),
  location: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  callTimeUserId: z.string().uuid().nullable().optional(),
  // Replace-on-patch semantics for scenes — sending the field replaces the
  // full list. Omit to leave unchanged.
  sceneIds: z.array(z.string().uuid()).max(40).optional(),
});

// PATCH /shoot-days/:shootDayId
router.patch(
  '/shoot-days/:shootDayId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const shootDayId = req.params.shootDayId!;
    const userId = req.user!.sub;

    const existing = await prisma.shootDay.findUnique({ where: { id: shootDayId } });
    if (!existing) throw notFound('Shoot day not found');

    await assertCanManageSchedule(userId, existing.projectId);
    const input = patchShootDaySchema.parse(req.body);

    if (input.date) {
      const dupe = await prisma.shootDay.findFirst({
        where: {
          projectId: existing.projectId,
          date: input.date,
          NOT: { id: shootDayId },
        },
      });
      if (dupe) throw conflict('Another shoot day already occupies that date');
    }

    await prisma.$transaction(async tx => {
      if (input.sceneIds) {
        await tx.shootDayScene.deleteMany({ where: { shootDayId } });
        if (input.sceneIds.length > 0) {
          await tx.shootDayScene.createMany({
            data: input.sceneIds.map((sceneId, order) => ({ shootDayId, sceneId, order })),
          });
        }
      }
      await tx.shootDay.update({
        where: { id: shootDayId },
        data: {
          ...(input.date && { date: input.date }),
          ...(input.location !== undefined && { location: input.location }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.callTimeUserId !== undefined && { callTimeUserId: input.callTimeUserId }),
        },
      });
    });

    const updated = await prisma.shootDay.findUnique({ where: { id: shootDayId } });
    await enqueueConflictScan({
      projectId: existing.projectId,
      reason: 'shootday.updated',
      shootDayId,
    });
    emitToProject(existing.projectId, 'shootday.updated', { shootDayId });

    res.json(updated);
  }),
);

// DELETE /shoot-days/:shootDayId
router.delete(
  '/shoot-days/:shootDayId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const shootDayId = req.params.shootDayId!;
    const userId = req.user!.sub;

    const existing = await prisma.shootDay.findUnique({ where: { id: shootDayId } });
    if (!existing) throw notFound('Shoot day not found');

    await assertCanManageSchedule(userId, existing.projectId);

    await prisma.shootDay.delete({ where: { id: shootDayId } });
    await enqueueConflictScan({
      projectId: existing.projectId,
      reason: 'shootday.deleted',
      shootDayId,
    });
    emitToProject(existing.projectId, 'shootday.deleted', { shootDayId });

    res.status(204).end();
  }),
);

// POST /shoot-days/:shootDayId/calls
//   Assign call times for project members. Used by AD's call-sheet flow.
const callSchema = z.object({
  projectMemberId: z.string().uuid(),
  callTime: z.coerce.date().optional(),
});

router.post(
  '/shoot-days/:shootDayId/calls',
  requireAuth,
  asyncHandler(async (req, res) => {
    const shootDayId = req.params.shootDayId!;
    const userId = req.user!.sub;

    const day = await prisma.shootDay.findUnique({ where: { id: shootDayId } });
    if (!day) throw notFound('Shoot day not found');
    await assertCanManageSchedule(userId, day.projectId);

    const input = callSchema.parse(req.body);
    const member = await prisma.projectMember.findUnique({
      where: { id: input.projectMemberId },
    });
    if (!member || member.projectId !== day.projectId) {
      throw badRequest('Member does not belong to this project');
    }

    const call = await prisma.shootDayCall.upsert({
      where: {
        shootDayId_projectMemberId: {
          shootDayId,
          projectMemberId: input.projectMemberId,
        },
      },
      create: {
        shootDayId,
        projectMemberId: input.projectMemberId,
        callTime: input.callTime,
      },
      update: { callTime: input.callTime },
    });

    await enqueueConflictScan({
      projectId: day.projectId,
      reason: 'shootday.call.upsert',
      shootDayId,
    });
    emitToProject(day.projectId, 'shootday.updated', { shootDayId, calls: true });

    // Ping the called member (skip if it's the AD adding themselves).
    if (member.userId && member.userId !== userId) {
      const project = await prisma.project.findUnique({
        where: { id: day.projectId },
        select: { name: true },
      });
      const dateLabel = day.date.toDateString();
      void dispatchNotification({
        userIds: [member.userId],
        kind: 'SHOOT_DAY_CALL',
        title: `Call time for ${project?.name ?? 'shoot'}`,
        body: `You're called on Day ${day.dayNumber} (${dateLabel}).`,
        projectId: day.projectId,
        deepLink: `/project/${day.projectId}/schedule`,
        context: { shootDayId, callId: call.id, date: day.date.toISOString() },
      });
    }

    res.status(201).json(call);
  }),
);

export default router;
