import { Router } from 'express';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  asyncHandler,
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../lib/logger.js';
import { buildAuthResponse } from './auth-response.js';
import {
  findOrCreateUserAfterOtp,
  createUserOrConflict,
  linkPendingInvites,
} from './auth-signup.js';
import { assertDirectRegisterAllowed } from './direct-register.policy.js';
import { hashPassword, verifyPassword } from './password.service.js';
import { OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_SECONDS } from './auth.constants.js';
import { assertLoginChannel, assertSignupChannel } from './verification-policy.js';
import {
  authOtpDeleteByEmailTargetWhere,
  authOtpDeleteByPhoneTargetWhere,
} from './auth-otp.store.js';
import { normalizeEmail } from './otp-crypto.js';
import {
  directRegisterSchema,
  forgotPasswordSchema,
  loginSchema,
  requestOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  type RequestOtpBody,
} from './auth.schemas.js';
import { OTP_TTL_MS, requestOtp, verifyOtp } from './otp.service.js';

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

const EMAIL_OTP_TTL_SECONDS = OTP_TTL_MS / 1000;

authPublicRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    assertDirectRegisterAllowed();
    const body = directRegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw conflict('An account with this email already exists');
    }
    if (body.phone) {
      const phoneOwner = await prisma.user.findUnique({ where: { phone: body.phone } });
      if (phoneOwner) {
        throw conflict('An account with this phone number already exists');
      }
    }

    const passwordHash = await hashPassword(body.password);
    const user = await createUserOrConflict({
      email: body.email,
      emailVerified: true,
      firstName: body.firstName,
      lastName: body.lastName,
      defaultRole: body.role,
      phone: body.phone,
      passwordHash,
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
    const purpose = body.purpose ?? 'login';
    if (purpose === 'verify_email') {
      throw badRequest('Post-account email verification uses POST /email/request-otp');
    }
    await assertOtpPurpose(body);

    const channel = body.channel === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.PHONE;

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
    const purpose = input.purpose ?? (input.signup ? 'signup' : 'login');

    if (purpose === 'verify_email') {
      throw badRequest('Post-account email verification uses POST /email/verify-otp');
    }

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

const GENERIC_RESET_MESSAGE =
  'If an account exists for that email, a password reset code has been sent.';

authPublicRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(email);

    // Anti-enumeration: only dispatch when the account exists, but always
    // return the same generic response so callers cannot probe for emails.
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user) {
      try {
        await requestOtp({
          channel: OtpChannel.EMAIL,
          target: normalizedEmail,
          purpose: 'password_reset',
        });
      } catch (err) {
        // Swallow cooldown/delivery errors so timing/response does not leak
        // whether the email is registered. The OTP service logs masked details.
        logger.warn(
          { event: 'auth.forgot_password_suppressed' },
          err instanceof Error ? err.message : 'forgot_password_failed',
        );
      }
    }

    res.json({
      ok: true,
      message: GENERIC_RESET_MESSAGE,
      ttlSeconds: EMAIL_OTP_TTL_SECONDS,
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  }),
);

authPublicRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { email, code, newPassword } = resetPasswordSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(email);

    // Verifying consumes the single-use OTP and throws a generic 401 on failure.
    await verifyOtp({
      channel: OtpChannel.EMAIL,
      target: normalizedEmail,
      code,
      purpose: 'password_reset',
    });

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      // Should not happen (OTP was issued for an existing account); stay generic.
      throw unauthorized('Invalid or expired verification code.');
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Invalidate any other outstanding reset codes for this account.
      // TODO: use auth-otp.store helpers — AuthOtp is the single OTP table (see docs/OTP_STORAGE.md).
      prisma.authOtp.updateMany({
        where: {
          channel: OtpChannel.EMAIL,
          target: normalizedEmail,
          purpose: OtpPurpose.PASSWORD_RESET,
          consumed: false,
        },
        data: { consumed: true, consumedAt: new Date() },
      }),
    ]);

    res.json({
      ok: true,
      message: 'Password updated. Please sign in with your new password.',
    });
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });
    if (!user) {
      throw notFound('User not found');
    }

    await prisma.$transaction([
      prisma.projectMember.deleteMany({ where: { userId } }),
      prisma.pushToken.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.authOtp.deleteMany({ where: { userId } }),
      ...(user.email
        ? [prisma.authOtp.deleteMany({ where: authOtpDeleteByEmailTargetWhere(user.email) })]
        : []),
      ...(user.phone
        ? [prisma.authOtp.deleteMany({ where: authOtpDeleteByPhoneTargetWhere(user.phone) })]
        : []),
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
