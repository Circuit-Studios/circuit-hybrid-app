import { Router } from 'express';
import { OtpChannel } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, forbidden } from '../../lib/http.js';
import { isFeatureEnabled } from '../../config/features.js';
import { OTP_RESEND_COOLDOWN_SECONDS } from '../auth/auth.constants.js';
import { emailSchema, otpCodeSchema } from '../auth/auth.schemas.js';
import { GENERIC_SEND_SUCCESS, OTP_TTL_MS, requestOtp, verifyOtp } from '../auth/otp.service.js';

/** Post-account email verification — not signup/login identity OTP. */
export const emailPublicRouter: Router = Router();

const EMAIL_OTP_TTL_SECONDS = OTP_TTL_MS / 1000;

const emailRequestOtpSchema = z.object({
  email: emailSchema,
});

const emailVerifyOtpSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

emailPublicRouter.post(
  '/request-otp',
  asyncHandler(async (req, res) => {
    if (!(await isFeatureEnabled('auth.emailOtp'))) {
      throw forbidden('This feature is currently disabled');
    }

    const { email } = emailRequestOtpSchema.parse(req.body);
    await requestOtp({
      channel: OtpChannel.EMAIL,
      target: email,
      purpose: 'verify_email',
    });

    res.json({
      ok: true,
      message: GENERIC_SEND_SUCCESS,
      ttlSeconds: EMAIL_OTP_TTL_SECONDS,
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  }),
);

emailPublicRouter.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    if (!(await isFeatureEnabled('auth.emailOtp'))) {
      throw forbidden('This feature is currently disabled');
    }

    const { email, code } = emailVerifyOtpSchema.parse(req.body);
    await verifyOtp({
      channel: OtpChannel.EMAIL,
      target: email,
      code,
      purpose: 'verify_email',
    });

    res.json({
      ok: true,
      message: 'Email verified successfully.',
      emailVerified: true,
    });
  }),
);
