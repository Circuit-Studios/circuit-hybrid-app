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

export type OtpFlowMode = 'signup' | 'login';

export interface OtpSession {
  email: string;
  mode: OtpFlowMode;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  expiresAtMs: number;
}

interface OtpSessionContextValue {
  session: OtpSession | null;
  setSession(session: Omit<OtpSession, 'expiresAtMs'> & { expiresAtMs?: number }): void;
  extendSession(expiresAtMs: number): void;
  clearSession(): void;
}

const OtpSessionContext = createContext<OtpSessionContextValue | null>(null);

export function OtpSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<OtpSession | null>(null);

  const setSession = useCallback(
    (value: Omit<OtpSession, 'expiresAtMs'> & { expiresAtMs?: number }) => {
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

  return <OtpSessionContext.Provider value={value}>{children}</OtpSessionContext.Provider>;
}

/** @deprecated Use OtpSessionProvider */
export const SignupSessionProvider = OtpSessionProvider;

export function useOtpSession(): OtpSessionContextValue {
  const ctx = useContext(OtpSessionContext);
  if (!ctx) {
    throw new Error('useOtpSession must be used inside OtpSessionProvider');
  }
  return ctx;
}

/** @deprecated Use useOtpSession */
export const useSignupSession = useOtpSession;
