import { OtpChannel } from '@prisma/client';
import { Resend } from 'resend';
import { env } from '../../../config/env.js';
import { logOtpDispatched } from '../otp-logging.js';

export interface EmailOtpProvider {
  send(email: string, code: string): Promise<void>;
}

class MockEmailOtpProvider implements EmailOtpProvider {
  async send(email: string, code: string): Promise<void> {
    const { logOtpMock } = await import('../otp-logging.js');
    logOtpMock(OtpChannel.EMAIL, email, code);
  }
}

class ResendEmailOtpProvider implements EmailOtpProvider {
  private client: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_EMAIL provider requires RESEND_API_KEY');
    }
    this.client = new Resend(env.RESEND_API_KEY);
  }

  async send(email: string, code: string): Promise<void> {
    if (!env.RESEND_FROM_EMAIL) {
      throw new Error('RESEND_EMAIL provider requires RESEND_FROM_EMAIL');
    }

    const payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
      replyTo?: string;
    } = {
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Your Circuit verification code',
      text: `Your Circuit verification code is ${code}. It expires in 5 minutes.`,
    };
    if (env.RESEND_REPLY_TO) {
      payload.replyTo = env.RESEND_REPLY_TO;
    }

    const { error } = await this.client.emails.send(payload);

    if (error) {
      throw new Error(`Resend email failed: ${error.message}`);
    }

    logOtpDispatched(OtpChannel.EMAIL, email, 'RESEND');
  }
}

let cached: EmailOtpProvider | null = null;

export function getEmailOtpProvider(): EmailOtpProvider {
  if (cached) return cached;

  if (env.OTP_PROVIDER === 'RESEND_EMAIL' && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    cached = new ResendEmailOtpProvider();
    return cached;
  }

  cached = new MockEmailOtpProvider();
  return cached;
}

export function resetEmailOtpProviderForTests(): void {
  cached = null;
}
