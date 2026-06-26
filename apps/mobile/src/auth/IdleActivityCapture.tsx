import { useCallback, type ReactNode } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { storage } from '@/lib/storage';

/** Resets the idle timer on taps and gestures only (not API polling). */
export function IdleActivityCapture({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  const recordActivity = useCallback(() => {
    if (status !== 'signedIn') return;
    void storage.touchActivity();
  }, [status]);

  if (status !== 'signedIn') {
    return children;
  }

  return (
    <View style={{ flex: 1 }} onTouchStart={recordActivity} onTouchEnd={recordActivity}>
      {children}
    </View>
  );
}
