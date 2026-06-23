import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'production',
    APP_ENV: 'prod',
  },
}));

describe('/auth/register', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('cannot bypass OTP signup in production', async () => {
    const { authPublicRouter } = await import('../../src/modules/auth/auth.routes.js');
    const layer = authPublicRouter.stack.find(
      (s: { route?: { path?: string } }) => s.route?.path === '/register',
    );
    expect(layer?.route).toBeDefined();

    const handler = layer!.route!.stack[0].handle as (
      req: unknown,
      res: { json: (v: unknown) => void },
      next: (err?: unknown) => void,
    ) => void;

    const next = vi.fn();
    handler({}, { json: vi.fn() }, next);
    await new Promise(resolve => setImmediate(resolve));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: expect.stringContaining('Direct registration is disabled'),
      }),
    );
  });
});
