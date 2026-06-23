import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    APP_ENV: 'local',
    SIGNUP_VERIFICATION_CHANNEL: 'EMAIL',
    LOGIN_IDENTIFIER: 'PHONE',
    EMAIL_OTP_PROVIDER: 'MOCK',
    PHONE_OTP_PROVIDER: 'MOCK',
    OTP_SECRET: 'test-otp-secret-32-chars-minimum!!',
    RESEND_API_KEY: undefined,
    OTP_FROM_EMAIL: undefined,
    RESEND_FROM_EMAIL: undefined,
  },
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe('app config', () => {
  it('returns public config without secrets', async () => {
    vi.doMock('../../src/config/features.js', () => ({
      getPublicFeatureFlags: vi.fn().mockResolvedValue({
        'scripts.upload': true,
        'auth.emailOtp': true,
      }),
    }));

    const { getPublicAppConfig } = await import('../../src/config/app-config.js');
    const config = await getPublicAppConfig();

    expect(config).toMatchObject({
      appEnv: 'local',
      signupVerificationChannel: 'EMAIL',
      loginIdentifier: 'PHONE',
    });
    expect(config.features).toBeDefined();
    expect(config).not.toHaveProperty('OTP_SECRET');
    expect(config).not.toHaveProperty('RESEND_API_KEY');
  });
});
