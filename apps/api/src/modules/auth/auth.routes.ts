import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, conflict, notFound, unauthorized } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { buildAuthResponse } from './auth-response.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { requestOtp, verifyOtp } from './otp.service.js';
import { OTP_TTL_SECONDS } from './auth.constants.js';

// Split into a public router (login, register, request-otp, verify-otp) and a
// protected router (me, me/invites). The server mounts both under /auth.
export const authPublicRouter: Router = Router();
export const authProtectedRouter: Router = Router();

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+\d{8,15}$/, 'Phone must be E.164 format like +919812345678');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

const personNameSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
});

const signupPayloadSchema = personNameSchema.extend({
  role: z.nativeEnum(UserRole),
  password: passwordSchema,
});

const requestOtpSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(['signup', 'login']).optional(),
});

const loginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

const registerSchema = personNameSchema.extend({
  phone: phoneSchema,
  password: passwordSchema,
  role: z.nativeEnum(UserRole),
});

const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  signup: signupPayloadSchema.optional(),
});

async function linkPendingInvites(phone: string, userId: string): Promise<void> {
  await prisma.projectMember.updateMany({
    where: { inviteePhone: phone, userId: null },
    data: { userId },
  });
}

authPublicRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { phone, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash) {
      throw unauthorized('Invalid phone or password');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw unauthorized('Invalid phone or password');
    }
    res.json(buildAuthResponse(user));
  }),
);

authPublicRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) {
      throw conflict('An account with this phone number already exists');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        phone: input.phone,
        firstName: input.firstName,
        lastName: input.lastName,
        defaultRole: input.role,
        passwordHash,
      },
    });
    await linkPendingInvites(input.phone, user.id);
    res.status(201).json(buildAuthResponse(user));
  }),
);

authPublicRouter.post(
  '/request-otp',
  asyncHandler(async (req, res) => {
    const { phone, purpose } = requestOtpSchema.parse(req.body);
    if (purpose === 'signup') {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        throw conflict('An account with this phone number already exists');
      }
    }
    await requestOtp(phone);
    res.json({ ok: true, ttlSeconds: OTP_TTL_SECONDS });
  }),
);

authPublicRouter.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const input = verifyOtpSchema.parse(req.body);
    await verifyOtp(input.phone, input.code);

    let user = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user) {
      if (!input.signup) {
        throw badRequest(
          'First-time login requires signup payload (firstName, lastName, role, password)',
        );
      }
      const passwordHash = await hashPassword(input.signup.password);
      user = await prisma.user.create({
        data: {
          phone: input.phone,
          firstName: input.signup.firstName,
          lastName: input.signup.lastName,
          defaultRole: input.signup.role,
          passwordHash,
        },
      });
      await linkPendingInvites(input.phone, user.id);
    } else if (input.signup) {
      throw conflict('An account with this phone number already exists');
    }

    res.json(buildAuthResponse(user));
  }),
);

authProtectedRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
      throw unauthorized('Missing auth context');
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw notFound('User not found');
    }
    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        defaultRole: user.defaultRole,
        createdAt: user.createdAt,
      },
    });
  }),
);

authProtectedRouter.get(
  '/me/invites',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    const phone = req.user?.phone;
    if (!userId) {
      throw badRequest('Missing auth context');
    }
    const invites = await prisma.projectMember.findMany({
      where: {
        status: 'INVITED',
        OR: [{ userId }, ...(phone ? [{ inviteePhone: phone }] : [])],
      },
      include: {
        project: { select: { id: true, name: true, language: true, genre: true } },
        projectDepartment: { select: { id: true, displayName: true, kind: true } },
      },
      orderBy: { invitedAt: 'desc' },
    });
    res.json(invites);
  }),
);

export default authPublicRouter;
