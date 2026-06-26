import { OtpChannel } from '@prisma/client';
import { env } from '../../../config/env.js';
import { logOtpDispatched } from '../otp-logging.js';
import type { OtpDeliveryProvider, OtpDeliverySendInput } from './types.js';

const MSG91_ENDPOINT = 'https://control.msg91.com/api/v5/otp';

export class Msg91PhoneProvider implements OtpDeliveryProvider {
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
