import { Router } from 'express';
import { z } from 'zod';
import { UserRole, ProjectLanguage, MembershipStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, notFound, forbidden } from '../../lib/http.js';
import { requireAuth, requireDefaultRole } from '../../middleware/auth.js';

const router: Router = Router();

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  /** One or more production languages (first entry is the primary). */
  languages: z.array(z.nativeEnum(ProjectLanguage)).min(1).max(5),
  genre: z.string().trim().min(1).max(80),
  budgetMinINR: z.coerce.number().int().min(0).optional(),
  budgetMaxINR: z.coerce.number().int().min(0).optional(),
  shootStartDate: z.coerce.date().optional(),
  shootEndDate: z.coerce.date().optional(),
});

// Only Directors and Producers can create projects (Module 1 — onboarding).
router.post(
  '/',
  requireAuth,
  requireDefaultRole(UserRole.DIRECTOR, UserRole.PRODUCER),
  asyncHandler(async (req, res) => {
    const input = createProjectSchema.parse(req.body);
    const userId = req.user!.sub;

    const primaryLanguage = input.languages[0]!;
    const project = await prisma.project.create({
      data: {
        name: input.name,
        language: primaryLanguage,
        languages: input.languages,
        genre: input.genre,
        budgetMinINR: input.budgetMinINR ? BigInt(input.budgetMinINR) : null,
        budgetMaxINR: input.budgetMaxINR ? BigInt(input.budgetMaxINR) : null,
        shootStartDate: input.shootStartDate,
        shootEndDate: input.shootEndDate,
        ownerUserId: userId,
        members: {
          create: {
            userId,
            role: req.user!.defaultRole as UserRole,
            status: MembershipStatus.ACTIVE,
            acceptedAt: new Date(),
          },
        },
      },
    });

    res.status(201).json(serializeProject(project));
  }),
);

// Lists projects the authenticated user belongs to. The "Spider mode" UI on
// the client is purely a function of how many projects this returns (>=2).
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const memberships = await prisma.projectMember.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      include: { project: true },
      orderBy: { acceptedAt: 'desc' },
    });
    res.json(
      memberships.map((m) => ({
        ...serializeProject(m.project),
        role: m.role,
      })),
    );
  }),
);

router.get(
  '/:projectId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const projectId = req.params.projectId!;
    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId, status: MembershipStatus.ACTIVE },
    });
    if (!membership) throw forbidden('You are not a member of this project');

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw notFound('Project not found');

    res.json({
      ...serializeProject(project),
      role: membership.role,
    });
  }),
);

function serializeProject<T extends { budgetMinINR: bigint | null; budgetMaxINR: bigint | null }>(
  p: T,
) {
  return {
    ...p,
    budgetMinINR: p.budgetMinINR != null ? Number(p.budgetMinINR) : null,
    budgetMaxINR: p.budgetMaxINR != null ? Number(p.budgetMaxINR) : null,
  };
}

export default router;
