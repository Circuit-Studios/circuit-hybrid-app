// Expo Push delivery.
//
// We talk to Expo's REST endpoint directly instead of pulling in
// `expo-server-sdk` because:
//   1. We already have a thin axios/fetch boundary everywhere else.
//   2. The SDK pulls in a bunch of Node-only deps (e.g. node-fetch) that
//      conflict with the ESM setup we use across this project.
//   3. The wire protocol is tiny — one POST to /v2/push/send, JSON in,
//      JSON out — so dropping a dependency is a clear win.
//
// Reference: https://docs.expo.dev/push-notifications/sending-notifications/
//
// Behaviour:
//   - If EXPO_PUSH_PROVIDER=MOCK (the default in dev), we short-circuit and
//     return synthetic tickets so downstream code (Notification rows etc.)
//     behaves the same.
//   - Tokens that come back with a permanent error (DeviceNotRegistered,
//     InvalidCredentials, MessageTooBig) are surfaced to the caller so the
//     dispatcher can prune the PushToken row.

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  // Optional sound; iOS default "default" plays the standard chime.
  sound?: 'default' | null;
  // Optional badge count; iOS will update the app icon badge.
  badge?: number;
  // `high` priority wakes Android out of doze.
  priority?: 'default' | 'normal' | 'high';
}

export type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | {
      status: 'error';
      message: string;
      details?: { error?: string };
    };

export interface ExpoPushResult {
  to: string;
  ticket: ExpoPushTicket;
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Expo allows up to 100 messages per request. We batch defensively at 90 to
// leave headroom for retries.
const BATCH_SIZE = 90;

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<ExpoPushResult[]> {
  if (messages.length === 0) return [];

  if (env.EXPO_PUSH_PROVIDER === 'MOCK') {
    logger.debug({ count: messages.length }, '[expo-push:mock] dispatched');
    return messages.map(m => ({
      to: m.to,
      ticket: { status: 'ok' as const, id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    }));
  }

  const results: ExpoPushResult[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          ...(env.EXPO_ACCESS_TOKEN
            ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        const txt = await res.text();
        logger.error({ status: res.status, body: txt.slice(0, 500) }, 'Expo push HTTP error');
        for (const m of batch) {
          results.push({ to: m.to, ticket: { status: 'error', message: `HTTP ${res.status}` } });
        }
        continue;
      }
      const json = (await res.json()) as { data?: ExpoPushTicket[] };
      const tickets = json.data ?? [];
      batch.forEach((m, idx) => {
        const ticket = tickets[idx] ?? { status: 'error' as const, message: 'No ticket returned' };
        results.push({ to: m.to, ticket });
      });
    } catch (err) {
      logger.error({ err }, 'Expo push fetch failed');
      for (const m of batch) {
        results.push({ to: m.to, ticket: { status: 'error', message: (err as Error).message } });
      }
    }
  }
  return results;
}

// Errors that mean the token will never deliver. The dispatcher uses this
// to prune the PushToken row so we don't keep retrying.
export const FATAL_PUSH_ERRORS = new Set([
  'DeviceNotRegistered',
  'InvalidCredentials',
  'MessageTooBig',
  'MismatchSenderId',
]);
