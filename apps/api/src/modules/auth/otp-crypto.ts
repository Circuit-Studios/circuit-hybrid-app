import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

const DEV_FIXED_OTP = '111111';

/**
 * HMAC-SHA256 hash of a one-time code using OTP_SECRET.
 * Only the digest is persisted — never store or log the plain OTP.
 */
export function hashOtpCode(plainOtp: string): string {
  return createHmac('sha256', env.OTP_SECRET).update(plainOtp).digest('hex');
}

/** Timing-safe comparison of a submitted OTP against a stored HMAC digest. */
export function verifyOtpCode(plainOtp: string, storedHash: string): boolean {
  const computed = hashOtpCode(plainOtp);
  try {
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function generateSixDigitOtp(channel: 'EMAIL' | 'PHONE'): string {
  const providerIsMock =
    channel === 'EMAIL'
      ? env.EMAIL_OTP_PROVIDER === 'MOCK'
      : env.PHONE_OTP_PROVIDER === 'MOCK';

  if (
    providerIsMock &&
    (env.APP_ENV !== 'prod' || env.ALLOW_MOCK_OTP_IN_PROD)
  ) {
    return DEV_FIXED_OTP;
  }
  return randomInt(100_000, 1_000_000).toString();
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
