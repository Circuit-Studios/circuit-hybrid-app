import { Router } from 'express';
import { OtpChannel } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, conflict, notFound, unauthorized } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { buildAuthResponse } from './auth-response.js';
import { findOrCreateUserAfterOtp, linkPendingInvites } from './auth-signup.js';
import { assertDirectRegisterAllowed } from './direct-register.policy.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { requestOtp, verifyOtp } from './otp.service.js';
import { OTP_TTL_SECONDS } from './auth.constants.js';
import { EMAIL_OTP_TTL_MS } from './email-otp.service.js';
import { assertLoginChannel, assertSignupChannel } from './verification-policy.js';
import {
  directRegisterSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  type RequestOtpBody,
} from './auth.schemas.js';

export const authPublicRouter: Router = Router();
export const authProtectedRouter: Router = Router();

async function assertOtpPurpose(body: RequestOtpBody): Promise<void> {
  const purpose = body.purpose ?? 'login';

  if (body.channel === 'EMAIL') {
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (purpose === 'signup' && existing) {
      throw conflict('An account with this email already exists');
    }
    if (purpose === 'login' && !existing) {
      throw notFound('No account found for this email');
    }
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (purpose === 'signup' && existing) {
    throw conflict('An account with this phone number already exists');
  }
  if (purpose === 'login' && !existing) {
    throw notFound('No account found for this phone number');
  }
}

const EMAIL_OTP_TTL_SECONDS = EMAIL_OTP_TTL_MS / 1000;

authPublicRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    assertDirectRegisterAllowed();
    const body = directRegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw conflict('An account with this email already exists');
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        emailVerified: true,
        firstName: body.firstName,
        lastName: body.lastName,
        defaultRole: body.role,
        phone: body.phone,
        passwordHash,
      },
    });
    await linkPendingInvites(user.id, user.phone, user.email);
    res.json(buildAuthResponse(user));
  }),
);

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
    const body = requestOtpSchema.parse(req.body);
    await assertOtpPurpose(body);

    const channel = body.channel === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.PHONE;
    const purpose = body.purpose ?? 'login';
    if (purpose === 'signup') assertSignupChannel(channel);
    if (purpose === 'login') assertLoginChannel(channel);

    await requestOtp({
      channel,
      target: body.channel === 'EMAIL' ? body.email : body.phone,
      purpose: body.purpose,
    });

    res.json({
      ok: true,
      ttlSeconds: body.channel === 'EMAIL' ? EMAIL_OTP_TTL_SECONDS : OTP_TTL_SECONDS,
    });
  }),
);

authPublicRouter.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const input = verifyOtpSchema.parse(req.body);
    const channel = input.channel === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.PHONE;

    if (input.signup) assertSignupChannel(channel);
    else assertLoginChannel(channel);

    await verifyOtp({
      channel,
      target: input.channel === 'EMAIL' ? input.email : input.phone,
      code: input.code,
      purpose: input.signup ? 'signup' : 'login',
    });

    const user = await findOrCreateUserAfterOtp(input);
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
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  }),
);

authProtectedRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
      throw unauthorized('Missing auth context');
    }

    const ownedProjects = await prisma.project.count({ where: { ownerUserId: userId } });
    if (ownedProjects > 0) {
      throw conflict('Transfer or delete your projects before deleting your account.');
    }

    const uploadedScripts = await prisma.script.count({ where: { uploadedByUserId: userId } });
    if (uploadedScripts > 0) {
      throw conflict('Remove uploaded scripts tied to your account before deleting it.');
    }

    await prisma.$transaction([
      prisma.projectMember.deleteMany({ where: { userId } }),
      prisma.pushToken.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.authOtp.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ ok: true });
  }),
);

authProtectedRouter.get(
  '/me/invites',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    const phone = req.user?.phone;
    const email = req.user?.email;
    if (!userId) {
      throw badRequest('Missing auth context');
    }
    const invites = await prisma.projectMember.findMany({
      where: {
        status: 'INVITED',
        OR: [
          { userId },
          ...(phone ? [{ inviteePhone: phone }] : []),
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
