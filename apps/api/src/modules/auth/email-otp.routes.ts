import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http.js';
import {
  GENERIC_SEND_SUCCESS,
  sendEmailOtp,
  toEmailOtpPurpose,
  verifyEmailOtp,
} from './email-otp.service.js';
import { emailSchema } from './auth.schemas.js';

const router: Router = Router();

const sendOtpBodySchema = z.object({
  email: emailSchema,
  purpose: z.enum(['signup', 'login', 'verify_email']).optional(),
});

const verifyOtpBodySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: z.enum(['signup', 'login', 'verify_email']).optional(),
});

/** POST /send-otp */
router.post(
  '/send-otp',
  asyncHandler(async (req, res) => {
    const { email, purpose } = sendOtpBodySchema.parse(req.body);
    const otpPurpose = toEmailOtpPurpose(purpose);

    // Always attempt send — response stays generic (no account enumeration).
    await sendEmailOtp(email, otpPurpose);

    res.json({
      ok: true,
      message: GENERIC_SEND_SUCCESS,
      ttlSeconds: 600,
      cooldownSeconds: 45,
    });
  }),
);

/** POST /verify-otp */
router.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const { email, otp, purpose } = verifyOtpBodySchema.parse(req.body);
    const otpPurpose = toEmailOtpPurpose(purpose);

    await verifyEmailOtp(email, otp, otpPurpose);

    res.json({
      ok: true,
      message: 'Email verified successfully.',
      emailVerified: true,
    });
  }),
);

export default router;
