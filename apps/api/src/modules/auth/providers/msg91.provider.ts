// MSG91 SMS OTP adapter. We keep the provider behind an interface so we can
// swap in Twilio / Plivo / a vendor-of-the-week without touching otp.service.

import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';

export interface OtpProvider {
  send(phone: string, code: string): Promise<void>;
}

const MSG91_ENDPOINT = 'https://control.msg91.com/api/v5/otp';

class Msg91Provider implements OtpProvider {
  async send(phone: string, code: string): Promise<void> {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
      throw new Error(
        'MSG91 provider requires MSG91_AUTH_KEY and MSG91_TEMPLATE_ID env vars',
      );
    }
    // MSG91 expects mobile without the leading '+'.
    const mobile = phone.replace(/^\+/, '');
    const url = `${MSG91_ENDPOINT}?template_id=${encodeURIComponent(
      env.MSG91_TEMPLATE_ID,
    )}&mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(code)}${
      env.MSG91_SENDER_ID ? `&sender=${encodeURIComponent(env.MSG91_SENDER_ID)}` : ''
    }`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authkey: env.MSG91_AUTH_KEY,
        accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MSG91 send failed (${res.status}): ${body}`);
    }
    const json = (await res.json()) as { type?: string; message?: string };
    if (json.type && json.type !== 'success') {
      throw new Error(`MSG91 rejected the request: ${json.message ?? 'unknown error'}`);
    }
    logger.info({ phone }, 'MSG91 OTP dispatched');
  }
}

class MockProvider implements OtpProvider {
  async send(phone: string, code: string): Promise<void> {
    logger.info({ phone, code }, '[OTP MOCK] code generated (do not log in production!)');
  }
}

class NotImplementedProvider implements OtpProvider {
  constructor(private name: string) {}
  async send(phone: string, code: string): Promise<void> {
    logger.warn(
      { phone, provider: this.name },
      `${this.name} OTP provider not implemented; falling back to console log`,
    );
    logger.info({ phone, code }, '[OTP DEV] code (placeholder until provider wired)');
  }
}

let cached: OtpProvider | null = null;

export function getOtpProvider(): OtpProvider {
  if (cached) return cached;
  switch (env.OTP_PROVIDER) {
    case 'MSG91':
      cached = new Msg91Provider();
      break;
    case 'TWILIO':
      cached = new NotImplementedProvider('TWILIO');
      break;
    case 'MOCK':
    default:
      cached = new MockProvider();
      break;
  }
  return cached;
}
