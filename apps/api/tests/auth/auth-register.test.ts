import { beforeEach, describe, expect, it, vi } from 'vitest';

const envMock = {
  ALLOW_DIRECT_REGISTER: false,
  APP_ENV: 'local' as 'local' | 'dev' | 'prod',
};

vi.mock('../../src/config/env.js', () => ({
  env: envMock,
}));

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/modules/auth/auth-signup.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/auth/auth-signup.js')>();
  return {
    ...actual,
    linkPendingInvites: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../../src/modules/auth/password.service.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed'),
  verifyPassword: vi.fn(),
}));

vi.mock('../../src/modules/auth/auth-response.js', () => ({
  buildAuthResponse: vi.fn((user: { id: string }) => ({ token: 'test-token', user })),
}));

describe('/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.ALLOW_DIRECT_REGISTER = false;
    envMock.APP_ENV = 'local';
    vi.resetModules();
  });

  async function invokeRegister(body: Record<string, unknown> = {}) {
    const { authPublicRouter } = await import('../../src/modules/auth/auth.routes.js');
    const layer = authPublicRouter.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/register',
    );
    const handler = layer!.route!.stack[0].handle as (
      req: { body: Record<string, unknown> },
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const next = vi.fn();
    handler({ body }, { json: vi.fn() }, next);
    await new Promise((resolve) => setImmediate(resolve));
    return next;
  }

  it('returns 404 outside APP_ENV=local', async () => {
    envMock.APP_ENV = 'prod';
    const next = await invokeRegister();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns 403 on local when ALLOW_DIRECT_REGISTER is false', async () => {
    const next = await invokeRegister();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: expect.stringContaining('Direct registration is disabled'),
      }),
    );
  });

  it('creates a user when local and ALLOW_DIRECT_REGISTER is true', async () => {
    envMock.ALLOW_DIRECT_REGISTER = true;
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'u1',
      email: 'dev@studio.com',
      phone: null,
      firstName: 'Dev',
      lastName: 'User',
      defaultRole: 'CREW',
    });

    const { authPublicRouter } = await import('../../src/modules/auth/auth.routes.js');
    const layer = authPublicRouter.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/register',
    );
    const handler = layer!.route!.stack[0].handle as (
      req: { body: Record<string, unknown> },
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const json = vi.fn();
    const next = vi.fn();
    handler(
      {
        body: {
          email: 'dev@studio.com',
          password: 'password123',
          firstName: 'Dev',
          lastName: 'User',
        },
      },
      { json },
      next,
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
