import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OtpChannel } from '@prisma/client';

const prismaMock = {
  project: { count: vi.fn() },
  script: { count: vi.fn() },
  user: { findUnique: vi.fn(), delete: vi.fn() },
  projectMember: { deleteMany: vi.fn() },
  pushToken: { deleteMany: vi.fn() },
  notification: { deleteMany: vi.fn() },
  authOtp: { deleteMany: vi.fn() },
  $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
};

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../../src/middleware/auth.js', () => ({
  requireAuth: (
    req: { user?: { sub: string } },
    _res: unknown,
    next: () => void,
  ) => {
    req.user = { sub: 'user-1' };
    next();
  },
}));

type RouteHandler = (
  req: { user?: { sub: string } },
  res: { json: (v: unknown) => void },
  next: (err?: unknown) => void,
) => void;

async function getDeleteMeHandler(): Promise<RouteHandler> {
  const { authProtectedRouter } = await import('../../src/modules/auth/auth.routes.js');
  const layer = authProtectedRouter.stack.find(
    (s: { route?: { path?: string; methods?: Record<string, boolean> } }) =>
      s.route?.path === '/me' && s.route.methods?.delete,
  );
  const stack = layer!.route!.stack;
  return stack[stack.length - 1].handle as RouteHandler;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('DELETE /auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.project.count.mockResolvedValue(0);
    prismaMock.script.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({
      email: 'user@studio.com',
      phone: '+919812345678',
    });
    prismaMock.projectMember.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.pushToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.notification.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.authOtp.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.user.delete.mockResolvedValue({ id: 'user-1' });
  });

  it('deletes AuthOtp rows by userId and by email/phone target (orphaned OTP PII)', async () => {
    const handler = await getDeleteMeHandler();
    const json = vi.fn();
    const next = vi.fn();

    handler({ user: { sub: 'user-1' } }, { json }, next);
    await flush();

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { email: true, phone: true },
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.authOtp.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(prismaMock.authOtp.deleteMany).toHaveBeenCalledWith({
      where: { channel: OtpChannel.EMAIL, target: 'user@studio.com' },
    });
    expect(prismaMock.authOtp.deleteMany).toHaveBeenCalledWith({
      where: {
        channel: OtpChannel.PHONE,
        OR: [{ target: '+919812345678' }, { phone: '+919812345678' }],
      },
    });
    expect(json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('skips email-target delete when user has no email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ email: null, phone: null });
    const handler = await getDeleteMeHandler();
    const json = vi.fn();
    const next = vi.fn();

    handler({ user: { sub: 'user-1' } }, { json }, next);
    await flush();

    expect(prismaMock.authOtp.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.authOtp.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(json).toHaveBeenCalledWith({ ok: true });
  });
});
