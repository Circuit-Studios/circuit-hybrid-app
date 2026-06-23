import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest } from '../../lib/http.js';
import { requireFeature } from '../../middleware/require-feature.js';
import {
  EMAIL_OTP_COOLDOWN_SECONDS,
  EMAIL_OTP_TTL_MS,
  GENERIC_SEND_SUCCESS,
  sendEmailOtp,
  verifyEmailOtp,
} from './email-otp.service.js';
import { emailSchema } from './auth.schemas.js';
import { OtpPurpose } from '@prisma/client';

const router: Router = Router();

/**
 * Post-account email verification only.
 * Signup/login OTP must use POST /auth/request-otp and POST /auth/verify-otp.
 */
const sendOtpBodySchema = z.object({
  email: emailSchema,
  purpose: z.literal('verify_email').optional(),
});

const verifyOtpBodySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: z.literal('verify_email').optional(),
});

function rejectAuthSignupLoginPurpose(purpose: string | undefined): void {
  if (purpose === 'signup' || purpose === 'login') {
    throw badRequest('Use POST /auth/request-otp and POST /auth/verify-otp for signup and login.');
  }
}

/** POST /send-otp — verify an email on an existing account (not signup/login). */
router.post(
  '/send-otp',
  requireFeature('auth.emailOtp'),
  asyncHandler(async (req, res) => {
    const raw = req.body as { purpose?: string };
    rejectAuthSignupLoginPurpose(raw.purpose);

    const { email } = sendOtpBodySchema.parse(req.body);
    await sendEmailOtp(email, OtpPurpose.VERIFY_EMAIL);

    res.json({
      ok: true,
      message: GENERIC_SEND_SUCCESS,
      ttlSeconds: EMAIL_OTP_TTL_MS / 1000,
      cooldownSeconds: EMAIL_OTP_COOLDOWN_SECONDS,
    });
  }),
);

/** POST /verify-otp — confirm post-account email verification. */
router.post(
  '/verify-otp',
  requireFeature('auth.emailOtp'),
  asyncHandler(async (req, res) => {
    const raw = req.body as { purpose?: string };
    rejectAuthSignupLoginPurpose(raw.purpose);

    const { email, otp } = verifyOtpBodySchema.parse(req.body);
    await verifyEmailOtp(email, otp, OtpPurpose.VERIFY_EMAIL);

    res.json({
      ok: true,
      message: 'Email verified successfully.',
      emailVerified: true,
    });
  }),
);

export default router;
