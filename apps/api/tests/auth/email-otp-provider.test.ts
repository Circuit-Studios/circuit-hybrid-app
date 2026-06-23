import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    EMAIL_OTP_PROVIDER: 'RESEND',
    RESEND_API_KEY: undefined,
    OTP_FROM_EMAIL: undefined,
    RESEND_FROM_EMAIL: undefined,
  },
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe('ResendEmailOtpProvider', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('requires RESEND_API_KEY', async () => {
    const { ResendEmailOtpProvider, resetEmailOtpProviderForTests } = await import(
      '../../src/modules/auth/providers/email-otp.provider.js'
    );
    resetEmailOtpProviderForTests();
    const provider = new ResendEmailOtpProvider();
    await expect(provider.send('user@studio.com', '123456')).rejects.toThrow(/RESEND_API_KEY/);
  });
});

describe('Mock email OTP', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.EMAIL_OTP_PROVIDER = 'MOCK';
    process.env.APP_ENV = 'local';
  });

  it('dispatches without throwing in mock mode', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        EMAIL_OTP_PROVIDER: 'MOCK',
        APP_ENV: 'local',
      },
    }));

    const { getEmailOtpProvider, resetEmailOtpProviderForTests } = await import(
      '../../src/modules/auth/providers/email-otp.provider.js'
    );
    resetEmailOtpProviderForTests();
    await expect(getEmailOtpProvider().send('user@studio.com', '111111')).resolves.toBeUndefined();
  });
});
