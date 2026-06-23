import { OtpChannel } from '@prisma/client';
import { env } from '../../config/env.js';
import { badRequest } from '../../lib/http.js';
import { isFeatureEnabled } from '../../config/features.js';

export async function assertOtpChannelEnabled(channel: OtpChannel): Promise<void> {
  const flag = channel === OtpChannel.EMAIL ? 'auth.emailOtp' : 'auth.phoneOtp';
  const enabled = await isFeatureEnabled(flag);
  if (!enabled) {
    throw badRequest(`${channel} OTP is currently disabled`);
  }
}

export function assertSignupChannel(channel: OtpChannel): void {
  const expected = env.SIGNUP_VERIFICATION_CHANNEL;
  if (channel !== expected) {
    throw badRequest(`Signup verification is configured for ${expected} only`);
  }
}

export function assertLoginChannel(channel: OtpChannel): void {
  const mode = env.LOGIN_IDENTIFIER;
  if (mode === 'BOTH') return;

  const expected = mode === 'EMAIL' ? OtpChannel.EMAIL : OtpChannel.PHONE;
  if (channel !== expected) {
    throw badRequest(`Login is configured for ${mode} only`);
  }
}
