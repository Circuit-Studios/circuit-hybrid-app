// Edit/override surface for project departments + budget lines.
//
// Departments are AI-seeded but the line producer often wants to:
//   - Rename "MUSIC" to a custom label like "Music & RR"
//   - Mark a department "not required" for this project (kills the
//     dept-behind alerts)
// Budget lines flip from AI draft to human-confirmed via PATCH.

import { Router } from 'express';
import { z } from 'zod';
import { DepartmentKind, MembershipStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { emitToProject } from '../../realtime/socket.js';

const router: Router = Router();

const EDITOR_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.PRODUCER,
  UserRole.EXECUTIVE_PRODUCER,
  UserRole.LINE_PRODUCER,
];

async function assertCanEdit(userId: string, projectId: string): Promise<void> {
  const m = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: MembershipStatus.ACTIVE },
    select: { role: true },
  });
  if (!m) throw forbidden('You are not a member of this project');
  if (!EDITOR_ROLES.includes(m.role)) {
    throw forbidden(`Role ${m.role} cannot edit departments or budget`);
  }
}

// ---- Departments -----------------------------------------------------

router.get(
  '/projects/:projectId/departments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const m = await prisma.projectMember.findFirst({
      where: { projectId, userId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!m) throw forbidden('Not a member');

    const rows = await prisma.projectDepartment.findMany({
      where: { projectId },
      orderBy: { displayName: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
    res.json(rows);
  }),
);

const patchDepartmentSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  required: z.boolean().optional(),
});

router.patch(
  '/departments/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const userId = req.user!.sub;

    const existing = await prisma.projectDepartment.findUnique({ where: { id } });
    if (!existing) throw notFound('Department not found');
    await assertCanEdit(userId, existing.projectId);

    const input = patchDepartmentSchema.parse(req.body);

    const updated = await prisma.projectDepartment.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.required !== undefined && { required: input.required }),
        isEdited: true,
        editedByUserId: userId,
        editedAt: new Date(),
      },
    });

    emitToProject(existing.projectId, 'department.updated', { departmentId: updated.id });
    res.json(updated);
  }),
);

// ---- Budget lines ----------------------------------------------------

router.get(
  '/projects/:projectId/budget-lines',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const m = await prisma.projectMember.findFirst({
      where: { projectId, userId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!m) throw forbidden('Not a member');

    const rows = await prisma.budgetLine.findMany({
      where: { projectId },
      orderBy: [{ department: 'asc' }, { label: 'asc' }],
    });
    res.json(
      rows.map((r) => ({
        ...r,
        amountINR: r.amountINR.toString(),
      })),
    );
  }),
);

// Accept either a number or a numeric string for amountINR; we coerce to
// BigInt manually so we can give a friendly error.
const amountINRSchema = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .transform((v) => BigInt(typeof v === 'number' ? v : v));

const patchBudgetLineSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  amountINR: amountINRSchema.optional(),
  department: z.nativeEnum(DepartmentKind).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

router.patch(
  '/budget-lines/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const userId = req.user!.sub;

    const existing = await prisma.budgetLine.findUnique({ where: { id } });
    if (!existing) throw notFound('Budget line not found');
    await assertCanEdit(userId, existing.projectId);

    const input = patchBudgetLineSchema.parse(req.body);

    const updated = await prisma.budgetLine.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.amountINR !== undefined && { amountINR: input.amountINR }),
        ...(input.department !== undefined && { department: input.department }),
        ...(input.notes !== undefined && { notes: input.notes }),
        isAIDraft: false,
        isEdited: true,
        editedByUserId: userId,
        editedAt: new Date(),
      },
    });

    emitToProject(existing.projectId, 'budgetline.updated', { budgetLineId: updated.id });
    res.json({ ...updated, amountINR: updated.amountINR.toString() });
  }),
);

// POST /projects/:projectId/budget-lines — line producer can add custom lines
// the AI didn't generate.
const createBudgetLineSchema = z.object({
  department: z.nativeEnum(DepartmentKind),
  label: z.string().trim().min(1).max(200),
  amountINR: amountINRSchema,
  notes: z.string().trim().max(2000).optional(),
});

router.post(
  '/projects/:projectId/budget-lines',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    await assertCanEdit(userId, projectId);

    const input = createBudgetLineSchema.parse(req.body);

    const created = await prisma.budgetLine.create({
      data: {
        projectId,
        department: input.department,
        label: input.label,
        amountINR: input.amountINR,
        notes: input.notes,
        isAIDraft: false,
        isEdited: true,
        editedByUserId: userId,
        editedAt: new Date(),
      },
    });

    emitToProject(projectId, 'budgetline.updated', { budgetLineId: created.id });
    res.status(201).json({ ...created, amountINR: created.amountINR.toString() });
  }),
);

router.delete(
  '/budget-lines/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const userId = req.user!.sub;
    const existing = await prisma.budgetLine.findUnique({ where: { id } });
    if (!existing) throw notFound('Budget line not found');
    await assertCanEdit(userId, existing.projectId);

    await prisma.budgetLine.delete({ where: { id } });
    emitToProject(existing.projectId, 'budgetline.updated', {
      budgetLineId: id,
      deleted: true,
    });
    res.status(204).end();
  }),
);

export default router;
