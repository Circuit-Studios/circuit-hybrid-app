// Edit/override surface for AI-extracted characters.
//
// The AI pipeline writes the canonical row, but humans need to be able to
// fix mistakes — wrong importance, misspelled name, missing screen-time
// estimate. The PATCH endpoint flips `isEdited` + records who/when so the
// UI can show an "EDITED" badge alongside the AI output.

import { Router } from 'express';
import { z } from 'zod';
import { CharacterImportance, MembershipStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { emitToProject } from '../../realtime/socket.js';

const router: Router = Router();

// Only leadership can override AI output. Casting decisions especially are
// not for crew to flip.
const EDITOR_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.PRODUCER,
  UserRole.EXECUTIVE_PRODUCER,
  UserRole.LINE_PRODUCER,
  UserRole.AD,
];

async function getMembershipOrThrow(userId: string, projectId: string) {
  const m = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: MembershipStatus.ACTIVE },
    select: { role: true },
  });
  if (!m) throw forbidden('You are not a member of this project');
  if (!EDITOR_ROLES.includes(m.role)) {
    throw forbidden(`Role ${m.role} cannot edit AI-derived data`);
  }
  return m;
}

// GET /projects/:projectId/characters — paged list with appearance counts.
router.get(
  '/projects/:projectId/characters',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!membership) throw forbidden('Not a member');

    const rows = await prisma.character.findMany({
      where: { projectId },
      orderBy: [{ importance: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { appearances: true } } },
    });
    res.json(rows);
  }),
);

const patchCharacterSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  importance: z.nativeEnum(CharacterImportance).optional(),
  estimatedScreenTimeMinutes: z.number().int().min(0).max(600).nullable().optional(),
  estimatedShootDays: z.number().int().min(0).max(365).nullable().optional(),
  castUserId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

router.patch(
  '/characters/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const userId = req.user!.sub;

    const existing = await prisma.character.findUnique({ where: { id } });
    if (!existing) throw notFound('Character not found');
    await getMembershipOrThrow(userId, existing.projectId);

    const input = patchCharacterSchema.parse(req.body);

    const updated = await prisma.character.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.importance !== undefined && { importance: input.importance }),
        ...(input.estimatedScreenTimeMinutes !== undefined && {
          estimatedScreenTimeMinutes: input.estimatedScreenTimeMinutes,
        }),
        ...(input.estimatedShootDays !== undefined && {
          estimatedShootDays: input.estimatedShootDays,
        }),
        ...(input.castUserId !== undefined && { castUserId: input.castUserId }),
        ...(input.notes !== undefined && { notes: input.notes }),
        isEdited: true,
        editedByUserId: userId,
        editedAt: new Date(),
      },
    });

    emitToProject(existing.projectId, 'character.updated', {
      characterId: updated.id,
    });

    res.json(updated);
  }),
);

export default router;
