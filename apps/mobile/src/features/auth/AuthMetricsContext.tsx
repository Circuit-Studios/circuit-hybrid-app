import { createContext, useContext, type ReactNode } from 'react';
import {
  getAuthLayoutMetrics,
  type AuthLayoutMetrics,
  type AuthScreenMode,
} from '@/features/auth/getAuthLayoutMetrics';

const AuthMetricsContext = createContext<AuthLayoutMetrics | null>(null);

interface AuthMetricsProviderProps {
  metrics: AuthLayoutMetrics;
  children: ReactNode;
}

export function AuthMetricsProvider({ metrics, children }: AuthMetricsProviderProps) {
  return <AuthMetricsContext.Provider value={metrics}>{children}</AuthMetricsContext.Provider>;
}

export function useAuthMetrics(mode: AuthScreenMode = 'signIn'): AuthLayoutMetrics {
  const ctx = useContext(AuthMetricsContext);
  if (ctx) return ctx;

  return getAuthLayoutMetrics({
    width: 430,
    height: 932,
    safeAreaTop: 59,
    safeAreaBottom: 34,
    isLandscape: false,
    isSmallPhone: false,
    isShortHeight: false,
    isVeryShortHeight: false,
    isTablet: false,
    mode,
  });
}
