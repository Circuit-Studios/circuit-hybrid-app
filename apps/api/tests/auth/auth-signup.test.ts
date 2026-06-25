import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  projectMember: {
    updateMany: vi.fn(),
  },
};

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/modules/auth/password.service.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}));

describe('findOrCreateUserAfterOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.projectMember.updateMany.mockResolvedValue({ count: 0 });
  });

  it('returns 409 when email signup phone is already taken', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'other-user', phone: '+919812345678' });

    const { findOrCreateUserAfterOtp } = await import('../../src/modules/auth/auth-signup.js');

    await expect(
      findOrCreateUserAfterOtp({
        channel: 'EMAIL',
        email: 'new@studio.com',
        code: '111111',
        signup: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          role: 'CREW',
          password: 'password123',
          phone: '+919812345678',
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('phone number'),
    });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('returns 409 when phone signup email is already taken', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'other-user', email: 'taken@studio.com' });

    const { findOrCreateUserAfterOtp } = await import('../../src/modules/auth/auth-signup.js');

    await expect(
      findOrCreateUserAfterOtp({
        channel: 'PHONE',
        phone: '+919812345679',
        code: '111111',
        signup: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          role: 'CREW',
          password: 'password123',
          email: 'taken@studio.com',
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('email'),
    });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('returns 409 when prisma unique constraint fails on create', async () => {
    const { Prisma } = await import('@prisma/client');
    prismaMock.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      }),
    );

    const { findOrCreateUserAfterOtp } = await import('../../src/modules/auth/auth-signup.js');

    await expect(
      findOrCreateUserAfterOtp({
        channel: 'EMAIL',
        email: 'new@studio.com',
        code: '111111',
        signup: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          role: 'CREW',
          password: 'password123',
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
