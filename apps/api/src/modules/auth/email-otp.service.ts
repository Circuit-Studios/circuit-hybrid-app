import { OtpChannel, OtpPurpose } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, unauthorized } from '../../lib/http.js';
import { OTP_MAX_ATTEMPTS } from './auth.constants.js';
import { activeAuthOtpWhere, consumeAuthOtpData } from './auth-otp.store.js';
import { generateSixDigitOtp, hashOtpCode, normalizeEmail, verifyOtpCode } from './otp-crypto.js';
import { getOtpDeliveryProvider } from './providers/otp-delivery.js';
import { assertOtpChannelEnabled } from './verification-policy.js';
import { logOtpFailed, logOtpRequested, logOtpVerified } from './otp-logging.js';

export const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;
export const EMAIL_OTP_MAX_ATTEMPTS = OTP_MAX_ATTEMPTS;
export const EMAIL_OTP_COOLDOWN_SECONDS = 45;

export const GENERIC_SEND_SUCCESS = 'If the email is valid, a verification code has been sent.';

const GENERIC_VERIFY_FAILURE = 'Invalid or expired verification code.';

function toOtpDeliveryPurpose(purpose: OtpPurpose): 'signup' | 'login' {
  return purpose === OtpPurpose.LOGIN ? 'login' : 'signup';
}

export function toOtpPurpose(purpose?: string): OtpPurpose {
  switch (purpose?.toLowerCase()) {
    case 'signup':
      return OtpPurpose.SIGNUP;
    case 'login':
      return OtpPurpose.LOGIN;
    case 'verify_email':
    case 'verify-email':
      return OtpPurpose.VERIFY_EMAIL;
    default:
      return OtpPurpose.VERIFY_EMAIL;
  }
}

/** Auth signup/login flows default to LOGIN when purpose is omitted. */
export function toAuthOtpPurpose(purpose?: 'signup' | 'login'): OtpPurpose {
  return purpose === 'signup' ? OtpPurpose.SIGNUP : OtpPurpose.LOGIN;
}

/** @deprecated Use toOtpPurpose */
export const toEmailOtpPurpose = toOtpPurpose;

export function purposeToApiLabel(purpose: OtpPurpose): string {
  switch (purpose) {
    case OtpPurpose.SIGNUP:
      return 'signup';
    case OtpPurpose.LOGIN:
      return 'login';
    default:
      return 'verify_email';
  }
}

export async function sendEmailOtp(
  email: string,
  purpose: OtpPurpose = OtpPurpose.VERIFY_EMAIL,
): Promise<void> {
  await assertOtpChannelEnabled(OtpChannel.EMAIL);

  const normalized = normalizeEmail(email);
  const now = new Date();
  const activeWhere = activeAuthOtpWhere(OtpChannel.EMAIL, normalized, purpose);

  const recent = await prisma.authOtp.findFirst({
    where: activeWhere,
    orderBy: { createdAt: 'desc' },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < EMAIL_OTP_COOLDOWN_SECONDS * 1000) {
    throw badRequest(
      `Please wait ${EMAIL_OTP_COOLDOWN_SECONDS} seconds before requesting another code.`,
    );
  }

  await prisma.authOtp.updateMany({
    where: activeWhere,
    data: consumeAuthOtpData(now),
  });

  const plainOtp = generateSixDigitOtp('EMAIL');
  const codeHash = hashOtpCode(plainOtp);
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);

  await prisma.authOtp.create({
    data: {
      channel: OtpChannel.EMAIL,
      target: normalized,
      purpose,
      codeHash,
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
  purpose: OtpPurpose = OtpPurpose.VERIFY_EMAIL,
): Promise<void> {
  await assertOtpChannelEnabled(OtpChannel.EMAIL);

  const normalized = normalizeEmail(email);
  const record = await prisma.authOtp.findFirst({
    where: activeAuthOtpWhere(OtpChannel.EMAIL, normalized, purpose),
    orderBy: { createdAt: 'desc' },
  });

  if (!record || record.expiresAt <= new Date()) {
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  const valid = verifyOtpCode(otp, record.codeHash);
  if (!valid) {
    await prisma.authOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    logOtpFailed(OtpChannel.EMAIL, normalized, 'invalid_code');
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  const verifiedAt = new Date();
  await prisma.$transaction([
    prisma.authOtp.update({
      where: { id: record.id },
      data: consumeAuthOtpData(verifiedAt),
    }),
    prisma.user.updateMany({
      where: { email: normalized },
      data: { emailVerified: true },
    }),
  ]);

  logOtpVerified(OtpChannel.EMAIL, normalized, purposeToApiLabel(purpose));
}
