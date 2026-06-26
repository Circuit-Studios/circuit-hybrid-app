import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../../src/config/env.js';
import {
  assertProductionOtpProviders,
  assertResendEmailOtpConfig,
} from '../../src/config/env-guards.js';

function baseEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    APP_ENV: 'local',
    PORT: 3009,
    LOG_LEVEL: 'debug',
    JWT_SECRET: 'test-secret-please-ignore-32-chars-min',
    JWT_ISSUER: 'circuit-api',
    JWT_AUDIENCE: 'circuit-mobile',
    JWT_EXPIRES_IN: '7d',
    OTP_PROVIDER: 'MOCK',
    OTP_SECRET: 'test-otp-secret-32-chars-minimum!!',
    OTP_FROM_EMAIL: undefined,
    SIGNUP_VERIFICATION_CHANNEL: 'EMAIL',
    LOGIN_IDENTIFIER: 'EMAIL',
    EMAIL_OTP_PROVIDER: 'MOCK',
    PHONE_OTP_PROVIDER: 'MOCK',
    ALLOW_MOCK_OTP_IN_PROD: false,
    RESEND_API_KEY: undefined,
    RESEND_OTP_TEMPLATE_ID: undefined,
    RESEND_OTP_EXPIRES_MINUTES: 5,
    RESEND_FROM_EMAIL: undefined,
    RESEND_REPLY_TO: undefined,
    ALLOW_DIRECT_REGISTER: false,
    MSG91_AUTH_KEY: undefined,
    MSG91_SENDER_ID: undefined,
    MSG91_TEMPLATE_ID: undefined,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/circuit_test',
    REDIS_URL: undefined,
    OPENAI_API_KEY: 'sk-test',
    OPENAI_MODEL: 'gpt-4o',
    OPENAI_MODEL_FAST: 'gpt-4o-mini',
    OPENAI_MAX_RETRIES: 3,
    LANGSMITH_TRACING: false,
    LANGSMITH_API_KEY: undefined,
    LANGSMITH_PROJECT: undefined,
    EXPO_PUSH_PROVIDER: 'MOCK',
    EXPO_ACCESS_TOKEN: undefined,
    CORS_ORIGINS: '',
    ...overrides,
  };
}

describe('assertResendEmailOtpConfig', () => {
  it('exits when EMAIL_OTP_PROVIDER=RESEND without RESEND_API_KEY and template id', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    assertResendEmailOtpConfig(
      baseEnv({ EMAIL_OTP_PROVIDER: 'RESEND', RESEND_API_KEY: undefined }),
    );
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
  });

  it('allows RESEND when API key and template id are set', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    assertResendEmailOtpConfig(
      baseEnv({
        EMAIL_OTP_PROVIDER: 'RESEND',
        RESEND_API_KEY: 're_test',
        RESEND_OTP_TEMPLATE_ID: 'circuit-email-otp',
      }),
    );
    expect(exit).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});

describe('assertProductionOtpProviders', () => {
  it('exits when APP_ENV=prod and signup uses MOCK email provider', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    assertProductionOtpProviders(
      baseEnv({
        APP_ENV: 'prod',
        SIGNUP_VERIFICATION_CHANNEL: 'EMAIL',
        EMAIL_OTP_PROVIDER: 'MOCK',
      }),
    );
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
  });

  it('allows MOCK phone provider in prod when signup channel is EMAIL', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    assertProductionOtpProviders(
      baseEnv({
        APP_ENV: 'prod',
        SIGNUP_VERIFICATION_CHANNEL: 'EMAIL',
        EMAIL_OTP_PROVIDER: 'RESEND',
        RESEND_API_KEY: 're_test',
        RESEND_OTP_TEMPLATE_ID: 'circuit-email-otp',
        PHONE_OTP_PROVIDER: 'MOCK',
      }),
    );
    expect(exit).not.toHaveBeenCalled();
    exit.mockRestore();
  });
});
