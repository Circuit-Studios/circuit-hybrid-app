import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface CircuitJwtPayload extends JwtPayload {
  sub: string;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  defaultRole: string;
}

export function signJwt(payload: Omit<CircuitJwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyJwt(token: string): CircuitJwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ['HS256'],
  });
  if (typeof decoded === 'string') {
    throw new Error('Unexpected JWT payload shape');
  }
  return decoded as CircuitJwtPayload;
}
