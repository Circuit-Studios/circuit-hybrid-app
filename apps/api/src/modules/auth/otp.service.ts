/**
 * Unified OTP issue + verify for all channels and purposes.
 *
 * Storage: AuthOtp only (channel + target + purpose). The legacy EmailOtp table
 * was removed — do not add channel-specific OTP services or models.
 *
 * Delivery (send SMS/email) is delegated to providers/; this module owns DB lifecycle.
 * See docs/OTP_STORAGE.md.
 */
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, unauthorized } from '../../lib/http.js';
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
} from './auth.constants.js';
import { activeAuthOtpWhere, consumeAuthOtpData } from './auth-otp.store.js';
import { normalizeOtpTarget } from './otp-target.js';
import { getOtpDeliveryProvider } from './providers/otp-delivery.js';
import { generateSixDigitOtp, hashOtpCode, normalizeEmail, verifyOtpCode } from './otp-crypto.js';
import {
  flowPurposeToOtpPurpose,
  purposeToApiLabel,
  toOtpDeliveryPurpose,
  toOtpPurpose,
  type OtpFlowPurpose,
} from './otp-purpose.js';
import { assertOtpChannelEnabled } from './verification-policy.js';
import { logOtpFailed, logOtpRequested, logOtpVerified } from './otp-logging.js';

export const OTP_TTL_MS = OTP_TTL_SECONDS * 1000;
export const GENERIC_SEND_SUCCESS = 'If the email is valid, a verification code has been sent.';

const GENERIC_VERIFY_FAILURE = 'Invalid or expired verification code.';

export interface RequestOtpInput {
  channel: OtpChannel;
  target: string;
  purpose?: OtpFlowPurpose;
}

export interface VerifyOtpInput {
  channel: OtpChannel;
  target: string;
  code: string;
  purpose?: OtpFlowPurpose;
}

function normalizeTarget(channel: OtpChannel, target: string): string {
  return channel === OtpChannel.EMAIL
    ? normalizeEmail(target)
    : normalizeOtpTarget(channel, target);
}

function deliveryChannel(channel: OtpChannel): 'EMAIL' | 'PHONE' {
  return channel === OtpChannel.EMAIL ? 'EMAIL' : 'PHONE';
}

async function issueOtp(
  channel: OtpChannel,
  target: string,
  otpPurpose: OtpPurpose,
): Promise<void> {
  const normalized = normalizeTarget(channel, target);
  const now = new Date();
  const activeWhere = activeAuthOtpWhere(channel, normalized, otpPurpose);

  const recent = await prisma.authOtp.findFirst({
    where: activeWhere,
    orderBy: { createdAt: 'desc' },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    throw badRequest(
      `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another code.`,
    );
  }

  await prisma.authOtp.updateMany({
    where: activeWhere,
    data: consumeAuthOtpData(now),
  });

  const plainOtp = generateSixDigitOtp(deliveryChannel(channel));
  const codeHash = hashOtpCode(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.authOtp.create({
    data: {
      channel,
      target: normalized,
      phone: channel === OtpChannel.PHONE ? normalized : undefined,
      purpose: otpPurpose,
      codeHash,
      expiresAt,
    },
  });

  const deliveryPurpose = toOtpDeliveryPurpose(otpPurpose);
  logOtpRequested(channel, normalized, purposeToApiLabel(otpPurpose));

  try {
    await getOtpDeliveryProvider(deliveryChannel(channel)).send({
      channel: deliveryChannel(channel),
      target: normalized,
      code: plainOtp,
      purpose: deliveryPurpose,
    });
  } catch (err) {
    logOtpFailed(channel, normalized, err instanceof Error ? err.message : 'send_failed');
    throw err;
  }
}

async function verifyIssuedOtp(
  channel: OtpChannel,
  target: string,
  code: string,
  otpPurpose: OtpPurpose,
): Promise<void> {
  const normalized = normalizeTarget(channel, target);
  const record = await prisma.authOtp.findFirst({
    where: {
      ...activeAuthOtpWhere(channel, normalized, otpPurpose),
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  const valid = verifyOtpCode(code, record.codeHash);
  if (!valid) {
    await prisma.authOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    logOtpFailed(channel, normalized, 'invalid_code');
    throw unauthorized(GENERIC_VERIFY_FAILURE);
  }

  const verifiedAt = new Date();
  if (channel === OtpChannel.EMAIL && otpPurpose === OtpPurpose.VERIFY_EMAIL) {
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
  } else {
    await prisma.authOtp.update({
      where: { id: record.id },
      data: consumeAuthOtpData(verifiedAt),
    });
  }
  logOtpVerified(channel, normalized, purposeToApiLabel(otpPurpose));
}

export async function requestOtp({ channel, target, purpose }: RequestOtpInput): Promise<void> {
  await assertOtpChannelEnabled(channel);
  await issueOtp(channel, target, flowPurposeToOtpPurpose(purpose));
}

export async function verifyOtp({ channel, target, code, purpose }: VerifyOtpInput): Promise<true> {
  await assertOtpChannelEnabled(channel);
  await verifyIssuedOtp(channel, target, code, flowPurposeToOtpPurpose(purpose));
  return true;
}

export { flowPurposeToOtpPurpose, toOtpPurpose };
