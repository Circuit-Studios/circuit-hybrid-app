import { describe, expect, it } from 'vitest';
import { requestOtpSchema, verifyOtpSchema } from '../../src/modules/auth/auth.schemas.js';

describe('auth OTP schemas', () => {
  it('accepts email OTP request', () => {
    const parsed = requestOtpSchema.parse({
      channel: 'EMAIL',
      email: 'user@studio.com',
      purpose: 'signup',
    });
    expect(parsed.channel).toBe('EMAIL');
  });

  it('accepts phone OTP request', () => {
    const parsed = requestOtpSchema.parse({
      channel: 'PHONE',
      phone: '+919812345678',
      purpose: 'login',
    });
    expect(parsed.channel).toBe('PHONE');
  });

  it('accepts email verify with optional phone on signup', () => {
    const parsed = verifyOtpSchema.parse({
      channel: 'EMAIL',
      email: 'user@studio.com',
      code: '111111',
      signup: {
        firstName: 'Kiran',
        lastName: 'Kumar',
        role: 'DIRECTOR',
        phone: '+919812345678',
      },
    });
    expect(parsed.signup?.phone).toBe('+919812345678');
  });

  it('accepts legacy phone-only request without channel', () => {
    const parsed = requestOtpSchema.parse({
      phone: '+919812345678',
      purpose: 'login',
    });
    expect(parsed.channel).toBe('PHONE');
    expect(parsed.phone).toBe('+919812345678');
  });

  it('strips unknown fields on discriminated channel payloads', () => {
    const parsed = requestOtpSchema.parse({
      channel: 'EMAIL',
      email: 'user@studio.com',
      phone: '+919812345678',
    });
    expect(parsed).toEqual({
      channel: 'EMAIL',
      email: 'user@studio.com',
    });
    expect('phone' in parsed).toBe(false);
  });
});
