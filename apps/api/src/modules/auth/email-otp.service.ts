import { EmailOtpPurpose, OtpChannel } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, unauthorized } from '../../lib/http.js';
import { generateSixDigitOtp, hashOtpCode, normalizeEmail, verifyOtpCode } from './otp-crypto.js';
import { getOtpDeliveryProvider } from './providers/otp-delivery.js';
import { assertOtpChannelEnabled } from './verification-policy.js';
import { logOtpFailed, logOtpRequested, logOtpVerified } from './otp-logging.js';

export const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_COOLDOWN_SECONDS = 45;

export const GENERIC_SEND_SUCCESS = 'If the email is valid, a verification code has been sent.';

const GENERIC_VERIFY_FAILURE = 'Invalid or expired verification code.';

function toOtpDeliveryPurpose(purpose: EmailOtpPurpose): 'signup' | 'login' {
  return purpose === EmailOtpPurpose.LOGIN ? 'login' : 'signup';
}

export function toEmailOtpPurpose(purpose?: string): EmailOtpPurpose {
  switch (purpose?.toLowerCase()) {
    case 'signup':
      return EmailOtpPurpose.SIGNUP;
    case 'login':
      return EmailOtpPurpose.LOGIN;
    case 'verify_email':
    case 'verify-email':
      return EmailOtpPurpose.VERIFY_EMAIL;
    default:
      return EmailOtpPurpose.VERIFY_EMAIL;
  }
}

export function purposeToApiLabel(purpose: EmailOtpPurpose): string {
  switch (purpose) {
    case EmailOtpPurpose.SIGNUP:
      return 'signup';
    case EmailOtpPurpose.LOGIN:
      return 'login';
    default:
      return 'verify_email';
  }
}

export async function sendEmailOtp(
  email: string,
  purpose: EmailOtpPurpose = EmailOtpPurpose.VERIFY_EMAIL,
): Promise<void> {
  await assertOtpChannelEnabled(OtpChannel.EMAIL);

  const normalized = normalizeEmail(email);
  const now = new Date();

  const recent = await prisma.emailOtp.findFirst({
    where: { email: normalized, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < EMAIL_OTP_COOLDOWN_SECONDS * 1000) {
    throw badRequest(
      `Please wait ${EMAIL_OTP_COOLDOWN_SECONDS} seconds before requesting another code.`,
    );
  }

  await prisma.emailOtp.updateMany({
    where: { email: normalized, purpose, consumedAt: null },
    data: { consumedAt: now },
  });

  const plainOtp = generateSixDigitOtp('EMAIL');
  const otpHash = hashOtpCode(plainOtp);
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);

  await prisma.emailOtp.create({
    data: {
      email: normalized,
      otpHash,
      purpose,
      expiresAt,
    },
  });

  const deliveryPurpose = toOtpDeliveryPurpose(purpose);
  logOtpRequested(OtpChannel.EMAIL, normalized, deliveryPurpose);

  try {
    await getOtpDeliveryProvider('EMAIL').send({
      channel: 'EMAIL',
      target: normalized,
      code: plainOtp,
      purpose: deliveryPurpose,
    });
  } catch (err) {
    logOtpFailed(OtpChannel.EMAIL, normalized, err instanceof Error ? err.message : 'send_failed');
    throw err;
  }
}

export async function verifyEmailOtp(
  email: string,
  otp: string,
  purpose: EmailOtpPurpose = EmailOtpPurpose.VERIFY_EMAIL,
): Promise<void> {
  await assertOtpChannelEnabled(OtpChannel.EMAIL);

  const normalized = normalizeEmail(email);
  const record = await prisma.emailOtp.findFirst({
    where: { email: normalized, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record || record.expiresAt <= new Date()) {
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  if (record.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  const valid = verifyOtpCode(otp, record.otpHash);
  if (!valid) {
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    logOtpFailed(OtpChannel.EMAIL, normalized, 'invalid_code');
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  const verifiedAt = new Date();
  await prisma.$transaction([
    prisma.emailOtp.update({
      where: { id: record.id },
      data: { consumedAt: verifiedAt },
    }),
    prisma.user.updateMany({
      where: { email: normalized },
      data: { emailVerified: true },
    }),
  ]);

  logOtpVerified(OtpChannel.EMAIL, normalized, purposeToApiLabel(purpose));
}
