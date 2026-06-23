import { OtpChannel } from '@prisma/client';
import { env } from '../../../config/env.js';
import { logOtpDispatched, logOtpMock } from '../otp-logging.js';

export interface PhoneOtpProvider {
  send(phone: string, code: string): Promise<void>;
}

const MSG91_ENDPOINT = 'https://control.msg91.com/api/v5/otp';

class Msg91Provider implements PhoneOtpProvider {
  async send(phone: string, code: string): Promise<void> {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
      throw new Error(
        'MSG91 provider requires MSG91_AUTH_KEY and MSG91_TEMPLATE_ID env vars',
      );
    }
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
    logOtpDispatched(OtpChannel.PHONE, phone, 'MSG91');
  }
}

class MockPhoneOtpProvider implements PhoneOtpProvider {
  async send(phone: string, code: string): Promise<void> {
    logOtpMock(OtpChannel.PHONE, phone, code);
  }
}

class NotImplementedPhoneProvider implements PhoneOtpProvider {
  constructor(private name: string) {}

  async send(phone: string, code: string): Promise<void> {
    logOtpMock(OtpChannel.PHONE, phone, code);
    logOtpDispatched(OtpChannel.PHONE, phone, `${this.name}_PLACEHOLDER`);
  }
}

let cached: PhoneOtpProvider | null = null;

export function getPhoneOtpProvider(): PhoneOtpProvider {
  if (cached) return cached;

  switch (env.PHONE_OTP_PROVIDER) {
    case 'MSG91':
      cached = new Msg91Provider();
      break;
    case 'TWILIO':
      cached = new NotImplementedPhoneProvider('TWILIO');
      break;
    case 'MOCK':
    default:
      cached = new MockPhoneOtpProvider();
      break;
  }
  return cached;
}

export function resetPhoneOtpProviderForTests(): void {
  cached = null;
}

/** @deprecated Use getPhoneOtpProvider */
export const getOtpProvider = getPhoneOtpProvider;
