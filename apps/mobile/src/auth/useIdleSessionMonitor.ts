import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { IDLE_CHECK_INTERVAL_MS, isIdleSessionExpired } from '@/lib/session';
import { storage } from '@/lib/storage';

/** Sign out when the user has been idle longer than IDLE_TIMEOUT_MS. */
export function useIdleSessionMonitor(
  enabled: boolean,
  onIdle: () => void | Promise<void>,
): void {
  useEffect(() => {
    if (!enabled) return;

    let checking = false;

    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const lastActivityAtMs = await storage.getLastActivityAtMs();
        if (lastActivityAtMs != null && isIdleSessionExpired(lastActivityAtMs)) {
          await onIdle();
        }
      } finally {
        checking = false;
      }
    };

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void check();
    };

    void check();
    const sub = AppState.addEventListener('change', onAppState);
    const interval = setInterval(() => {
      void check();
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [enabled, onIdle]);
}
