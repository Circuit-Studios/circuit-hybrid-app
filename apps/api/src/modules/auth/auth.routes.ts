import { Router } from 'express';
import { OtpChannel } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, conflict, forbidden, notFound, unauthorized } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { buildAuthResponse } from './auth-response.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { requestOtp, verifyOtp } from './otp.service.js';
import { OTP_TTL_SECONDS } from './auth.constants.js';
import { EMAIL_OTP_TTL_MS } from './email-otp.service.js';
import { env } from '../../config/env.js';
import {
  assertLoginChannel,
  assertSignupChannel,
} from './verification-policy.js';
import {
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  type RequestOtpBody,
  type VerifyOtpBody,
} from './auth.schemas.js';

export const authPublicRouter: Router = Router();
export const authProtectedRouter: Router = Router();

async function linkPendingInvites(userId: string, phone?: string | null, email?: string | null): Promise<void> {
  const or: Array<{ inviteePhone?: string; inviteeEmail?: string }> = [];
  if (phone) or.push({ inviteePhone: phone });
  if (email) or.push({ inviteeEmail: email });
  if (or.length === 0) return;

  await prisma.projectMember.updateMany({
    where: { userId: null, OR: or },
    data: { userId },
  });
}

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
  asyncHandler(async (_req, res) => {
    if (env.NODE_ENV === 'production' || env.APP_ENV === 'prod') {
      throw forbidden('Direct registration is disabled. Sign up with OTP verification.');
    }
    throw forbidden('Direct registration is disabled. Use /auth/request-otp and /auth/verify-otp.');
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

    const purpose = body.purpose ?? 'login';
    const channel = body.channel === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.PHONE;
    if (purpose === 'signup') assertSignupChannel(channel);
    if (purpose === 'login') assertLoginChannel(channel);

    if (body.channel === 'EMAIL') {
      await requestOtp({
        channel: OtpChannel.EMAIL,
        target: body.email,
        purpose: body.purpose,
      });
    } else {
      await requestOtp({
        channel: OtpChannel.PHONE,
        target: body.phone,
        purpose: body.purpose,
      });
    }

    res.json({
      ok: true,
      ttlSeconds: body.channel === 'EMAIL' ? EMAIL_OTP_TTL_SECONDS : OTP_TTL_SECONDS,
    });
  }),
);

authPublicRouter.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const input: VerifyOtpBody = verifyOtpSchema.parse(req.body);
    const verifyChannel = input.channel === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.PHONE;
    if (input.signup) assertSignupChannel(verifyChannel);
    else assertLoginChannel(verifyChannel);

    if (input.channel === 'EMAIL') {
      await verifyOtp({
        channel: OtpChannel.EMAIL,
        target: input.email,
        code: input.code,
        purpose: input.signup ? 'signup' : 'login',
      });

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
            emailVerified: true,
            phone: input.signup.phone,
            firstName: input.signup.firstName,
            lastName: input.signup.lastName,
            defaultRole: input.signup.role,
            passwordHash,
          },
        });
        await linkPendingInvites(user.id, user.phone, user.email);
      } else if (input.signup) {
        throw conflict('An account with this email already exists');
      }

      res.json(buildAuthResponse(user));
      return;
    }

      await verifyOtp({
        channel: OtpChannel.PHONE,
        target: input.phone,
        code: input.code,
        purpose: input.signup ? 'signup' : 'login',
      });

    let user = await prisma.user.findUnique({ where: { phone: input.phone } });
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
          phone: input.phone,
          email: input.signup.email,
          firstName: input.signup.firstName,
          lastName: input.signup.lastName,
          defaultRole: input.signup.role,
          passwordHash,
        },
      });
      await linkPendingInvites(user.id, user.phone, user.email);
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
        emailVerified: user.emailVerified,
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
