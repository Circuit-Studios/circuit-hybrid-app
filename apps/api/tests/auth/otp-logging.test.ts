import { describe, expect, it, vi } from 'vitest';
import { OtpChannel } from '@prisma/client';

describe('otp logging', () => {
  it('does not log raw OTP code in production', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.OTP_PROVIDER = 'MOCK';
    process.env.LOG_LEVEL = 'info';
    process.env.JWT_SECRET = 'test-secret-please-ignore-32-chars-min';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/circuit_test';
    process.env.OPENAI_API_KEY = 'sk-test';

    const info = vi.fn();
    const debug = vi.fn();

    vi.doMock('../../src/lib/logger.js', () => ({
      logger: { info, debug, warn: vi.fn(), error: vi.fn() },
    }));

    const { logOtpMock } = await import('../../src/modules/auth/otp-logging.js');
    logOtpMock(OtpChannel.EMAIL, 'secret.user@circuit.app', '654321');

    expect(debug).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('code');
    expect(String(payload.target)).not.toContain('secret.user@circuit.app');
  });

  it('masks email in dispatch logs', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.OTP_PROVIDER = 'MOCK';
    process.env.LOG_LEVEL = 'info';
    process.env.JWT_SECRET = 'test-secret-please-ignore-32-chars-min';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/circuit_test';
    process.env.OPENAI_API_KEY = 'sk-test';

    const info = vi.fn();
    vi.doMock('../../src/lib/logger.js', () => ({
      logger: { info, debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { logOtpDispatched } = await import('../../src/modules/auth/otp-logging.js');
    logOtpDispatched(OtpChannel.EMAIL, 'kiran@circuit.app', 'RESEND');

    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.target).toBe('k***@***.app');
    expect(JSON.stringify(payload)).not.toContain('kiran@circuit.app');
  });
});
