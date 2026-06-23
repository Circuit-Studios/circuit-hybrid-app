// HTTP surface for the notifications system.
//
// Endpoints (all require auth):
//   POST   /me/push-tokens          - register/update a device push token
//   DELETE /me/push-tokens/:token   - explicit unregister (e.g. sign-out)
//   GET    /me/notifications        - paginated inbox
//   GET    /me/notifications/unread-count
//   POST   /me/notifications/:id/read
//   POST   /me/notifications/read-all
//
// Naming intentionally lives under `/me/...` so it mirrors `/auth/me` and
// the URL stays user-scoped even if we later add admin routes for support.

import { Router } from 'express';
import { z } from 'zod';
import { PushPlatform } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature } from '../middleware/require-feature.js';

const router: Router = Router();

const registerTokenSchema = z.object({
  token: z.string().trim().min(8).max(256),
  platform: z.nativeEnum(PushPlatform),
  deviceId: z.string().trim().max(128).optional(),
});

// POST /me/push-tokens — idempotent. If the token exists, update its owner
// (a phone resold to a different user is the canonical edge case).
router.post(
  '/me/push-tokens',
  requireAuth,
  requireFeature('notifications.push'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const input = registerTokenSchema.parse(req.body);

    // Expo tokens look like `ExponentPushToken[xxxxxx]` or `ExpoPushToken[...]`.
    // We accept anything matching that pattern to leave room for future SDK changes.
    if (!/^Expo(nent)?PushToken\[.+\]$/.test(input.token)) {
      throw badRequest('Token does not look like an Expo push token');
    }

    const upserted = await prisma.pushToken.upsert({
      where: { token: input.token },
      update: {
        userId,
        platform: input.platform,
        deviceId: input.deviceId,
        updatedAt: new Date(),
      },
      create: {
        userId,
        token: input.token,
        platform: input.platform,
        deviceId: input.deviceId,
      },
    });

    res.status(201).json({ id: upserted.id });
  }),
);

router.delete(
  '/me/push-tokens/:token',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const token = req.params.token!;
    await prisma.pushToken.deleteMany({ where: { userId, token } });
    res.status(204).end();
  }),
);

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().uuid().optional(),
  unreadOnly: z
    .string()
    .optional()
    .transform(v => v === 'true' || v === '1'),
});

// GET /me/notifications
router.get(
  '/me/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const q = listQuerySchema.parse(req.query);

    const rows = await prisma.notification.findMany({
      where: {
        userId,
        ...(q.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > q.limit;
    const items = hasMore ? rows.slice(0, q.limit) : rows;

    res.json({
      items: items.map(n => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        deepLink: n.deepLink,
        projectId: n.projectId,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        contextJson: n.contextJson ?? null,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    });
  }),
);

// GET /me/notifications/unread-count — cheap query for the badge.
router.get(
  '/me/notifications/unread-count',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const count = await prisma.notification.count({
      where: { userId, readAt: null },
    });
    res.json({ count });
  }),
);

router.post(
  '/me/notifications/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const id = req.params.id!;
    const existing = await prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true, readAt: true },
    });
    if (!existing) throw notFound('Notification not found');
    if (!existing.readAt) {
      await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }
    res.status(204).end();
  }),
);

router.post(
  '/me/notifications/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.status(204).end();
  }),
);

export default router;
