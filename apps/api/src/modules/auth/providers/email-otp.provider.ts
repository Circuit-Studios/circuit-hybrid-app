import { OtpChannel } from '@prisma/client';
import { Resend } from 'resend';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { maskOtpTarget } from '../otp-target.js';

export const EMAIL_OTP_SUBJECT = 'Your Circuit verification code';

export interface EmailOtpProvider {
  send(email: string, code: string): Promise<void>;
}

export function buildEmailOtpText(code: string): string {
  return `Your Circuit verification code is ${code}. It expires in 5 minutes.`;
}

export function buildEmailOtpHtml(code: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1c1c1e;">
    <p>Your Circuit verification code is:</p>
    <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
    <p style="color: #666;">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
  </body>
</html>`;
}

function resolveFromEmail(): string {
  return env.OTP_FROM_EMAIL ?? env.RESEND_FROM_EMAIL ?? '';
}

class MockEmailOtpProvider implements EmailOtpProvider {
  async send(email: string, _code: string): Promise<void> {
    const masked = maskOtpTarget(OtpChannel.EMAIL, email);
    logger.debug({ email: masked, provider: 'MOCK' }, 'Email OTP mock dispatch (dev only)');
  }
}

export class ResendEmailOtpProvider implements EmailOtpProvider {
  async send(email: string, code: string): Promise<void> {
    const masked = maskOtpTarget(OtpChannel.EMAIL, email);

    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required when EMAIL_OTP_PROVIDER=RESEND');
    }

    const from = resolveFromEmail();
    if (!from) {
      throw new Error('OTP_FROM_EMAIL or RESEND_FROM_EMAIL is required when EMAIL_OTP_PROVIDER=RESEND');
    }

    const client = new Resend(env.RESEND_API_KEY);
    const payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html: string;
      replyTo?: string;
    } = {
      from,
      to: email,
      subject: EMAIL_OTP_SUBJECT,
      text: buildEmailOtpText(code),
      html: buildEmailOtpHtml(code),
    };
    if (env.RESEND_REPLY_TO) {
      payload.replyTo = env.RESEND_REPLY_TO;
    }

    const { error } = await client.emails.send(payload);
    if (error) {
      throw new Error(`Resend email failed: ${error.message}`);
    }

    logger.info({ email: masked, provider: 'RESEND' }, 'Email OTP dispatched');
  }
}

let cached: EmailOtpProvider | null = null;

export function getEmailOtpProvider(): EmailOtpProvider {
  if (cached) return cached;

  switch (env.EMAIL_OTP_PROVIDER) {
    case 'RESEND':
      cached = new ResendEmailOtpProvider();
      break;
    case 'MOCK':
    default:
      cached = new MockEmailOtpProvider();
      break;
  }
  return cached;
}

export function resetEmailOtpProviderForTests(): void {
  cached = null;
}

/** @deprecated Use getEmailOtpProvider */
export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  await getEmailOtpProvider().send(email, otp);
}
