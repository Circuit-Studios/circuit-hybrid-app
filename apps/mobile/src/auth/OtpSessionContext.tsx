import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { UserRole } from '@/api/types';
import { isValidPassword } from '@/lib/password';
import { OTP_TTL_MS } from '@/lib/session';

export type OtpFlowMode = 'signup' | 'login';
export type OtpChannel = 'EMAIL' | 'PHONE';

export type OtpLoginSession = {
  channel: OtpChannel;
  email?: string;
  phone?: string;
  mode: 'login';
  expiresAtMs: number;
};

export type OtpSignupSession = {
  channel: OtpChannel;
  email?: string;
  phone?: string;
  password: string;
  mode: 'signup';
  firstName: string;
  lastName?: string;
  role: UserRole;
  expiresAtMs: number;
};

export type OtpSession = OtpLoginSession | OtpSignupSession;

type SetOtpSessionInput =
  | (Omit<OtpLoginSession, 'expiresAtMs'> & { expiresAtMs?: number })
  | (Omit<OtpSignupSession, 'expiresAtMs'> & { expiresAtMs?: number });

interface OtpSessionContextValue {
  session: OtpSession | null;
  setSession(session: SetOtpSessionInput): void;
  extendSession(expiresAtMs: number): void;
  clearSession(): void;
}

const OtpSessionContext = createContext<OtpSessionContextValue | null>(null);

export function OtpSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<OtpSession | null>(null);

  const setSession = useCallback((value: SetOtpSessionInput) => {
    if (value.mode === 'signup') {
      if (!value.firstName.trim() || !value.role || !isValidPassword(value.password)) {
        throw new Error('Signup sessions require name, role, and a valid password');
      }
    }

    setSessionState({
      ...value,
      expiresAtMs: value.expiresAtMs ?? Date.now() + OTP_TTL_MS,
    });
  }, []);

  const extendSession = useCallback((expiresAtMs: number) => {
    setSessionState((current) => (current ? { ...current, expiresAtMs } : current));
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

export function useOtpSession(): OtpSessionContextValue {
  const ctx = useContext(OtpSessionContext);
  if (!ctx) {
    throw new Error('useOtpSession must be used inside OtpSessionProvider');
  }
  return ctx;
}
