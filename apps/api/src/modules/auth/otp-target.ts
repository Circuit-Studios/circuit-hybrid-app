import { OtpChannel } from '@prisma/client';

const E164_PATTERN = /^\+\d{8,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOtpTarget(channel: OtpChannel, raw: string): string {
  const trimmed = raw.trim();
  if (channel === OtpChannel.EMAIL) {
    return trimmed.toLowerCase();
  }
  if (!trimmed.startsWith('+')) {
    throw new Error('Phone must be E.164 format like +919812345678');
  }
  return trimmed;
}

export function isValidOtpTarget(channel: OtpChannel, raw: string): boolean {
  try {
    const target = normalizeOtpTarget(channel, raw);
    if (channel === OtpChannel.EMAIL) {
      return target.length > 0 && target.length <= 254 && EMAIL_PATTERN.test(target);
    }
    return E164_PATTERN.test(target);
  } catch {
    return false;
  }
}

/** Redact PII for logs — never log full email or phone. */
export function maskOtpTarget(channel: OtpChannel, target: string): string {
  if (channel === OtpChannel.EMAIL) {
    const at = target.indexOf('@');
    if (at <= 1) return '***@***';
    const local = target.slice(0, at);
    const domain = target.slice(at + 1);
    const maskedLocal = local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}***`;
    const dot = domain.lastIndexOf('.');
    const maskedDomain = dot > 0 ? `***${domain.slice(dot)}` : '***';
    return `${maskedLocal}@${maskedDomain}`;
  }
  if (target.length <= 4) return '****';
  return `${target.slice(0, 3)}***${target.slice(-2)}`;
}
