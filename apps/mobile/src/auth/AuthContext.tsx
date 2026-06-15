import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { logger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import { setUnauthorizedHandler } from '@/api/client';
import {
  getMe,
  login as apiLogin,
  verifyOtp as apiVerifyOtp,
  type VerifyOtpInput,
} from '@/api/auth';
import { teardownPushRegistration } from '@/realtime/push';
import {
  isIdleSessionExpired,
  isSessionExpired,
  resolveSessionExpiresAtMs,
} from '@/lib/session';
import { useIdleSessionMonitor } from '@/auth/useIdleSessionMonitor';
import type { AuthUser, VerifyOtpResponse } from '@/api/types';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login(phone: string, password: string): Promise<void>;
  verifyOtp(input: VerifyOtpInput): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const signOut = useCallback(async () => {
    await teardownPushRegistration();
    await storage.clearSession();
    setUser(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
  }, [signOut]);

  useIdleSessionMonitor(status === 'signedIn', signOut);

  useEffect(() => {
    let cancelled = false;

    const bootTimeout = setTimeout(() => {
      if (!cancelled) {
        logger.warn('auth boot timed out; treating as signed-out');
        setStatus('signedOut');
      }
    }, 8000);

    (async () => {
      try {
        const session = await storage.loadSession().catch(err => {
          logger.warn('auth loadSession failed; treating as signed-out', { error: String(err) });
          return null;
        });
        if (!session) {
          if (!cancelled) setStatus('signedOut');
          return;
        }

        const jwtExpiresAtMs =
          session.expiresAtMs > 0
            ? session.expiresAtMs
            : resolveSessionExpiresAtMs(undefined, session.token);
        if (jwtExpiresAtMs != null && isSessionExpired(jwtExpiresAtMs)) {
          if (!cancelled) {
            await storage.clearSession().catch(() => {});
            setStatus('signedOut');
          }
          return;
        }

        const lastActivityAtMs = await storage.getLastActivityAtMs();
        if (lastActivityAtMs == null) {
          await storage.touchActivity();
        } else if (isIdleSessionExpired(lastActivityAtMs)) {
          if (!cancelled) {
            await storage.clearSession().catch(() => {});
            setStatus('signedOut');
          }
          return;
        }

        try {
          const me = await getMe();
          if (cancelled) return;
          setUser(me.user);
          setStatus('signedIn');
        } catch (err) {
          if (cancelled) return;
          logger.warn('auth getMe failed; signing out', { error: String(err) });
          await storage.clearSession().catch(() => {});
          setStatus('signedOut');
        }
      } catch (err) {
        if (cancelled) return;
        logger.warn('auth boot failed unexpectedly; signing out', { error: String(err) });
        setStatus('signedOut');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(bootTimeout);
    };
  }, []);

  const saveSession = useCallback(async (res: VerifyOtpResponse) => {
    const expiresAtMs = resolveSessionExpiresAtMs(res.expiresAt, res.token);
    await storage.saveSession(
      res.token,
      {
        id: res.user.id,
        phone: res.user.phone,
        email: res.user.email,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        defaultRole: res.user.defaultRole,
      },
      expiresAtMs ?? 0,
    );
    setUser(res.user);
    setStatus('signedIn');
  }, []);

  const login = useCallback(
    async (phone: string, password: string) => {
      const res = await apiLogin(phone, password);
      await saveSession(res);
    },
    [saveSession],
  );

  const verifyOtp = useCallback(
    async (input: VerifyOtpInput) => {
      const res = await apiVerifyOtp(input);
      await saveSession(res);
    },
    [saveSession],
  );

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me.user);
    } catch {
      await signOut();
    }
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, verifyOtp, signOut, refresh }),
    [status, user, login, verifyOtp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
