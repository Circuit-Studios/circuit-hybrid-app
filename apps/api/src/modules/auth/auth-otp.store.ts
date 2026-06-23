import { OtpChannel, OtpPurpose } from '@prisma/client';

/** Active OTP rows: not consumed via timestamp or legacy boolean flag. */
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
