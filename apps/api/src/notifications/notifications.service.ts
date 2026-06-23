// Notification dispatch.
//
// Responsibilities:
//   1. Write `Notification` rows for in-app inbox (always).
//   2. Fan-out Expo Push to every registered PushToken for the target user
//      (best-effort; failures don't block the in-app row).
//   3. Emit a `notification.created` Socket.IO event to the user's room so
//      the mobile app can pop a toast / refresh the badge without polling.
//   4. Prune PushTokens that come back with a fatal Expo error.
//
// Designed to be called from anywhere on the backend:
//   - Conflict detector → CONFLICT_ALERT
//   - Task routes (when assignee changes) → TASK_ASSIGNED
//   - Shoot-day routes (when a member is called for a day) → SHOOT_DAY_CALL
//   - Members routes (on invite) → PROJECT_INVITE
//   - AI pipeline (on completion) → AI_ANALYSIS_DONE
//
// All callers should treat this as fire-and-forget; we never throw.

import type { NotificationChannel, NotificationKind, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { emitToUser } from '../realtime/socket.js';
import { FATAL_PUSH_ERRORS, sendExpoPush, type ExpoPushMessage } from './expo-push.provider.js';

export interface DispatchNotificationInput {
  userIds: string[];
  kind: NotificationKind;
  title: string;
  body: string;
  projectId?: string;
  deepLink?: string;
  // Extra context the mobile client can read off the inbox row. Defaults
  // to an empty object.
  context?: Record<string, unknown>;
  // Set `false` to skip push (e.g. when the user themselves triggered the
  // change — they don't need a push for their own action).
  push?: boolean;
}

// Sends one logical notification to a list of users. Each user gets:
//   1 Notification row per channel (IN_APP always, PUSH if a token exists)
// We don't dedupe — callers should already filter out the actor.
export async function dispatchNotification(input: DispatchNotificationInput): Promise<void> {
  const recipients = [...new Set(input.userIds.filter(Boolean))];
  if (recipients.length === 0) return;

  const shouldPush = input.push !== false;
  const baseContext = input.context ?? {};

  try {
    // ---- 1. Always: write IN_APP inbox rows + push events --------------
    const inAppRows = await Promise.all(
      recipients.map(userId =>
        prisma.notification.create({
          data: {
            userId,
            channel: 'IN_APP',
            kind: input.kind,
            title: input.title,
            body: input.body,
            projectId: input.projectId,
            deepLink: input.deepLink,
            contextJson: baseContext as Prisma.InputJsonValue,
          },
        }),
      ),
    );

    for (const row of inAppRows) {
      emitToUser(row.userId, 'notification.created', input.projectId ?? '', {
        notificationId: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        deepLink: row.deepLink,
        projectId: row.projectId,
        createdAt: row.createdAt.toISOString(),
      });
    }

    // ---- 2. Optional: fan-out PUSH -------------------------------------
    if (!shouldPush) return;

    const tokens = await prisma.pushToken.findMany({
      where: { userId: { in: recipients } },
      select: { id: true, userId: true, token: true },
    });
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map(t => ({
      to: t.token,
      title: input.title,
      body: input.body,
      sound: 'default',
      priority: 'high',
      data: {
        kind: input.kind,
        deepLink: input.deepLink,
        projectId: input.projectId,
        ...baseContext,
      },
    }));

    const results = await sendExpoPush(messages);

    // Update notification rows with delivery outcome + prune dead tokens.
    const deadTokenIds: string[] = [];
    await Promise.all(
      results.map(async (result, idx) => {
        const token = tokens[idx];
        if (!token) return;
        const inApp = inAppRows.find(r => r.userId === token.userId);
        const baseUpdate = inApp
          ? prisma.notification.update({
              where: { id: inApp.id },
              data: {
                sentAt: new Date(),
                pushTicketId: result.ticket.status === 'ok' ? result.ticket.id : null,
                pushError: result.ticket.status === 'error' ? result.ticket.message : null,
              },
            })
          : Promise.resolve();

        if (
          result.ticket.status === 'error' &&
          result.ticket.details?.error &&
          FATAL_PUSH_ERRORS.has(result.ticket.details.error)
        ) {
          deadTokenIds.push(token.id);
        }
        await baseUpdate;
      }),
    );

    if (deadTokenIds.length > 0) {
      await prisma.pushToken.deleteMany({ where: { id: { in: deadTokenIds } } });
      logger.info({ count: deadTokenIds.length }, 'Pruned dead push tokens');
    }
  } catch (err) {
    // Never let notification failures bubble up to the caller.
    logger.error(
      { err, kind: input.kind, recipients: recipients.length },
      'dispatchNotification failed',
    );
  }
}

// Convenience helper used by routes that want a per-channel breakdown.
export type ChannelBreakdown = Record<NotificationChannel, number>;
