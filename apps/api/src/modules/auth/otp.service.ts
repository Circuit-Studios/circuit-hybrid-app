import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { badRequest, unauthorized } from '../../lib/http.js';
import { getOtpProvider } from './providers/msg91.provider.js';
import { env } from '../../config/env.js';

import { OTP_TTL_SECONDS } from './auth.constants.js';

const OTP_RESEND_COOLDOWN_SECONDS = 30;

// Dev convenience: when the OTP provider is MOCK (no real SMS), use a fixed
// code so testers don't have to scrape it from server logs. Production
// providers (MSG91, TWILIO, ...) always use a random 6-digit code.
const DEV_FIXED_OTP = '111111';

function generateOtp(): string {
  if (env.OTP_PROVIDER === 'MOCK') return DEV_FIXED_OTP;
  return randomInt(100_000, 1_000_000).toString();
}

async function deliver(phone: string, code: string): Promise<void> {
  await getOtpProvider().send(phone, code);
}

export async function requestOtp(phone: string): Promise<void> {
  const recent = await prisma.authOtp.findFirst({
    where: { phone, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    throw badRequest(`Please wait before requesting another code (${OTP_RESEND_COOLDOWN_SECONDS}s).`);
  }

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.authOtp.create({
    data: { phone, codeHash, expiresAt },
  });

  await deliver(phone, code);
}

export async function verifyOtp(phone: string, code: string): Promise<true> {
  const candidate = await prisma.authOtp.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!candidate) throw unauthorized('No active OTP for this phone number');

  const ok = await bcrypt.compare(code, candidate.codeHash);
  if (!ok) throw unauthorized('Invalid OTP');

  await prisma.authOtp.update({
    where: { id: candidate.id },
    data: { consumed: true },
  });
  return true;
}
