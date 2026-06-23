import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendEmailOtp = vi.fn().mockResolvedValue(undefined);
const verifyEmailOtp = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/modules/auth/email-otp.service.js', () => ({
  sendEmailOtp,
  verifyEmailOtp,
  EMAIL_OTP_COOLDOWN_SECONDS: 45,
  EMAIL_OTP_TTL_MS: 300_000,
  GENERIC_SEND_SUCCESS: 'sent',
}));

vi.mock('../../src/config/features.js', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

describe('email-otp.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects signup purpose on /send-otp', async () => {
    const router = (await import('../../src/modules/auth/email-otp.routes.js')).default;
    const layer = router.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/send-otp',
    );
    const handler = layer!.route!.stack[1].handle as (
      req: { body: unknown },
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const next = vi.fn();
    handler({ body: { email: 'user@studio.com', purpose: 'signup' } }, { json: vi.fn() }, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: expect.stringContaining('/auth/request-otp'),
      }),
    );
    expect(sendEmailOtp).not.toHaveBeenCalled();
  });

  it('sends verify_email OTP on /send-otp', async () => {
    const router = (await import('../../src/modules/auth/email-otp.routes.js')).default;
    const layer = router.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/send-otp',
    );
    const handler = layer!.route!.stack[1].handle as (
      req: { body: unknown },
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const json = vi.fn();
    const next = vi.fn();
    handler({ body: { email: 'user@studio.com' } }, { json }, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(sendEmailOtp).toHaveBeenCalledWith('user@studio.com', 'VERIFY_EMAIL');
    expect(json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
