import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpChannel } from '@prisma/client';

const prismaMock = {
  authOtp: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

const emailSend = vi.fn().mockResolvedValue(undefined);
const phoneSend = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/modules/auth/providers/resend-email-otp.provider.js', () => ({
  getEmailOtpProvider: () => ({ send: emailSend }),
}));

vi.mock('../../src/modules/auth/providers/phone-otp.provider.js', () => ({
  getPhoneOtpProvider: () => ({ send: phoneSend }),
}));

describe('otp.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OTP_PROVIDER = 'MOCK';
    process.env.NODE_ENV = 'test';
  });

  it('requests email OTP and stores hashed code', async () => {
    prismaMock.authOtp.findFirst.mockResolvedValue(null);
    prismaMock.authOtp.create.mockResolvedValue({ id: 'otp-1' });

    const { requestOtp } = await import('../../src/modules/auth/otp.service.js');
    await requestOtp({ channel: OtpChannel.EMAIL, target: 'user@studio.com' });

    expect(prismaMock.authOtp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: OtpChannel.EMAIL,
          target: 'user@studio.com',
        }),
      }),
    );
    expect(emailSend).toHaveBeenCalledWith('user@studio.com', '111111');
    expect(phoneSend).not.toHaveBeenCalled();
  });

  it('requests phone OTP via phone provider', async () => {
    prismaMock.authOtp.findFirst.mockResolvedValue(null);
    prismaMock.authOtp.create.mockResolvedValue({ id: 'otp-2' });

    const { requestOtp } = await import('../../src/modules/auth/otp.service.js');
    await requestOtp({ channel: OtpChannel.PHONE, target: '+919812345678' });

    expect(phoneSend).toHaveBeenCalledWith('+919812345678', '111111');
    expect(emailSend).not.toHaveBeenCalled();
  });

  it('enforces cooldown per channel+target', async () => {
    prismaMock.authOtp.findFirst.mockResolvedValue({
      id: 'recent',
      createdAt: new Date(),
    });

    const { requestOtp, OTP_RESEND_COOLDOWN_SECONDS } = await import(
      '../../src/modules/auth/otp.service.js'
    );

    await expect(
      requestOtp({ channel: OtpChannel.EMAIL, target: 'user@studio.com' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining(String(OTP_RESEND_COOLDOWN_SECONDS)),
    });

    expect(prismaMock.authOtp.create).not.toHaveBeenCalled();
  });

  it('verifies email OTP and marks consumed', async () => {
    const bcrypt = await import('bcryptjs');
    const codeHash = await bcrypt.hash('111111', 10);
    prismaMock.authOtp.findFirst.mockResolvedValue({
      id: 'otp-3',
      codeHash,
    });
    prismaMock.authOtp.update.mockResolvedValue({});

    const { verifyOtp } = await import('../../src/modules/auth/otp.service.js');
    await expect(
      verifyOtp({
        channel: OtpChannel.EMAIL,
        target: 'user@studio.com',
        code: '111111',
      }),
    ).resolves.toBe(true);

    expect(prismaMock.authOtp.update).toHaveBeenCalledWith({
      where: { id: 'otp-3' },
      data: { consumed: true },
    });
  });
});
