// Push notifications glue (Expo).
//
// Responsibilities:
//   - Request OS permission (iOS prompts; Android 13+ prompts).
//   - Configure Android channels (one per kind so important alerts can ring
//     louder than informational ones).
//   - Fetch the Expo push token.
//   - Hand the token to the backend so it can be reused for dispatch.
//   - Install foreground + background handlers so notifications show up
//     even when the app is in the foreground.
//
// The whole module is a no-op on the web (Expo notifications doesn't have
// full web support) and on simulators that can't receive remote pushes.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken, unregisterPushToken } from '@/api/notifications';
import type { PushPlatform } from '@/api/types';

let lastRegisteredPushToken: string | null = null;

// Foreground handler: show OS-style banner + ding even when app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ANDROID_CHANNELS: Array<{
  id: string;
  name: string;
  importance: Notifications.AndroidImportance;
  description: string;
}> = [
  {
    id: 'conflicts',
    name: 'Conflicts',
    importance: Notifications.AndroidImportance.MAX,
    description: 'Cross-project clashes & critical alerts',
  },
  {
    id: 'shoots',
    name: 'Shoot day',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Call times, schedule changes',
  },
  {
    id: 'tasks',
    name: 'Tasks',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Task assignments and updates',
  },
  {
    id: 'general',
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Other notifications',
  },
];

async function configureAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const ch of ANDROID_CHANNELS) {
    await Notifications.setNotificationChannelAsync(ch.id, {
      name: ch.name,
      importance: ch.importance,
      description: ch.description,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F47A1F',
    });
  }
}

export interface PushRegisterResult {
  ok: boolean;
  token?: string;
  reason?: 'not-device' | 'denied' | 'no-project-id' | 'error';
  error?: unknown;
}

// Tries to register the device for push and tells the backend. Safe to call
// multiple times — server-side upsert dedupes on token.
export async function registerForPush(): Promise<PushRegisterResult> {
  try {
    if (Platform.OS !== 'web' && !Device.isDevice) {
      return { ok: false, reason: 'not-device' };
    }

    await configureAndroid();

    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      return { ok: false, reason: 'denied' };
    }

    // Expo Application Services (EAS) gives a `projectId` we forward to
    // `getExpoPushTokenAsync`. Pull it from app.json / EAS config.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;

    const tokenResp = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const platform: PushPlatform =
      Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';

    await registerPushToken({ token: tokenResp.data, platform });
    lastRegisteredPushToken = tokenResp.data;
    return { ok: true, token: tokenResp.data };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}

export async function unregisterPush(token: string): Promise<void> {
  try {
    await unregisterPushToken(token);
  } catch {
    // Best-effort; if sign-out is in progress the request may 401.
  }
}

/** Unregister the device push token before clearing the auth session. */
export async function teardownPushRegistration(): Promise<void> {
  if (!lastRegisteredPushToken) return;
  const token = lastRegisteredPushToken;
  lastRegisteredPushToken = null;
  await unregisterPush(token);
}

// Attach foreground/response handlers. Returns an unsubscribe function.
export function attachNotificationHandlers(opts: {
  // Fired when a notification arrives while the app is in the foreground.
  onReceive?: (notification: Notifications.Notification) => void;
  // Fired when the user taps a notification (foreground OR cold-start).
  onTap?: (response: Notifications.NotificationResponse) => void;
}): () => void {
  const sub1 = opts.onReceive
    ? Notifications.addNotificationReceivedListener(opts.onReceive)
    : null;
  const sub2 = opts.onTap
    ? Notifications.addNotificationResponseReceivedListener(opts.onTap)
    : null;
  return () => {
    sub1?.remove();
    sub2?.remove();
  };
}
