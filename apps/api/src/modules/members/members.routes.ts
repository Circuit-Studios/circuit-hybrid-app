import { Router } from 'express';
import { z } from 'zod';
import { MembershipStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, conflict, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { dispatchNotification } from '../../notifications/notifications.service.js';

const router: Router = Router();

// Phone format mirrors auth.routes.ts so the same string can be matched
// against a future signup.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+\d{8,15}$/, 'Phone must be E.164 format like +919812345678');

const inviteMemberSchema = z
  .object({
    role: z.nativeEnum(UserRole),
    name: z.string().trim().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
    email: z.string().email().optional(),
    projectDepartmentId: z.string().uuid().optional(),
  })
  .refine(v => v.phone || v.email, {
    message: 'Either phone or email is required',
  });

// Only Director/Producer/Line Producer can invite people into a project. This
// matches Module 1 in the spec: directors hand-pick their crew. Once we wire
// up Spider mode in Module 4, dept heads will be allowed to invite their own
// crew within their department — we'll add that exception then.
const INVITER_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.PRODUCER,
  UserRole.EXECUTIVE_PRODUCER,
  UserRole.LINE_PRODUCER,
];

async function assertCanInvite(userId: string, projectId: string): Promise<void> {
  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: MembershipStatus.ACTIVE },
    select: { role: true },
  });
  if (!membership) throw forbidden('You are not a member of this project');
  if (!INVITER_ROLES.includes(membership.role)) {
    throw forbidden(`Role ${membership.role} cannot invite members`);
  }
}

// POST /projects/:projectId/members
//   Invite a teammate by phone or email. The membership row is created in
//   INVITED state; when the invitee signs up with a matching phone we link
//   the user_id automatically (see auth.routes.ts).
router.post(
  '/projects/:projectId/members',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    await assertCanInvite(userId, projectId);

    const input = inviteMemberSchema.parse(req.body);

    // If the phone or email already belongs to a registered user, link them
    // immediately so the project appears in their list on next /projects GET.
    let invitedUserId: string | null = null;
    if (input.phone) {
      const user = await prisma.user.findUnique({ where: { phone: input.phone } });
      invitedUserId = user?.id ?? null;
    } else if (input.email && !invitedUserId) {
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      invitedUserId = user?.id ?? null;
    }

    // The (projectId, userId, role) tuple is unique. Guard against the
    // common case of "already invited" with a friendlier 409.
    if (invitedUserId) {
      const existing = await prisma.projectMember.findFirst({
        where: { projectId, userId: invitedUserId, role: input.role },
      });
      if (existing) throw conflict('That user is already invited with this role');
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: invitedUserId,
        role: input.role,
        inviteeName: input.name,
        inviteePhone: input.phone,
        inviteeEmail: input.email,
        projectDepartmentId: input.projectDepartmentId,
        status: invitedUserId ? MembershipStatus.INVITED : MembershipStatus.INVITED,
      },
    });

    // If the invitee is already on Circuit, ping them. SMS for un-registered
    // invitees is handled by a separate OTP/welcome flow (out of scope here).
    if (invitedUserId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      });
      void dispatchNotification({
        userIds: [invitedUserId],
        kind: 'PROJECT_INVITE',
        title: `You've been invited to ${project?.name ?? 'a project'}`,
        body: `You were added as ${input.role.replace(/_/g, ' ')}. Tap to accept.`,
        projectId,
        deepLink: '/projects',
        context: { memberId: member.id, role: input.role },
      });
    }

    res.status(201).json(member);
  }),
);

// GET /projects/:projectId/members
router.get(
  '/projects/:projectId/members',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;

    const me = await prisma.projectMember.findFirst({
      where: { projectId, userId, status: MembershipStatus.ACTIVE },
    });
    if (!me) throw forbidden('You are not a member of this project');

    const members = await prisma.projectMember.findMany({
      where: { projectId, status: { not: MembershipStatus.REMOVED } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        projectDepartment: { select: { id: true, displayName: true, kind: true } },
      },
      orderBy: [{ status: 'asc' }, { invitedAt: 'asc' }],
    });

    res.json(members);
  }),
);

// POST /members/:memberId/accept
//   The invitee accepts (or declines via DELETE) the invite. We re-verify
//   identity here even though the JWT subject is authoritative — defence in
//   depth in case someone forges the route.
router.post(
  '/members/:memberId/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const memberId = req.params.memberId!;
    const userId = req.user!.sub;
    const phone = req.user!.phone;
    const email = req.user!.email;

    const member = await prisma.projectMember.findUnique({ where: { id: memberId } });
    if (!member) throw notFound('Invite not found');

    // Match policy: the invite belongs to me if either:
    //   - it was already linked to my userId during creation, OR
    //   - my JWT's phone / email matches the invitee fields on the row.
    const isMine =
      (member.userId && member.userId === userId) ||
      (!!phone && member.inviteePhone === phone) ||
      (!!email && member.inviteeEmail === email);

    if (!isMine) throw forbidden('This invite is not for you');

    if (member.status === MembershipStatus.ACTIVE) {
      return res.json(member);
    }
    if (member.status === MembershipStatus.REMOVED) {
      throw badRequest('That invite has been revoked');
    }

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: {
        userId,
        status: MembershipStatus.ACTIVE,
        acceptedAt: new Date(),
      },
    });

    res.json(updated);
  }),
);

// DELETE /members/:memberId
//   Inviter revokes an invite, or member leaves a project. Soft delete via
//   status=REMOVED so we keep an audit trail (Module 5 alerts may reference
//   historical members).
router.delete(
  '/members/:memberId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const memberId = req.params.memberId!;
    const userId = req.user!.sub;

    const member = await prisma.projectMember.findUnique({ where: { id: memberId } });
    if (!member) throw notFound('Member not found');

    const inviter = await prisma.projectMember.findFirst({
      where: { projectId: member.projectId, userId, status: MembershipStatus.ACTIVE },
      select: { role: true },
    });
    const isInviter = inviter && INVITER_ROLES.includes(inviter.role);
    const isSelf = member.userId === userId;

    if (!isInviter && !isSelf) {
      throw forbidden('Only the inviter or the member themselves can remove this membership');
    }

    await prisma.projectMember.update({
      where: { id: memberId },
      data: { status: MembershipStatus.REMOVED },
    });

    res.status(204).end();
  }),
);

export default router;
