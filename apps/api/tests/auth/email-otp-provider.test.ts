import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

vi.mock('../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('ResendEmailOtpProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  it('requires RESEND_API_KEY', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        RESEND_API_KEY: undefined,
        RESEND_OTP_TEMPLATE_ID: 'circuit-email-otp',
        RESEND_OTP_EXPIRES_MINUTES: 5,
      },
    }));

    const { ResendEmailOtpProvider } =
      await import('../../src/modules/auth/providers/resend-email.provider.js');
    const provider = new ResendEmailOtpProvider();
    await expect(
      provider.send({
        channel: 'EMAIL',
        target: 'user@studio.com',
        code: '123456',
        purpose: 'signup',
      }),
    ).rejects.toThrow(/RESEND_API_KEY/);
  });

  it('requires RESEND_OTP_TEMPLATE_ID', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        RESEND_API_KEY: 're_test',
        RESEND_OTP_TEMPLATE_ID: undefined,
        RESEND_OTP_EXPIRES_MINUTES: 5,
      },
    }));

    const { ResendEmailOtpProvider } =
      await import('../../src/modules/auth/providers/resend-email.provider.js');
    const provider = new ResendEmailOtpProvider();
    await expect(
      provider.send({
        channel: 'EMAIL',
        target: 'user@studio.com',
        code: '123456',
        purpose: 'signup',
      }),
    ).rejects.toThrow(/RESEND_OTP_TEMPLATE_ID/);
  });

  it('sends hosted template with CODE, EXPIRES_MINUTES, and APP_NAME variables', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        RESEND_API_KEY: 're_test',
        RESEND_OTP_TEMPLATE_ID: 'circuit-email-otp',
        RESEND_OTP_EXPIRES_MINUTES: 5,
      },
    }));

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-abc' }),
    });

    const { ResendEmailOtpProvider } =
      await import('../../src/modules/auth/providers/resend-email.provider.js');
    const provider = new ResendEmailOtpProvider();

    await provider.send({
      channel: 'EMAIL',
      target: 'user@studio.com',
      code: '654321',
      purpose: 'signup',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test',
        }),
        body: JSON.stringify({
          to: ['user@studio.com'],
          template: {
            id: 'circuit-email-otp',
            variables: {
              CODE: '654321',
              EXPIRES_MINUTES: '5',
              APP_NAME: 'Circuit',
            },
          },
        }),
      }),
    );
  });
});

describe('Mock email OTP', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('dispatches without throwing in mock mode', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        EMAIL_OTP_PROVIDER: 'MOCK',
        APP_ENV: 'local',
      },
    }));

    const { getOtpDeliveryProvider, resetOtpDeliveryProvidersForTests } =
      await import('../../src/modules/auth/providers/otp-delivery.js');
    resetOtpDeliveryProvidersForTests();
    await expect(
      getOtpDeliveryProvider('EMAIL').send({
        channel: 'EMAIL',
        target: 'user@studio.com',
        code: '111111',
        purpose: 'signup',
      }),
    ).resolves.toBeUndefined();
  });
});
