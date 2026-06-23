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
import { setUnauthorizedHandler, setAuthToken, wakeApi } from '@/api/client';
import { getMe, verifyOtp as apiVerifyOtp, type VerifyOtpInput } from '@/api/auth';
import { teardownPushRegistration } from '@/realtime/push';
import { isIdleSessionExpired, isSessionExpired, resolveSessionExpiresAtMs } from '@/lib/session';
import { useIdleSessionMonitor } from '@/auth/useIdleSessionMonitor';
import type { AuthUser, VerifyOtpResponse } from '@/api/types';
import type { StoredUser } from '@/lib/storage';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  verifyOtp(input: VerifyOtpInput): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function storedUserToAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    defaultRole: user.defaultRole as AuthUser['defaultRole'],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const signOut = useCallback(async () => {
    await teardownPushRegistration();
    await storage.clearSession();
    setAuthToken(null);
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

    const finishBoot = () => {
      clearTimeout(bootTimeout);
    };

    (async () => {
      try {
        const session = await storage.loadSession().catch(err => {
          logger.warn('auth loadSession failed; treating as signed-out', { error: String(err) });
          return null;
        });
        if (!session) {
          finishBoot();
          if (!cancelled) setStatus('signedOut');
          return;
        }

        const jwtExpiresAtMs =
          session.expiresAtMs > 0
            ? session.expiresAtMs
            : resolveSessionExpiresAtMs(undefined, session.token);
        if (jwtExpiresAtMs != null && isSessionExpired(jwtExpiresAtMs)) {
          finishBoot();
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
          finishBoot();
          if (!cancelled) {
            await storage.clearSession().catch(() => {});
            setStatus('signedOut');
          }
          return;
        }

        try {
          setAuthToken(session.token);
          if (!cancelled) {
            setUser(storedUserToAuthUser(session.user));
            setStatus('signedIn');
            finishBoot();
          }

          await wakeApi();
          const me = await getMe();
          if (cancelled) return;
          setUser(me.user);
        } catch (err) {
          if (cancelled) return;
          const isUnauthorized =
            typeof err === 'object' &&
            err !== null &&
            'response' in err &&
            (err as { response?: { status?: number } }).response?.status === 401;
          if (isUnauthorized) {
            finishBoot();
            logger.warn('auth getMe failed; signing out', { error: String(err) });
            setAuthToken(null);
            await storage.clearSession().catch(() => {});
            setUser(null);
            setStatus('signedOut');
            return;
          }
          logger.warn('auth getMe refresh failed; keeping cached session', { error: String(err) });
        }
      } catch (err) {
        finishBoot();
        if (cancelled) return;
        logger.warn('auth boot failed unexpectedly; signing out', { error: String(err) });
        setStatus('signedOut');
      }
    })();

    return () => {
      cancelled = true;
      finishBoot();
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
    setAuthToken(res.token);
    setUser(res.user);
    setStatus('signedIn');
  }, []);

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
    () => ({ status, user, verifyOtp, signOut, refresh }),
    [status, user, verifyOtp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
