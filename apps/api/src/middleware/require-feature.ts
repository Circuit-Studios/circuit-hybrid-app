import type { NextFunction, Request, Response } from 'express';
import { forbidden } from '../lib/http.js';
import { isFeatureEnabled } from '../config/features.js';

export function requireFeature(flagKey: string) {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    const enabled = await isFeatureEnabled(flagKey);
    if (!enabled) {
      return next(forbidden('This feature is currently disabled'));
    }
    next();
  };
}
