// Socket.IO server with JWT-based handshake auth + per-project rooms.
//
// Lifecycle:
//   1. server/index.ts hands us the HTTP server -> initSocket(httpServer)
//   2. Clients connect with `{ auth: { token } }` (or `?token=...` fallback)
//   3. We verify the JWT and stash the userId on the socket
//   4. Clients send `join` with a projectId; we check membership and add to
//      `project:{projectId}` room. We also auto-join `user:{userId}`.
//   5. Route handlers call `emitToProject(projectId, event)` to broadcast
//      cache-invalidation cues to all connected members.

import type { Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { logger } from '../lib/logger.js';
import { verifyJwt } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { type RealtimeEvent, type RealtimeTopic, buildEvent } from './events.js';

interface AuthedSocketData {
  userId: string;
  joinedProjects: Set<string>;
}

// Socket.IO's generics let us type `socket.data` at the call sites without
// global module augmentation (which conflicts with the library's own types).
type AuthedIOServer = IOServer<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  AuthedSocketData
>;

let io: AuthedIOServer | null = null;

export function initSocket(httpServer: HttpServer, corsOrigins: string[]): AuthedIOServer {
  io = new IOServer<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>,
    AuthedSocketData
  >(httpServer, {
    cors: {
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    },
    // The default 1 MB is plenty for cache-invalidation events.
    maxHttpBufferSize: 256 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.query?.token as string | undefined);
      if (!token) return next(new Error('Missing auth token'));
      const claims = verifyJwt(token);
      socket.data = { userId: claims.sub, joinedProjects: new Set() };
      next();
    } catch (err) {
      logger.warn({ err }, 'Socket auth rejected');
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    void socket.join(`user:${socket.data.userId}`);
    logger.info({ userId: socket.data.userId, sid: socket.id }, 'Socket connected');

    socket.on('join', async (payload: { projectId?: string }, ack?: (res: unknown) => void) => {
      const projectId = payload?.projectId;
      if (!projectId) return ack?.({ ok: false, error: 'projectId is required' });

      const membership = await prisma.projectMember.findFirst({
        where: { projectId, userId: socket.data.userId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!membership) return ack?.({ ok: false, error: 'Not a member of this project' });

      await socket.join(`project:${projectId}`);
      socket.data.joinedProjects.add(projectId);
      ack?.({ ok: true });
    });

    socket.on('leave', async (payload: { projectId?: string }, ack?: (res: unknown) => void) => {
      const projectId = payload?.projectId;
      if (!projectId) return ack?.({ ok: false, error: 'projectId is required' });
      await socket.leave(`project:${projectId}`);
      socket.data.joinedProjects.delete(projectId);
      ack?.({ ok: true });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.data.userId, sid: socket.id, reason }, 'Socket disconnected');
    });
  });

  return io;
}

export function getSocket(): AuthedIOServer | null {
  return io;
}

export function emitToProject<T>(
  projectId: string,
  topic: RealtimeTopic,
  data: T,
): RealtimeEvent<T> | null {
  const event = buildEvent(topic, projectId, data);
  if (!io) {
    // In tests we run without a socket server attached. Logging once per
    // miss keeps drift visible without flooding output.
    return event;
  }
  io.to(`project:${projectId}`).emit('event', event);
  return event;
}

export function emitToUser<T>(
  userId: string,
  topic: RealtimeTopic,
  projectId: string,
  data: T,
): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('event', buildEvent(topic, projectId, data));
}
