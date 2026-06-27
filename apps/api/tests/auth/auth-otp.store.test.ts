import { describe, expect, it } from 'vitest';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import {
  activeAuthOtpWhere,
  authOtpDeleteByPhoneTargetWhere,
  consumeAuthOtpData,
} from '../../src/modules/auth/auth-otp.store.js';

describe('auth-otp.store', () => {
  it('treats active OTPs as rows with consumedAt null', () => {
    expect(activeAuthOtpWhere(OtpChannel.EMAIL, 'user@studio.com', OtpPurpose.SIGNUP)).toEqual({
      channel: OtpChannel.EMAIL,
      target: 'user@studio.com',
      purpose: OtpPurpose.SIGNUP,
      consumedAt: null,
    });
  });

  it('marks consumption with consumedAt only', () => {
    const at = new Date('2026-06-24T12:00:00.000Z');
    expect(consumeAuthOtpData(at)).toEqual({ consumedAt: at });
  });

  it('deletes phone OTP rows by target only', () => {
    expect(authOtpDeleteByPhoneTargetWhere('+919812345678')).toEqual({
      channel: OtpChannel.PHONE,
      target: '+919812345678',
    });
  });
});
