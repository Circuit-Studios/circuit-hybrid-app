import { OtpChannel } from '@prisma/client';
import { env } from '../../../config/env.js';
import { logOtpDispatched, logOtpMock } from '../otp-logging.js';
import { ResendEmailOtpProvider } from './resend-email.provider.js';
import type { OtpDeliveryChannel, OtpDeliveryProvider, OtpDeliverySendInput } from './types.js';

const MSG91_ENDPOINT = 'https://control.msg91.com/api/v5/otp';

class MockOtpDeliveryProvider implements OtpDeliveryProvider {
  async send(input: OtpDeliverySendInput): Promise<void> {
    const channel = input.channel === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.PHONE;
    logOtpMock(channel, input.target, input.code);
  }
}

class Msg91PhoneProvider implements OtpDeliveryProvider {
  async send(input: OtpDeliverySendInput): Promise<void> {
    if (input.channel !== 'PHONE') {
      throw new Error('MSG91 provider only supports PHONE channel');
    }
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
      throw new Error('MSG91 provider requires MSG91_AUTH_KEY and MSG91_TEMPLATE_ID env vars');
    }

    const mobile = input.target.replace(/^\+/, '');
    const url = `${MSG91_ENDPOINT}?template_id=${encodeURIComponent(
      env.MSG91_TEMPLATE_ID,
    )}&mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(input.code)}${
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
    logOtpDispatched(OtpChannel.PHONE, input.target, 'MSG91');
  }
}

class NotImplementedPhoneProvider implements OtpDeliveryProvider {
  constructor(private name: string) {}

  async send(input: OtpDeliverySendInput): Promise<void> {
    if (input.channel !== 'PHONE') {
      throw new Error(`${this.name} provider only supports PHONE channel`);
    }
    throw new Error(`${this.name} phone OTP provider is not implemented yet`);
  }
}

const emailProviders = new Map<string, OtpDeliveryProvider>();
const phoneProviders = new Map<string, OtpDeliveryProvider>();

function getEmailProvider(): OtpDeliveryProvider {
  const key = env.EMAIL_OTP_PROVIDER;
  const cached = emailProviders.get(key);
  if (cached) return cached;

  const provider =
    key === 'RESEND' ? new ResendEmailOtpProvider() : new MockOtpDeliveryProvider();
  emailProviders.set(key, provider);
  return provider;
}

function getPhoneProvider(): OtpDeliveryProvider {
  const key = env.PHONE_OTP_PROVIDER;
  const cached = phoneProviders.get(key);
  if (cached) return cached;

  let provider: OtpDeliveryProvider;
  switch (key) {
    case 'MSG91':
      provider = new Msg91PhoneProvider();
      break;
    case 'TWILIO':
      provider = new NotImplementedPhoneProvider('TWILIO');
      break;
    case 'MOCK':
    default:
      provider = new MockOtpDeliveryProvider();
      break;
  }
  phoneProviders.set(key, provider);
  return provider;
}

export function getOtpDeliveryProvider(channel: OtpDeliveryChannel): OtpDeliveryProvider {
  return channel === 'EMAIL' ? getEmailProvider() : getPhoneProvider();
}

export function resetOtpDeliveryProvidersForTests(): void {
  emailProviders.clear();
  phoneProviders.clear();
}

export type { OtpDeliveryChannel, OtpDeliveryProvider, OtpDeliveryPurpose, OtpDeliverySendInput } from './types.js';
export { ResendEmailOtpProvider };
