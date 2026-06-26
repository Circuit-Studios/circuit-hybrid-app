import { describe, expect, it } from 'vitest';
import {
  generateSixDigitOtp,
  hashOtpCode,
  normalizeEmail,
  verifyOtpCode,
} from '../../src/modules/auth/otp-crypto.js';

describe('otp-crypto', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  User@Studio.COM ')).toBe('user@studio.com');
  });

  it('hashes OTP with HMAC-SHA256 (hex digest, not plain text)', () => {
    const hash = hashOtpCode('123456');
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe('123456');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verifies OTP with timing-safe compare', () => {
    const hash = hashOtpCode('123456');
    expect(verifyOtpCode('123456', hash)).toBe(true);
    expect(verifyOtpCode('000000', hash)).toBe(false);
  });

  it('uses fixed OTP in MOCK dev mode', () => {
    expect(generateSixDigitOtp('EMAIL')).toBe('111111');
    expect(generateSixDigitOtp('PHONE')).toBe('111111');
  });
});
