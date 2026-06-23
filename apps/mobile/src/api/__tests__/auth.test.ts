import { requestOtp, verifyOtp, type RequestOtpInput, type VerifyOtpInput } from '../auth';

describe('auth API payloads', () => {
  it('accepts email signup requestOtp shape', () => {
    const input: RequestOtpInput = {
      channel: 'EMAIL',
      email: 'user@studio.com',
      purpose: 'signup',
    };
    expect(input.channel).toBe('EMAIL');
    expect(input.purpose).toBe('signup');
  });

  it('accepts phone signup requestOtp shape', () => {
    const input: RequestOtpInput = {
      channel: 'PHONE',
      phone: '+919812345678',
      purpose: 'signup',
    };
    expect(input.channel).toBe('PHONE');
  });

  it('accepts email verifyOtp signup shape with phone profile field', () => {
    const input: VerifyOtpInput = {
      channel: 'EMAIL',
      email: 'user@studio.com',
      code: '111111',
      signup: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: 'DIRECTOR',
        phone: '+919812345678',
        password: 'password123',
      },
    };
    expect(input.signup?.phone).toBe('+919812345678');
    expect(input.signup?.password).toBe('password123');
  });
});
