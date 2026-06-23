declare global {
  namespace Express {
    interface Request {
      user?: import('../lib/jwt.js').CircuitJwtPayload;
      projectMembership?: import('../auth/permissions.js').ProjectMembershipContext;
    }
  }
}

export {};
