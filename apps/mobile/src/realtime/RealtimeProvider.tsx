import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { useAppConfig } from '@/config/AppConfigContext';
import { storage } from '@/lib/storage';
import { circuitSocket } from './socket';
import { attachNotificationHandlers, registerForPush } from './push';
import type { RealtimeEvent } from '@/api/types';

// Maps a realtime topic to the query keys that should be marked stale when
// that event fires. We err on the side of broad invalidation — React Query
// will dedupe and gate refetches behind staleTime.
function affectedKeys(event: RealtimeEvent): Array<readonly unknown[]> {
  const { topic, projectId } = event;
  switch (topic) {
    case 'task.created':
    case 'task.updated':
    case 'task.deleted':
      return [qk.tasksRoot(projectId), qk.health(projectId)];
    case 'shootday.created':
    case 'shootday.updated':
    case 'shootday.deleted':
      return [qk.schedule(projectId), qk.health(projectId), qk.conflicts(projectId)];
    case 'conflict.created':
    case 'conflict.resolved':
      return [qk.conflicts(projectId), qk.health(projectId)];
    case 'member.invited':
    case 'member.updated':
      return [qk.members(projectId)];
    case 'script.analysis.updated': {
      const data = event.data as { scriptId?: string } | undefined;
      const out: Array<readonly unknown[]> = [qk.health(projectId)];
      if (data?.scriptId) out.push(qk.analysis(data.scriptId));
      return out;
    }
    case 'notification.created':
      return [qk.notifications(), qk.unreadCount()];
    case 'character.updated':
      return [qk.characters(projectId)];
    case 'scene.updated':
      return [qk.scenes(projectId)];
    case 'department.updated':
      return [qk.departments(projectId), qk.health(projectId)];
    case 'budgetline.updated':
      return [qk.budgetLines(projectId)];
    default:
      return [];
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const { isFeatureEnabled } = useAppConfig();
  const qc = useQueryClient();
  const unsubRef = useRef<(() => void) | null>(null);
  const pushUnsubRef = useRef<(() => void) | null>(null);

  // Boot / tear down the socket in lockstep with auth status.
  useEffect(() => {
    if (status !== 'signedIn' || !user) {
      unsubRef.current?.();
      unsubRef.current = null;
      pushUnsubRef.current?.();
      pushUnsubRef.current = null;
      circuitSocket.disconnect();
      return;
    }

    let cancelled = false;
    void (async () => {
      const token = await storage.getToken();
      if (!token || cancelled) return;
      circuitSocket.connect(token);
      const unsub = circuitSocket.onEvent((event) => {
        for (const key of affectedKeys(event)) {
          void qc.invalidateQueries({ queryKey: key });
        }
      });
      unsubRef.current = unsub;

      // Best-effort push registration (won't crash on simulators).
      if (isFeatureEnabled('notifications.push')) {
        void registerForPush();
      }

      // Tap-to-deep-link. The backend includes `deepLink` in `data` on every
      // push, so we navigate straight to the relevant screen.
      pushUnsubRef.current = attachNotificationHandlers({
        onTap: (response) => {
          const data = response.notification.request.content.data as
            | { deepLink?: string }
            | undefined;
          if (data?.deepLink) {
            router.push(data.deepLink as never);
          }
          // Either way, refresh the inbox + badge.
          void qc.invalidateQueries({ queryKey: qk.notifications() });
          void qc.invalidateQueries({ queryKey: qk.unreadCount() });
        },
        onReceive: () => {
          void qc.invalidateQueries({ queryKey: qk.notifications() });
          void qc.invalidateQueries({ queryKey: qk.unreadCount() });
        },
      });
    })();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
      pushUnsubRef.current?.();
      pushUnsubRef.current = null;
    };
  }, [status, user, qc, isFeatureEnabled]);

  return <>{children}</>;
}
