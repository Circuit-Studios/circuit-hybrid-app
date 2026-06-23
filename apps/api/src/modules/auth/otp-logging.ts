import { OtpChannel } from '@prisma/client';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { maskOtpTarget } from './otp-target.js';

export function logOtpRequested(channel: OtpChannel, target: string, purpose: string): void {
  logger.info(
    {
      channel,
      target: maskOtpTarget(channel, target),
      purpose,
    },
    'auth.otp_requested',
  );
}

export function logOtpDispatched(channel: OtpChannel, target: string, provider: string): void {
  logger.info(
    {
      channel,
      target: maskOtpTarget(channel, target),
      provider,
    },
    'auth.otp_dispatched',
  );
}

export function logOtpVerified(channel: OtpChannel, target: string, purpose: string): void {
  logger.info(
    {
      channel,
      target: maskOtpTarget(channel, target),
      purpose,
    },
    'auth.otp_verified',
  );
}

export function logOtpFailed(channel: OtpChannel, target: string, reason: string): void {
  logger.warn(
    {
      channel,
      target: maskOtpTarget(channel, target),
      reason,
    },
    'auth.otp_failed',
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
