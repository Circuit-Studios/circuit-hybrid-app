import { OtpChannel, OtpPurpose } from '@prisma/client';

/**
 * Single entry point for AuthOtp row shapes (active / consumed).
 *
 * All OTP persistence goes through AuthOtp — never EmailOtp or channel-specific tables.
 * Issue/verify logic: otp.service.ts.
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
} {
  return { channel, target, purpose, consumedAt: null };
}

export function consumeAuthOtpData(at: Date): { consumedAt: Date } {
  return { consumedAt: at };
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
  target: string;
} {
  return { channel: OtpChannel.PHONE, target: phone };
}
