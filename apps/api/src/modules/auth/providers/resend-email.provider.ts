import { OtpChannel } from '@prisma/client';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { maskOtpLogFields } from '../otp-target.js';
import type { OtpDeliveryProvider, OtpDeliverySendInput } from './types.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

/** Resend hosted-template send payload (REST API). */
type ResendTemplateEmailPayload = {
  to: string[];
  template: {
    id: string;
    variables: Record<string, string>;
  };
};

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

/**
 * Email delivery only — sends OTP via Resend REST API (hosted template).
 * Does NOT persist OTP rows. Storage lifecycle: otp.service.ts → AuthOtp.
 * See docs/OTP_STORAGE.md.
 */
export class ResendEmailOtpProvider implements OtpDeliveryProvider {
  async send(input: OtpDeliverySendInput): Promise<void> {
    if (input.channel !== 'EMAIL') {
      throw new Error('ResendEmailOtpProvider only supports EMAIL channel');
    }

    const apiKey = env.RESEND_API_KEY;
    const templateId = env.RESEND_OTP_TEMPLATE_ID;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required when EMAIL_OTP_PROVIDER=RESEND');
    }
    if (!templateId) {
      throw new Error('RESEND_OTP_TEMPLATE_ID is required when EMAIL_OTP_PROVIDER=RESEND');
    }

    const maskedFields = maskOtpLogFields(OtpChannel.EMAIL, input.target);

    const payload: ResendTemplateEmailPayload = {
      to: [input.target],
      template: {
        id: templateId,
        variables: {
          CODE: input.code,
          EXPIRES_MINUTES: String(env.RESEND_OTP_EXPIRES_MINUTES),
          APP_NAME: 'Circuit',
        },
      },
    };

    const response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as ResendSendResponse;

    if (!response.ok) {
      const detail = body.message ?? 'Unknown error';
      logger.error({ ...maskedFields, provider: 'RESEND', status: body.name }, 'auth.otp_failed');
      throw new Error(`Resend email failed: ${detail}`);
    }

    logger.info(
      { ...maskedFields, provider: 'RESEND', messageId: body.id },
      'auth.otp_dispatched',
    );
  }
}
