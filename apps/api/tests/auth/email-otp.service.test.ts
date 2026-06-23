import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpChannel, OtpPurpose } from '@prisma/client';

const prismaMock = {
  authOtp: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  user: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
};

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/config/features.js', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/modules/auth/providers/otp-delivery.js', () => ({
  getOtpDeliveryProvider: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

describe('otp.service unified AuthOtp storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OTP_PROVIDER = 'MOCK';
    process.env.NODE_ENV = 'test';
    process.env.OTP_SECRET = 'test-otp-secret-32-chars-minimum!!';
  });

  it('stores email OTP in AuthOtp', async () => {
    prismaMock.authOtp.findFirst.mockResolvedValue(null);
    prismaMock.authOtp.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.authOtp.create.mockResolvedValue({ id: '1' });

    const { requestOtp } = await import('../../src/modules/auth/otp.service.js');
    await requestOtp({
      channel: OtpChannel.EMAIL,
      target: 'user@studio.com',
      purpose: 'signup',
    });

    expect(prismaMock.authOtp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: OtpChannel.EMAIL,
          target: 'user@studio.com',
          purpose: OtpPurpose.SIGNUP,
          codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
  });

  it('increments attempts on invalid email OTP', async () => {
    const { hashOtpCode } = await import('../../src/modules/auth/otp-crypto.js');
    prismaMock.authOtp.findFirst.mockResolvedValue({
      id: 'otp-1',
      codeHash: hashOtpCode('111111'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    });
    prismaMock.authOtp.update.mockResolvedValue({});

    const { verifyOtp } = await import('../../src/modules/auth/otp.service.js');
    await expect(
      verifyOtp({
        channel: OtpChannel.EMAIL,
        target: 'user@studio.com',
        code: '000000',
        purpose: 'signup',
      }),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(prismaMock.authOtp.update).toHaveBeenCalledWith({
      where: { id: 'otp-1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('increments attempts on invalid phone OTP', async () => {
    const { hashOtpCode } = await import('../../src/modules/auth/otp-crypto.js');
    prismaMock.authOtp.findFirst.mockResolvedValue({
      id: 'otp-phone',
      codeHash: hashOtpCode('111111'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    });
    prismaMock.authOtp.update.mockResolvedValue({});

    const { verifyOtp } = await import('../../src/modules/auth/otp.service.js');
    await expect(
      verifyOtp({
        channel: OtpChannel.PHONE,
        target: '+919812345678',
        code: '000000',
        purpose: 'login',
      }),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(prismaMock.authOtp.update).toHaveBeenCalledWith({
      where: { id: 'otp-phone' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('rejects phone OTP after max failed attempts', async () => {
    const { hashOtpCode } = await import('../../src/modules/auth/otp-crypto.js');
    const { OTP_MAX_ATTEMPTS } = await import('../../src/modules/auth/auth.constants.js');
    prismaMock.authOtp.findFirst.mockResolvedValue({
      id: 'otp-locked',
      codeHash: hashOtpCode('111111'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: OTP_MAX_ATTEMPTS,
    });

    const { verifyOtp } = await import('../../src/modules/auth/otp.service.js');
    await expect(
      verifyOtp({
        channel: OtpChannel.PHONE,
        target: '+919812345678',
        code: '111111',
        purpose: 'login',
      }),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(prismaMock.authOtp.update).not.toHaveBeenCalled();
  });

  it('marks consumed and sets emailVerified for verify_email purpose', async () => {
    const { hashOtpCode } = await import('../../src/modules/auth/otp-crypto.js');
    prismaMock.authOtp.findFirst.mockResolvedValue({
      id: 'otp-2',
      codeHash: hashOtpCode('111111'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    });
    prismaMock.authOtp.update.mockResolvedValue({});
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    const { verifyOtp } = await import('../../src/modules/auth/otp.service.js');
    await verifyOtp({
      channel: OtpChannel.EMAIL,
      target: 'user@studio.com',
      code: '111111',
      purpose: 'verify_email',
    });

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { email: 'user@studio.com' },
      data: { emailVerified: true },
    });
  });
});
