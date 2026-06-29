import { describe, expect, it } from 'vitest';
import { hashOtpCode, normalizeEmail, verifyOtpCode } from '../../src/modules/auth/otp-crypto.js';

describe('otp-crypto', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  User@Studio.COM ')).toBe('user@studio.com');
  });

  it('hashes and verifies OTP with HMAC-SHA256', () => {
    const hash = hashOtpCode('123456');
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe('123456');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyOtpCode('123456', hash)).toBe(true);
    expect(verifyOtpCode('000000', hash)).toBe(false);
  });
});
