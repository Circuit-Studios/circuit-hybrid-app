import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestOtp = vi.fn().mockResolvedValue(undefined);
const verifyOtp = vi.fn().mockResolvedValue(true);
const isFeatureEnabled = vi.fn().mockResolvedValue(true);
const hashPassword = vi.fn().mockResolvedValue('hashed-new-password');

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  authOtp: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/config/features.js', () => ({ isFeatureEnabled }));
vi.mock('../../src/modules/auth/password.service.js', () => ({
  hashPassword,
  verifyPassword: vi.fn(),
}));
vi.mock('../../src/modules/auth/otp.service.js', () => ({
  requestOtp,
  verifyOtp,
  GENERIC_SEND_SUCCESS: 'If the email is valid, a verification code has been sent.',
  OTP_TTL_MS: 300_000,
}));

type RouteHandler = (
  req: { body: unknown },
  res: { json: (v: unknown) => void },
  next: (err?: unknown) => void,
) => void;

async function getHandler(path: string): Promise<RouteHandler> {
  const { authPublicRouter } = await import('../../src/modules/auth/auth.routes.js');
  const layer = authPublicRouter.stack.find(
    (s: { route?: { path?: string } }) => s.route?.path === path,
  );
  return layer!.route!.stack[0].handle as RouteHandler;
}

function invoke(handler: RouteHandler, body: unknown) {
  const json = vi.fn();
  const next = vi.fn();
  handler({ body }, { json }, next);
  return { json, next };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('auth password reset routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isFeatureEnabled.mockResolvedValue(true);
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.authOtp.updateMany.mockResolvedValue({ count: 0 });
  });

  it('sends a password_reset OTP when the account exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@studio.com' });
    const handler = await getHandler('/forgot-password');

    const { json, next } = invoke(handler, { email: 'User@Studio.com' });
    await flush();

    expect(requestOtp).toHaveBeenCalledWith({
      channel: 'EMAIL',
      target: 'user@studio.com',
      purpose: 'password_reset',
    });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    expect(next).not.toHaveBeenCalled();
  });

  it('does not send when the account is unknown but returns the same generic response', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const handler = await getHandler('/forgot-password');

    const { json, next } = invoke(handler, { email: 'ghost@studio.com' });
    await flush();

    expect(requestOtp).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    expect(next).not.toHaveBeenCalled();
  });

  it('swallows OTP delivery errors so existence cannot be probed', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@studio.com' });
    requestOtp.mockRejectedValueOnce(new Error('cooldown'));
    const handler = await getHandler('/forgot-password');

    const { json, next } = invoke(handler, { email: 'user@studio.com' });
    await flush();

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    expect(next).not.toHaveBeenCalled();
  });

  it('verifies the OTP and updates the password hash', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@studio.com' });
    const handler = await getHandler('/reset-password');

    const { json, next } = invoke(handler, {
      email: 'user@studio.com',
      code: '123456',
      newPassword: 'brand-new-pass',
    });
    await flush();

    expect(verifyOtp).toHaveBeenCalledWith({
      channel: 'EMAIL',
      target: 'user@studio.com',
      code: '123456',
      purpose: 'password_reset',
    });
    expect(hashPassword).toHaveBeenCalledWith('brand-new-pass');
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    expect(next).not.toHaveBeenCalled();
  });

  it('does not update the password when OTP verification fails', async () => {
    verifyOtp.mockRejectedValueOnce(new Error('Invalid or expired verification code.'));
    const handler = await getHandler('/reset-password');

    const { next } = invoke(handler, {
      email: 'user@studio.com',
      code: '000000',
      newPassword: 'brand-new-pass',
    });
    await flush();

    expect(hashPassword).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
