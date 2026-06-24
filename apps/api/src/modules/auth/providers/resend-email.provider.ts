import { OtpChannel } from '@prisma/client';
import { Resend } from 'resend';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { maskOtpLogFields } from '../otp-target.js';
import type { OtpDeliveryProvider, OtpDeliverySendInput } from './types.js';

/** Resend hosted-template send payload (SDK types lag the API). */
type ResendTemplateEmailPayload = {
  to: string[];
  template: {
    id: string;
    variables: Record<string, string>;
  };
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

    const maskedFields = maskOtpLogFields(OtpChannel.EMAIL, input.target);
    const resend = new Resend(apiKey);

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

    const { data, error } = await resend.emails.send(
      payload as unknown as Parameters<Resend['emails']['send']>[0],
    );

    if (error) {
      const detail = error.message ?? 'Unknown error';
      logger.error({ ...maskedFields, provider: 'RESEND', status: error.name }, 'auth.otp_failed');
      throw new Error(`Resend email failed: ${detail}`);
    }

    logger.info(
      { ...maskedFields, provider: 'RESEND', messageId: data?.id },
      'auth.otp_dispatched',
    );
  }
}
