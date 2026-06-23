import { OtpChannel } from '@prisma/client';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { maskOtpTarget } from './otp-target.js';

export function logOtpDispatched(channel: OtpChannel, target: string, provider: string): void {
  logger.info(
    {
      channel,
      target: maskOtpTarget(channel, target),
      provider,
    },
    'OTP dispatched',
  );
}

/** Dev/test only — never logs the code in production. */
export function logOtpMock(channel: OtpChannel, target: string, code: string): void {
  if (env.NODE_ENV === 'production') {
    logOtpDispatched(channel, target, 'MOCK');
    return;
  }
  logger.debug(
    {
      channel,
      target: maskOtpTarget(channel, target),
      provider: 'MOCK',
      code,
    },
    'OTP mock code (dev only)',
  );
}
