// Edit/override surface for AI-extracted scenes.
//
// Most edits are factual corrections: synopsis tweaks, location swaps, or
// flipping a `hasStunts` / `hasVFX` flag that the model missed. The PATCH
// endpoint stamps the override so the conflict detector + UI can treat the
// row as authoritative human input.

import { Router } from 'express';
import { z } from 'zod';
import { MembershipStatus, SceneLocationType, SceneTimeOfDay, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { canManageSchedule } from '../../auth/permissions.js';
import { emitToProject } from '../../realtime/socket.js';
import { enqueueConflictScan } from '../../queues/conflicts.queue.js';

const router: Router = Router();

async function assertCanEdit(userId: string, projectId: string): Promise<void> {
  const m = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: MembershipStatus.ACTIVE },
    select: { role: true },
  });
  if (!m) throw forbidden('You are not a member of this project');
  if (!canManageSchedule(m.role)) {
    throw forbidden(`Role ${m.role} cannot edit scenes`);
  }
}

router.get(
  '/projects/:projectId/scenes',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const m = await prisma.projectMember.findFirst({
      where: { projectId, userId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!m) throw forbidden('Not a member');

    const rows = await prisma.scene.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        appearances: { include: { character: { select: { name: true } } } },
      },
    });
    res.json(rows);
  }),
);

const patchSceneSchema = z.object({
  heading: z.string().trim().max(200).nullable().optional(),
  synopsis: z.string().trim().max(2000).nullable().optional(),
  locationType: z.nativeEnum(SceneLocationType).optional(),
  timeOfDay: z.nativeEnum(SceneTimeOfDay).optional(),
  locationName: z.string().trim().max(160).nullable().optional(),
  estimatedPages: z.number().min(0).max(20).nullable().optional(),
  estimatedShootHours: z.number().min(0).max(48).nullable().optional(),
  hasStunts: z.boolean().optional(),
  hasVFX: z.boolean().optional(),
  hasSong: z.boolean().optional(),
});

router.patch(
  '/scenes/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const userId = req.user!.sub;

    const existing = await prisma.scene.findUnique({ where: { id } });
    if (!existing) throw notFound('Scene not found');
    await assertCanEdit(userId, existing.projectId);

    const input = patchSceneSchema.parse(req.body);

    const updated = await prisma.scene.update({
      where: { id },
      data: {
        ...(input.heading !== undefined && { heading: input.heading }),
        ...(input.synopsis !== undefined && { synopsis: input.synopsis }),
        ...(input.locationType !== undefined && { locationType: input.locationType }),
        ...(input.timeOfDay !== undefined && { timeOfDay: input.timeOfDay }),
        ...(input.locationName !== undefined && { locationName: input.locationName }),
        ...(input.estimatedPages !== undefined && { estimatedPages: input.estimatedPages }),
        ...(input.estimatedShootHours !== undefined && {
          estimatedShootHours: input.estimatedShootHours,
        }),
        ...(input.hasStunts !== undefined && { hasStunts: input.hasStunts }),
        ...(input.hasVFX !== undefined && { hasVFX: input.hasVFX }),
        ...(input.hasSong !== undefined && { hasSong: input.hasSong }),
        isEdited: true,
        editedByUserId: userId,
        editedAt: new Date(),
      },
    });

    emitToProject(existing.projectId, 'scene.updated', { sceneId: updated.id });

    // If stunt/VFX flags changed, the missing-dependency detector should rescan.
    if (input.hasStunts !== undefined || input.hasVFX !== undefined) {
      await enqueueConflictScan({
        projectId: existing.projectId,
        reason: 'scene.flags.updated',
      });
    }

    res.json(updated);
  }),
);

export default router;
