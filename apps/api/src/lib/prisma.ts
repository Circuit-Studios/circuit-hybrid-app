import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({
  log:
    env.NODE_ENV === 'production'
      ? ['warn', 'error']
      : ['warn', 'error', 'info'],
});
