import { EmailOtpPurpose } from '@prisma/client';
import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { maskOtpTarget } from './otp-target.js';
import { OtpChannel } from '@prisma/client';

export const EMAIL_OTP_SUBJECT = 'Your verification code';

export function buildEmailOtpBody(otp: string): string {
  return `Your verification code is ${otp}. It expires in 10 minutes.`;
}

function resolveFromEmail(): string {
  return env.OTP_FROM_EMAIL ?? env.RESEND_FROM_EMAIL ?? '';
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const masked = maskOtpTarget(OtpChannel.EMAIL, email);

  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production' || env.OTP_PROVIDER === 'RESEND_EMAIL') {
      throw new Error('RESEND_API_KEY is required to send OTP emails');
    }
    logger.debug({ email: masked, provider: 'MOCK' }, 'OTP email mock dispatch (dev only)');
    return;
  }

  const from = resolveFromEmail();
  if (!from) {
    throw new Error('OTP_FROM_EMAIL or RESEND_FROM_EMAIL is required for Resend');
  }

  const client = new Resend(env.RESEND_API_KEY);
  const payload: {
    from: string;
    to: string;
    subject: string;
    text: string;
    replyTo?: string;
  } = {
    from,
    to: email,
    subject: EMAIL_OTP_SUBJECT,
    text: buildEmailOtpBody(otp),
  };
  if (env.RESEND_REPLY_TO) {
    payload.replyTo = env.RESEND_REPLY_TO;
  }

  const { error } = await client.emails.send(payload);
  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }

  logger.info({ email: masked, provider: 'RESEND' }, 'OTP email dispatched');
}
