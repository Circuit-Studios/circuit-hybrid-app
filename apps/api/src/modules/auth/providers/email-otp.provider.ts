import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';

export interface EmailOtpProvider {
  send(email: string, code: string): Promise<void>;
}

class MockEmailOtpProvider implements EmailOtpProvider {
  async send(email: string, code: string): Promise<void> {
    logger.info({ email, code }, '[OTP EMAIL MOCK] verification code (dev only)');
  }
}

class ResendEmailOtpProvider implements EmailOtpProvider {
  async send(email: string, code: string): Promise<void> {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new Error('RESEND provider requires RESEND_API_KEY and EMAIL_FROM');
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: 'Your Circuit verification code',
        text: `Your Circuit verification code is ${code}. It expires in 5 minutes.`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend email failed (${res.status}): ${body}`);
    }
    logger.info({ email }, 'OTP email dispatched via Resend');
  }
}

let cached: EmailOtpProvider | null = null;

export function getEmailOtpProvider(): EmailOtpProvider {
  if (cached) return cached;
  switch (env.OTP_EMAIL_PROVIDER) {
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
