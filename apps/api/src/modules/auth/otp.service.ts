import { OtpChannel } from '@prisma/client';
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
import { generateSixDigitOtp, hashOtpCode, verifyOtpCode } from './otp-crypto.js';
import { sendEmailOtp, toAuthOtpPurpose, verifyEmailOtp } from './email-otp.service.js';
import { assertOtpChannelEnabled } from './verification-policy.js';
import { logOtpFailed, logOtpRequested, logOtpVerified } from './otp-logging.js';

export interface RequestOtpInput {
  channel: OtpChannel;
  target: string;
  purpose?: 'signup' | 'login';
}

export interface VerifyOtpInput {
  channel: OtpChannel;
  target: string;
  code: string;
  purpose?: 'signup' | 'login';
}

export async function requestOtp({ channel, target, purpose }: RequestOtpInput): Promise<void> {
  await assertOtpChannelEnabled(channel);

  if (channel === OtpChannel.EMAIL) {
    await sendEmailOtp(target, toAuthOtpPurpose(purpose));
    return;
  }

  const normalized = normalizeOtpTarget(channel, target);
  const otpPurpose = toAuthOtpPurpose(purpose);
  const activeWhere = activeAuthOtpWhere(channel, normalized, otpPurpose);

  const recent = await prisma.authOtp.findFirst({
    where: activeWhere,
    orderBy: { createdAt: 'desc' },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    throw badRequest(
      `Please wait before requesting another code (${OTP_RESEND_COOLDOWN_SECONDS}s).`,
    );
  }

  const purposeLabel = purpose ?? 'login';
  logOtpRequested(channel, normalized, purposeLabel);

  const plainOtp = generateSixDigitOtp('PHONE');
  const codeHash = hashOtpCode(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.authOtp.updateMany({
    where: activeWhere,
    data: consumeAuthOtpData(new Date()),
  });

  await prisma.authOtp.create({
    data: {
      channel,
      target: normalized,
      phone: normalized,
      purpose: otpPurpose,
      codeHash,
      expiresAt,
    },
  });

  try {
    await getOtpDeliveryProvider('PHONE').send({
      channel: 'PHONE',
      target: normalized,
      code: plainOtp,
      purpose: purposeLabel,
    });
  } catch (err) {
    logOtpFailed(channel, normalized, err instanceof Error ? err.message : 'send_failed');
    throw err;
  }
}

export async function verifyOtp({ channel, target, code, purpose }: VerifyOtpInput): Promise<true> {
  await assertOtpChannelEnabled(channel);

  if (channel === OtpChannel.EMAIL) {
    await verifyEmailOtp(target, code, toAuthOtpPurpose(purpose));
    return true;
  }

  const normalized = normalizeOtpTarget(channel, target);
  const otpPurpose = toAuthOtpPurpose(purpose);
  const candidate = await prisma.authOtp.findFirst({
    where: {
      ...activeAuthOtpWhere(channel, normalized, otpPurpose),
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!candidate) {
    throw unauthorized('Invalid or expired verification code.');
  }

  if (candidate.attempts >= OTP_MAX_ATTEMPTS) {
    throw unauthorized('Invalid or expired verification code.');
  }

  const ok = verifyOtpCode(code, candidate.codeHash);
  if (!ok) {
    await prisma.authOtp.update({
      where: { id: candidate.id },
      data: { attempts: { increment: 1 } },
    });
    logOtpFailed(channel, normalized, 'invalid_code');
    throw unauthorized('Invalid or expired verification code.');
  }

  await prisma.authOtp.update({
    where: { id: candidate.id },
    data: consumeAuthOtpData(new Date()),
  });
  logOtpVerified(channel, normalized, purpose ?? 'login');
  return true;
}
