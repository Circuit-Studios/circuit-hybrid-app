import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserRole } from '@/api/types';
import { OTP_TTL_MS } from '@/lib/session';

export interface SignupSession {
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
  /** Unix ms — aligned with OTP TTL from the server. */
  expiresAtMs: number;
}

interface SignupSessionContextValue {
  session: SignupSession | null;
  setSession(session: Omit<SignupSession, 'expiresAtMs'> & { expiresAtMs?: number }): void;
  extendSession(expiresAtMs: number): void;
  clearSession(): void;
}

const SignupSessionContext = createContext<SignupSessionContextValue | null>(null);

export function SignupSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SignupSession | null>(null);

  const setSession = useCallback(
    (value: Omit<SignupSession, 'expiresAtMs'> & { expiresAtMs?: number }) => {
      setSessionState({
        ...value,
        expiresAtMs: value.expiresAtMs ?? Date.now() + OTP_TTL_MS,
      });
    },
    [],
  );

  const extendSession = useCallback((expiresAtMs: number) => {
    setSessionState(current => (current ? { ...current, expiresAtMs } : current));
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
  }, []);

  const value = useMemo(
    () => ({ session, setSession, extendSession, clearSession }),
    [session, setSession, extendSession, clearSession],
  );

  return <SignupSessionContext.Provider value={value}>{children}</SignupSessionContext.Provider>;
}

export function useSignupSession(): SignupSessionContextValue {
  const ctx = useContext(SignupSessionContext);
  if (!ctx) {
    throw new Error('useSignupSession must be used inside SignupSessionProvider');
  }
  return ctx;
}
