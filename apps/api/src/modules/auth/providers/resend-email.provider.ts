import { OtpChannel } from '@prisma/client';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { maskOtpTarget } from '../otp-target.js';
import type { OtpDeliveryProvider, OtpDeliverySendInput } from './types.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

/**
 * Sends OTP email via a Resend dashboard-hosted template (id/alias + variables).
 * From and Subject are configured on the template — not required in the send payload.
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

    const masked = maskOtpTarget(OtpChannel.EMAIL, input.target);

    const response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [input.target],
        template: {
          id: templateId,
          variables: {
            CODE: input.code,
            EXPIRES_MINUTES: String(env.RESEND_OTP_EXPIRES_MINUTES),
            APP_NAME: 'Circuit',
          },
        },
      }),
    });

    const body = (await response.json().catch(() => ({}))) as ResendSendResponse;
    if (!response.ok) {
      const detail = body.message ?? body.name ?? response.statusText;
      logger.error(
        { email: masked, provider: 'RESEND', status: response.status },
        'auth.otp_failed',
      );
      throw new Error(`Resend email failed: ${detail}`);
    }

    logger.info({ email: masked, provider: 'RESEND', messageId: body.id }, 'auth.otp_dispatched');
  }
}
