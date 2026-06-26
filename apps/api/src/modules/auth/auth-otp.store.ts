import { OtpChannel, OtpPurpose } from '@prisma/client';

/**
 * Single entry point for AuthOtp row shapes (active / consumed).
 *
 * All OTP persistence goes through AuthOtp — never EmailOtp or channel-specific tables.
 * Issue/verify logic: otp.service.ts. Policy: docs/OTP_STORAGE.md
 *
 * TODO: add helpers here for any direct prisma.authOtp usage in auth.routes.ts
 * (e.g. password-reset invalidation) so queries stay centralized.
 */
export function activeAuthOtpWhere(
  channel: OtpChannel,
  target: string,
  purpose: OtpPurpose,
): {
  channel: OtpChannel;
  target: string;
  purpose: OtpPurpose;
  consumedAt: null;
  consumed: false;
} {
  return { channel, target, purpose, consumedAt: null, consumed: false };
}

export function consumeAuthOtpData(at: Date): { consumedAt: Date; consumed: true } {
  return { consumedAt: at, consumed: true };
}

/** AuthOtp rows keyed by email target (often userId=null — formerly EmailOtp). */
export function authOtpDeleteByEmailTargetWhere(email: string): {
  channel: typeof OtpChannel.EMAIL;
  target: string;
} {
  return { channel: OtpChannel.EMAIL, target: email };
}

/** AuthOtp rows keyed by phone target (often userId=null). */
export function authOtpDeleteByPhoneTargetWhere(phone: string): {
  channel: typeof OtpChannel.PHONE;
  OR: Array<{ target: string } | { phone: string }>;
} {
  return {
    channel: OtpChannel.PHONE,
    OR: [{ target: phone }, { phone }],
  };
}
