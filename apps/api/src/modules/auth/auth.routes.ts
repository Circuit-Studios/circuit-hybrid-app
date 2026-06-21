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

export const authPublicRouter: Router = Router();
export const authProtectedRouter: Router = Router();

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .optional();

const personNameSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().max(60).default(''),
});

const signupPayloadSchema = personNameSchema.extend({
  role: z.nativeEnum(UserRole),
  password: passwordSchema,
});

const requestOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(['signup', 'login']).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  signup: signupPayloadSchema.optional(),
});

async function linkPendingInvites(email: string, userId: string): Promise<void> {
  await prisma.projectMember.updateMany({
    where: {
      userId: null,
      OR: [{ inviteeEmail: email }, { inviteePhone: email }],
    },
    data: { userId },
  });
}

authPublicRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw unauthorized('Invalid email or password');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw unauthorized('Invalid email or password');
    }
    res.json(buildAuthResponse(user));
  }),
);

authPublicRouter.post(
  '/request-otp',
  asyncHandler(async (req, res) => {
    const { email, purpose } = requestOtpSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (purpose === 'signup' && existing) {
      throw conflict('An account with this email already exists');
    }
    if (purpose === 'login' && !existing) {
      throw notFound('No account found for this email');
    }
    await requestOtp(email);
    res.json({ ok: true, ttlSeconds: OTP_TTL_SECONDS });
  }),
);

authPublicRouter.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const input = verifyOtpSchema.parse(req.body);
    await verifyOtp(input.email, input.code);

    let user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      if (!input.signup) {
        throw badRequest(
          'First-time sign-in requires signup payload (firstName, lastName, role)',
        );
      }
      const passwordHash = input.signup.password
        ? await hashPassword(input.signup.password)
        : undefined;
      user = await prisma.user.create({
        data: {
          email: input.email,
          firstName: input.signup.firstName,
          lastName: input.signup.lastName,
          defaultRole: input.signup.role,
          passwordHash,
        },
      });
      await linkPendingInvites(input.email, user.id);
    } else if (input.signup) {
      throw conflict('An account with this email already exists');
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
    const email = req.user?.email;
    if (!userId) {
      throw badRequest('Missing auth context');
    }
    const invites = await prisma.projectMember.findMany({
      where: {
        status: 'INVITED',
        OR: [
          { userId },
          ...(email ? [{ inviteeEmail: email }] : []),
        ],
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
