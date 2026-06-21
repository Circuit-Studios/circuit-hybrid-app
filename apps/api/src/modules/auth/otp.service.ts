import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OtpChannel } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, unauthorized } from '../../lib/http.js';
import { env } from '../../config/env.js';
import { OTP_TTL_SECONDS } from './auth.constants.js';
import { normalizeOtpTarget } from './otp-target.js';
import { getEmailOtpProvider } from './providers/resend-email-otp.provider.js';
import { getPhoneOtpProvider } from './providers/phone-otp.provider.js';

export const OTP_RESEND_COOLDOWN_SECONDS = 30;
const DEV_FIXED_OTP = '111111';

export interface RequestOtpInput {
  channel: OtpChannel;
  target: string;
}

export interface VerifyOtpInput {
  channel: OtpChannel;
  target: string;
  code: string;
}

function shouldUseDevFixedOtp(): boolean {
  return env.NODE_ENV !== 'production' && env.OTP_PROVIDER === 'MOCK';
}

function generateOtp(): string {
  if (shouldUseDevFixedOtp()) return DEV_FIXED_OTP;
  return randomInt(100_000, 1_000_000).toString();
}

async function dispatchOtp(channel: OtpChannel, target: string, code: string): Promise<void> {
  if (channel === OtpChannel.EMAIL) {
    await getEmailOtpProvider().send(target, code);
    return;
  }
  await getPhoneOtpProvider().send(target, code);
}

export async function requestOtp({ channel, target }: RequestOtpInput): Promise<void> {
  const normalized = normalizeOtpTarget(channel, target);

  const recent = await prisma.authOtp.findFirst({
    where: { channel, target: normalized, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (
    recent &&
    Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000
  ) {
    throw badRequest(
      `Please wait before requesting another code (${OTP_RESEND_COOLDOWN_SECONDS}s).`,
    );
  }

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.authOtp.create({
    data: { channel, target: normalized, codeHash, expiresAt },
  });

  await dispatchOtp(channel, normalized, code);
}

export async function verifyOtp({ channel, target, code }: VerifyOtpInput): Promise<true> {
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
    const label = channel === OtpChannel.EMAIL ? 'email address' : 'phone number';
    throw unauthorized(`No active OTP for this ${label}`);
  }

  const ok = await bcrypt.compare(code, candidate.codeHash);
  if (!ok) throw unauthorized('Invalid OTP');

  await prisma.authOtp.update({
    where: { id: candidate.id },
    data: { consumed: true },
  });
  return true;
}
