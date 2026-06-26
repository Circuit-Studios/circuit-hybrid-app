import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestOtp = vi.fn().mockResolvedValue(undefined);
const verifyOtp = vi.fn().mockResolvedValue(true);
const isFeatureEnabled = vi.fn().mockResolvedValue(true);

vi.mock('../../src/modules/auth/otp.service.js', () => ({
  requestOtp,
  verifyOtp,
  GENERIC_SEND_SUCCESS: 'If the email is valid, a verification code has been sent.',
  OTP_TTL_MS: 300_000,
}));

vi.mock('../../src/config/features.js', () => ({
  isFeatureEnabled,
}));

describe('POST /email/* (post-account verification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isFeatureEnabled.mockResolvedValue(true);
  });

  it('sends verify_email OTP via /email/request-otp', async () => {
    const { emailPublicRouter } = await import('../../src/modules/email/email.routes.js');
    const layer = emailPublicRouter.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/request-otp',
    );
    const handler = layer!.route!.stack[0].handle as (
      req: { body: unknown },
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const json = vi.fn();
    const next = vi.fn();
    handler({ body: { email: 'user@studio.com' } }, { json }, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(requestOtp).toHaveBeenCalledWith({
      channel: 'EMAIL',
      target: 'user@studio.com',
      purpose: 'verify_email',
    });
    expect(json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('verifies verify_email OTP via /email/verify-otp', async () => {
    const { emailPublicRouter } = await import('../../src/modules/email/email.routes.js');
    const layer = emailPublicRouter.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/verify-otp',
    );
    const handler = layer!.route!.stack[0].handle as (
      req: { body: unknown },
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const json = vi.fn();
    const next = vi.fn();
    handler({ body: { email: 'user@studio.com', code: '123456' } }, { json }, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(verifyOtp).toHaveBeenCalledWith({
      channel: 'EMAIL',
      target: 'user@studio.com',
      code: '123456',
      purpose: 'verify_email',
    });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, emailVerified: true }));
    expect(next).not.toHaveBeenCalled();
  });
});

describe('auth OTP routes reject verify_email purpose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects verify_email on /auth/request-otp', async () => {
    const { authPublicRouter } = await import('../../src/modules/auth/auth.routes.js');
    const layer = authPublicRouter.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/request-otp',
    );
    const handler = layer!.route!.stack[0].handle as (
      req: { body: unknown },
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const json = vi.fn();
    const next = vi.fn();
    handler(
      { body: { channel: 'EMAIL', email: 'user@studio.com', purpose: 'verify_email' } },
      { json },
      next,
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(requestOtp).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('/email/request-otp') }),
    );
  });

  it('redirects verify_email on /auth/verify-otp', async () => {
    const { authPublicRouter } = await import('../../src/modules/auth/auth.routes.js');
    const layer = authPublicRouter.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/verify-otp',
    );
    const handler = layer!.route!.stack[0].handle as (
      req: { body: unknown },
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const json = vi.fn();
    const next = vi.fn();
    handler(
      {
        body: {
          channel: 'EMAIL',
          email: 'user@studio.com',
          code: '123456',
          purpose: 'verify_email',
        },
      },
      { json },
      next,
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('/email/verify-otp') }),
    );
  });
});
