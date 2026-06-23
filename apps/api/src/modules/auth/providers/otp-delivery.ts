import { OtpChannel } from '@prisma/client';
import { env } from '../../../config/env.js';
import { logOtpMock } from '../otp-logging.js';
import { Msg91PhoneProvider } from './msg91-phone.provider.js';
import { ResendEmailOtpProvider } from './resend-email.provider.js';
import type { OtpDeliveryChannel, OtpDeliveryProvider, OtpDeliverySendInput } from './types.js';

class MockOtpDeliveryProvider implements OtpDeliveryProvider {
  async send(input: OtpDeliverySendInput): Promise<void> {
    const channel = input.channel === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.PHONE;
    logOtpMock(channel, input.target, input.code);
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

  const provider = key === 'RESEND' ? new ResendEmailOtpProvider() : new MockOtpDeliveryProvider();
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

export type {
  OtpDeliveryChannel,
  OtpDeliveryProvider,
  OtpDeliveryPurpose,
  OtpDeliverySendInput,
} from './types.js';
export { Msg91PhoneProvider } from './msg91-phone.provider.js';
export { ResendEmailOtpProvider };
