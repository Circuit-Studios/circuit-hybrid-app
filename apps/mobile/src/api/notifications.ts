// Notification + push-token API.
//
// Lives in its own module so the realtime/push registration code can import
// it without dragging in the rest of the API surface.

import { api } from './client';
import type { NotificationRecord, PushPlatform } from './types';

export interface NotificationsPage {
  items: NotificationRecord[];
  nextCursor: string | null;
}

export async function listNotifications(opts?: {
  cursor?: string;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationsPage> {
  const { data } = await api.get<NotificationsPage>('/me/notifications', {
    params: {
      ...(opts?.cursor ? { cursor: opts.cursor } : {}),
      ...(opts?.unreadOnly ? { unreadOnly: 'true' } : {}),
      ...(opts?.limit ? { limit: opts.limit } : {}),
    },
  });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/me/notifications/unread-count');
  return data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/me/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/me/notifications/read-all');
}

export async function registerPushToken(input: {
  token: string;
  platform: PushPlatform;
  deviceId?: string;
}): Promise<void> {
  await api.post('/me/push-tokens', input);
}

export async function unregisterPushToken(token: string): Promise<void> {
  await api.delete(`/me/push-tokens/${encodeURIComponent(token)}`);
}
