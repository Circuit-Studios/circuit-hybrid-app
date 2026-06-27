import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpChannel } from '@prisma/client';

const prismaMock = {
  authOtp: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  user: { updateMany: vi.fn() },
  $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
};

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/config/features.js', () => ({ isFeatureEnabled: vi.fn().mockResolvedValue(true) }));
vi.mock('../../src/modules/auth/providers/otp-delivery.js', () => ({
  getOtpDeliveryProvider: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

describe('otp.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OTP_PROVIDER = 'MOCK';
    process.env.NODE_ENV = 'test';
    process.env.OTP_SECRET = 'test-otp-secret-32-chars-minimum!!';
  });

  it('stores only an HMAC hash — never the plain OTP code', async () => {
    prismaMock.authOtp.findFirst.mockResolvedValue(null);
    prismaMock.authOtp.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.authOtp.create.mockResolvedValue({ id: 'otp-1' });

    const { requestOtp } = await import('../../src/modules/auth/otp.service.js');
    await requestOtp({ channel: OtpChannel.EMAIL, target: 'user@studio.com', purpose: 'signup' });

    const createArg = prismaMock.authOtp.create.mock.calls[0]?.[0] as {
      data: { codeHash: string };
    };
    expect(createArg.data.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArg.data.codeHash).not.toBe('111111');
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
});
