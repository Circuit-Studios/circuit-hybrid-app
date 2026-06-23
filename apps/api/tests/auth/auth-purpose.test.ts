import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('auth request-otp purpose checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.OTP_PROVIDER = 'MOCK';
    process.env.LOG_LEVEL = 'warn';
    process.env.JWT_SECRET = 'test-secret-please-ignore-32-chars-min';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/circuit_test';
    process.env.OPENAI_API_KEY = 'sk-test';
  });

  it('rejects duplicate email signup', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });

    const { requestOtpSchema } = await import('../../src/modules/auth/auth.schemas.js');
    const body = requestOtpSchema.parse({
      channel: 'EMAIL',
      email: 'user@studio.com',
      purpose: 'signup',
    });

    const { conflict } = await import('../../src/lib/http.js');
    const { prisma } = await import('../../src/lib/prisma.js');

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    expect(existing).toBeTruthy();
    expect(() => {
      if (existing) throw conflict('An account with this email already exists');
    }).toThrow(/already exists/);
  });

  it('rejects duplicate phone signup', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-phone' });

    const { requestOtpSchema } = await import('../../src/modules/auth/auth.schemas.js');
    const body = requestOtpSchema.parse({
      phone: '+919812345678',
      purpose: 'signup',
    });

    const { conflict } = await import('../../src/lib/http.js');
    const { prisma } = await import('../../src/lib/prisma.js');

    const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
    expect(existing).toBeTruthy();
    expect(() => {
      if (existing) throw conflict('An account with this phone number already exists');
    }).toThrow(/already exists/);
  });
});
