declare global {
  namespace Express {
    interface Request {
      id?: string;
      log?: {
        error: (obj: unknown, msg?: string) => void;
      };
      user?: import('../lib/jwt.js').CircuitJwtPayload;
      projectMembership?: import('../auth/permissions.js').ProjectMembershipContext;
    }
  }
}

export {};
