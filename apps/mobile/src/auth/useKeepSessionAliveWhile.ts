import { useEffect } from 'react';
import { storage } from '@/lib/storage';
import { SESSION_KEEPALIVE_PULSE_MS } from '@/lib/session';

/**
 * Extends the idle session while a foreground task runs (e.g. script analysis).
 * User taps still reset the timer via IdleActivityCapture; this covers passive watching.
 */
export function useKeepSessionAliveWhile(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    void storage.touchActivity();

    const interval = setInterval(() => {
      void storage.touchActivity();
    }, SESSION_KEEPALIVE_PULSE_MS);

    return () => clearInterval(interval);
  }, [active]);
}
