declare global {
  namespace Express {
    interface Request {
      user?: import('../lib/jwt.js').CircuitJwtPayload;
    }
  }
}

export {};
