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

describe('email-otp.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OTP_PROVIDER = 'MOCK';
    process.env.NODE_ENV = 'test';
    process.env.OTP_SECRET = 'test-otp-secret-32-chars-minimum!!';
  });

  it('invalidates previous OTPs and stores hash only in AuthOtp', async () => {
    prismaMock.authOtp.findFirst.mockResolvedValue(null);
    prismaMock.authOtp.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.authOtp.create.mockResolvedValue({ id: '1' });

    const { sendEmailOtp } = await import('../../src/modules/auth/email-otp.service.js');
    await sendEmailOtp('user@studio.com', OtpPurpose.SIGNUP);

    expect(prismaMock.authOtp.updateMany).toHaveBeenCalled();
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
    const createArg = prismaMock.authOtp.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createArg.data).not.toHaveProperty('otp');
    expect(createArg.data).not.toHaveProperty('code');
    expect(Object.values(createArg.data)).not.toContain('111111');
  });

  it('increments attempts on invalid OTP', async () => {
    const { hashOtpCode } = await import('../../src/modules/auth/otp-crypto.js');
    prismaMock.authOtp.findFirst.mockResolvedValue({
      id: 'otp-1',
      codeHash: hashOtpCode('111111'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    });
    prismaMock.authOtp.update.mockResolvedValue({});

    const { verifyEmailOtp } = await import('../../src/modules/auth/email-otp.service.js');
    await expect(
      verifyEmailOtp('user@studio.com', '000000', OtpPurpose.SIGNUP),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(prismaMock.authOtp.update).toHaveBeenCalledWith({
      where: { id: 'otp-1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('marks consumed and sets emailVerified on success', async () => {
    const { hashOtpCode } = await import('../../src/modules/auth/otp-crypto.js');
    prismaMock.authOtp.findFirst.mockResolvedValue({
      id: 'otp-2',
      codeHash: hashOtpCode('111111'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
    });
    prismaMock.authOtp.update.mockResolvedValue({});
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    const { verifyEmailOtp } = await import('../../src/modules/auth/email-otp.service.js');
    await verifyEmailOtp('user@studio.com', '111111', OtpPurpose.VERIFY_EMAIL);

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { email: 'user@studio.com' },
      data: { emailVerified: true },
    });
  });
});
