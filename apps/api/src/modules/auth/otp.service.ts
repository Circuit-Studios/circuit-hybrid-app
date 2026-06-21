import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { badRequest, unauthorized } from '../../lib/http.js';
import { getEmailOtpProvider } from './providers/email-otp.provider.js';
import { env } from '../../config/env.js';
import { OTP_TTL_SECONDS } from './auth.constants.js';

const OTP_RESEND_COOLDOWN_SECONDS = 30;
const DEV_FIXED_OTP = '111111';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateOtp(): string {
  if (env.OTP_EMAIL_PROVIDER === 'MOCK') return DEV_FIXED_OTP;
  return randomInt(100_000, 1_000_000).toString();
}

export async function requestOtp(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const recent = await prisma.authOtp.findFirst({
    where: { email: normalized, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    throw badRequest(`Please wait before requesting another code (${OTP_RESEND_COOLDOWN_SECONDS}s).`);
  }

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.authOtp.create({
    data: { email: normalized, codeHash, expiresAt },
  });

  await getEmailOtpProvider().send(normalized, code);
}

export async function verifyOtp(email: string, code: string): Promise<true> {
  const normalized = normalizeEmail(email);
  const candidate = await prisma.authOtp.findFirst({
    where: { email: normalized, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!candidate) throw unauthorized('No active OTP for this email address');

  const ok = await bcrypt.compare(code, candidate.codeHash);
  if (!ok) throw unauthorized('Invalid OTP');

  await prisma.authOtp.update({
    where: { id: candidate.id },
    data: { consumed: true },
  });
  return true;
}
