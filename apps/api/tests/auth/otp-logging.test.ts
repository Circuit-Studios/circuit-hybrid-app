import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { OtpChannel } from '@prisma/client';
import { maskOtpTarget } from '../../src/modules/auth/otp-target.js';

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
    expect(String(payload.maskedTarget)).not.toContain('secret.user@circuit.app');
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
    expect(payload.maskedTarget).toBe('k***@***.app');
    expect(JSON.stringify(payload)).not.toContain('kiran@circuit.app');
  });

  it('keeps maskedTarget visible through pino redact', () => {
    let line = '';
    const log = pino(
      {
        level: 'info',
        redact: {
          censor: '[REDACTED]',
          paths: [
            'password',
            '*.password',
            'body.password',
            'otp',
            '*.otp',
            'body.otp',
            'code',
            '*.code',
            'body.code',
            'email',
            '*.email',
            'body.email',
            'phone',
            '*.phone',
            'body.phone',
            'body.target',
            'req.body.target',
          ],
        },
      },
      {
        write(msg: string) {
          line = msg;
        },
      },
    );

    log.info({
      channel: OtpChannel.EMAIL,
      maskedTarget: maskOtpTarget(OtpChannel.EMAIL, 'kiran@circuit.app'),
      provider: 'RESEND',
    });

    expect(line).toContain('maskedTarget');
    expect(line).toContain('k***@***.app');
    expect(line).not.toContain('[REDACTED]');
    expect(line).not.toContain('kiran@circuit.app');
  });
});
