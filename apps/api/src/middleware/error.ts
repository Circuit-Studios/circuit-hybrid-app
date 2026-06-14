import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Validation failed', issues: err.issues },
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
    return;
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: { message: 'Internal server error' } });
};
