import type { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { signJwt } from '../../lib/jwt.js';

export function buildAuthResponse(user: User) {
  const token = signJwt({
    sub: user.id,
    phone: user.phone ?? undefined,
    email: user.email ?? undefined,
    firstName: user.firstName,
    lastName: user.lastName,
    defaultRole: user.defaultRole,
  });

  const decoded = jwt.decode(token);
  const expiresAt =
    decoded && typeof decoded === 'object' && typeof decoded.exp === 'number'
      ? new Date(decoded.exp * 1000).toISOString()
      : undefined;

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      defaultRole: user.defaultRole,
      createdAt: user.createdAt,
    },
  };
}
