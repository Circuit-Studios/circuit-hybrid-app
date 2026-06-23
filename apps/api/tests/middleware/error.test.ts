import { describe, expect, it, vi } from 'vitest';
import { ZodError, z } from 'zod';
import { HttpError } from '../../src/lib/http.js';
import { errorHandler } from '../../src/middleware/error.js';

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('errorHandler', () => {
  it('includes requestId in Zod validation errors', () => {
    const res = mockRes();
    const schema = z.object({ email: z.string().email() });
    let zodErr: ZodError;
    try {
      schema.parse({ email: 'bad' });
      zodErr = new ZodError([]);
    } catch (err) {
      zodErr = err as ZodError;
    }

    errorHandler(
      zodErr,
      { id: 'req-123', path: '/auth/login', log: undefined } as never,
      res as never,
      vi.fn(),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: {
        message: 'Validation failed',
        requestId: 'req-123',
        issues: zodErr.issues,
      },
    });
  });

  it('includes requestId in HttpError responses', () => {
    const res = mockRes();
    errorHandler(
      new HttpError(403, 'Forbidden'),
      { id: 'req-456', path: '/projects', log: undefined } as never,
      res as never,
      vi.fn(),
    );

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: { message: 'Forbidden', requestId: 'req-456' },
    });
  });

  it('includes requestId in 500 responses and uses req.log when present', () => {
    const res = mockRes();
    const logError = vi.fn();
    errorHandler(
      new Error('boom'),
      { id: 'req-789', path: '/fail', log: { error: logError } } as never,
      res as never,
      vi.fn(),
    );

    expect(logError).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: { message: 'Internal server error', requestId: 'req-789' },
    });
  });
});
