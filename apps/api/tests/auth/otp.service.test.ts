import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpChannel } from '@prisma/client';

const prismaMock = {
  authOtp: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/config/features.js', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

const sendEmailOtp = vi.fn().mockResolvedValue(undefined);
const verifyEmailOtp = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/modules/auth/email-otp.service.js', () => ({
  sendEmailOtp,
  verifyEmailOtp,
  toAuthOtpPurpose: (p?: string) => (p === 'signup' ? 'SIGNUP' : 'LOGIN'),
  toOtpPurpose: (p?: string) =>
    p === 'signup' ? 'SIGNUP' : p === 'login' ? 'LOGIN' : 'VERIFY_EMAIL',
  toEmailOtpPurpose: (p?: string) =>
    p === 'signup' ? 'SIGNUP' : p === 'login' ? 'LOGIN' : 'VERIFY_EMAIL',
}));

vi.mock('../../src/modules/auth/providers/otp-delivery.js', () => ({
  getOtpDeliveryProvider: () => ({
    send: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('otp.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OTP_PROVIDER = 'MOCK';
    process.env.NODE_ENV = 'test';
    process.env.OTP_SECRET = 'test-otp-secret-32-chars-minimum!!';
  });

  it('delegates email OTP to email-otp.service', async () => {
    const { requestOtp } = await import('../../src/modules/auth/otp.service.js');
    await requestOtp({
      channel: OtpChannel.EMAIL,
      target: 'user@studio.com',
      purpose: 'signup',
    });
    expect(sendEmailOtp).toHaveBeenCalledWith('user@studio.com', 'SIGNUP');
  });

  it('stores only HMAC hash for phone OTP (never plain code)', async () => {
    prismaMock.authOtp.findFirst.mockResolvedValue(null);
    prismaMock.authOtp.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.authOtp.create.mockResolvedValue({ id: 'otp-1' });

    const { requestOtp } = await import('../../src/modules/auth/otp.service.js');
    await requestOtp({ channel: OtpChannel.PHONE, target: '+919812345678' });

    const createArg = prismaMock.authOtp.create.mock.calls[0]?.[0] as {
      data: { codeHash: string; purpose: string };
    };
    expect(createArg.data.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArg.data.codeHash).not.toBe('111111');
    expect(createArg.data.purpose).toBe('LOGIN');
    expect(sendEmailOtp).not.toHaveBeenCalled();
  });
});
