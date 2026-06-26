import type { ErrorRequestHandler, Request } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';
import { logger } from '../lib/logger.js';

function resolveRequestId(req: Request): string | undefined {
  const id = req.id;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

function errorPayload(
  message: string,
  requestId: string | undefined,
  extra?: Record<string, unknown>,
) {
  return {
    error: {
      message,
      ...(requestId ? { requestId } : {}),
      ...extra,
    },
  };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = resolveRequestId(req);

  if (err instanceof ZodError) {
    res.status(400).json(errorPayload('Validation failed', requestId, { issues: err.issues }));
    return;
  }

  if (err instanceof HttpError) {
    res
      .status(err.statusCode)
      .json(
        errorPayload(
          err.message,
          requestId,
          err.details !== undefined ? { details: err.details } : undefined,
        ),
      );
    return;
  }

  if (req.log) {
    req.log.error({ err, path: req.path }, 'Unhandled error');
  } else {
    logger.error({ err, path: req.path, requestId }, 'Unhandled error');
  }

  res.status(500).json(errorPayload('Internal server error', requestId));
};
