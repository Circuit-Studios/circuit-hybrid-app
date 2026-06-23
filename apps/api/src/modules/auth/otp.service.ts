import { OtpChannel } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, unauthorized } from '../../lib/http.js';
import { OTP_TTL_SECONDS } from './auth.constants.js';
import { normalizeOtpTarget } from './otp-target.js';
import { getOtpDeliveryProvider } from './providers/otp-delivery.js';
import { generateSixDigitOtp, hashOtpCode, verifyOtpCode } from './otp-crypto.js';
import { sendEmailOtp, toEmailOtpPurpose, verifyEmailOtp } from './email-otp.service.js';
import { assertOtpChannelEnabled } from './verification-policy.js';
import { logOtpFailed, logOtpRequested, logOtpVerified } from './otp-logging.js';

export const OTP_RESEND_COOLDOWN_SECONDS = 30;

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
    await sendEmailOtp(target, toEmailOtpPurpose(purpose));
    return;
  }

  const normalized = normalizeOtpTarget(channel, target);

  const recent = await prisma.authOtp.findFirst({
    where: { channel, target: normalized, consumed: false },
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

  await prisma.authOtp.create({
    data: {
      channel,
      target: normalized,
      phone: normalized,
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
    await verifyEmailOtp(target, code, toEmailOtpPurpose(purpose));
    return true;
  }

  const normalized = normalizeOtpTarget(channel, target);
  const candidate = await prisma.authOtp.findFirst({
    where: {
      channel,
      target: normalized,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!candidate) {
    throw unauthorized('Invalid or expired verification code.');
  }

  const ok = verifyOtpCode(code, candidate.codeHash);
  if (!ok) {
    logOtpFailed(channel, normalized, 'invalid_code');
    throw unauthorized('Invalid or expired verification code.');
  }

  await prisma.authOtp.update({
    where: { id: candidate.id },
    data: { consumed: true },
  });
  logOtpVerified(channel, normalized, purpose ?? 'login');
  return true;
}
