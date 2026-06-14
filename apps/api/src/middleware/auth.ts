import type { NextFunction, Request, Response } from 'express';
import '../types/express-augment.js';
import { UserRole } from '@prisma/client';
import { unauthorized, forbidden } from '../lib/http.js';
import { verifyJwt, type CircuitJwtPayload } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

function parseBearer(header?: string): string | undefined {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1];
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = parseBearer(req.headers.authorization);
  if (!token) {
    return next(unauthorized('Missing Bearer token'));
  }
  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

// Allows the route only for users whose **default role** is in the allowed
// set. For per-project role checks use `requireProjectRole`.
export function requireDefaultRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.defaultRole as UserRole)) {
      return next(forbidden('Your account role is not allowed to perform this action'));
    }
    next();
  };
}

// Checks the user's role on a specific project (via :projectId param).
// Allows the request through only if the active membership's role is in the
// allowed set. Used to enforce Spider-mode boundaries from Module 4.
export function requireProjectRole(...roles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    const projectId = req.params.projectId;
    if (!projectId) return next(forbidden('Missing projectId'));

    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: req.user.sub,
        status: 'ACTIVE',
      },
      select: { role: true },
    });

    if (!membership) {
      return next(forbidden('You are not a member of this project'));
    }
    if (!roles.includes(membership.role)) {
      return next(forbidden(`Role ${membership.role} cannot perform this action`));
    }
    next();
  };
}
