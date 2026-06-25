import { describe, expect, it } from 'vitest';
import { OtpChannel } from '@prisma/client';
import {
  isValidOtpTarget,
  maskOtpLogFields,
  maskOtpTarget,
  normalizeOtpTarget,
} from '../../src/modules/auth/otp-target.js';

describe('otp-target', () => {
  it('normalizes email to lowercase', () => {
    expect(normalizeOtpTarget(OtpChannel.EMAIL, '  User@Studio.COM ')).toBe('user@studio.com');
  });

  it('normalizes phone as E.164', () => {
    expect(normalizeOtpTarget(OtpChannel.PHONE, '+919812345678')).toBe('+919812345678');
  });

  it('validates email and phone targets', () => {
    expect(isValidOtpTarget(OtpChannel.EMAIL, 'you@studio.com')).toBe(true);
    expect(isValidOtpTarget(OtpChannel.EMAIL, 'bad')).toBe(false);
    expect(isValidOtpTarget(OtpChannel.PHONE, '+919812345678')).toBe(true);
    expect(isValidOtpTarget(OtpChannel.PHONE, '9988776655')).toBe(false);
  });

  it('masks email without exposing full address', () => {
    const masked = maskOtpTarget(OtpChannel.EMAIL, 'kiran@circuit.app');
    expect(masked).not.toContain('kiran@circuit.app');
    expect(masked).toContain('@');
    expect(maskOtpLogFields(OtpChannel.EMAIL, 'kiran@circuit.app')).toEqual({
      targetMasked: masked,
      emailMasked: masked,
    });
  });

  it('masks phone without exposing full number', () => {
    const masked = maskOtpTarget(OtpChannel.PHONE, '+919812345678');
    expect(masked).not.toBe('+919812345678');
    expect(masked).toContain('***');
    expect(maskOtpLogFields(OtpChannel.PHONE, '+919812345678')).toEqual({
      targetMasked: masked,
      phoneMasked: masked,
    });
  });
});
