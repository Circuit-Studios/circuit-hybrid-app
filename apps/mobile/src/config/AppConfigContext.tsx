import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchAppConfig, type PublicAppConfig } from '@/api/appConfig';
import { canUseFeature } from '@/config/featureAccess';

const DEFAULT_CONFIG: PublicAppConfig = {
  appEnv: 'local',
  signupVerificationChannel: 'EMAIL',
  loginIdentifier: 'EMAIL',
  features: {
    'scripts.upload': true,
    'scripts.aiAnalysis': true,
    'scripts.shootingPlan': true,
    'scripts.taskSuggestions': true,
    'llm.nvidia': true,
    'team.invites': true,
    'auth.emailOtp': true,
    'auth.phoneOtp': true,
    'notifications.push': true,
  },
};

interface AppConfigContextValue {
  config: PublicAppConfig;
  loading: boolean;
  refresh(): Promise<void>;
  isFeatureEnabled(feature: keyof PublicAppConfig['features'] | string): boolean;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicAppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchAppConfig();
      setConfig(next);
    } catch {
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchAppConfig();
        if (!cancelled) setConfig(next);
      } catch {
        if (!cancelled) setConfig(DEFAULT_CONFIG);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isFeatureEnabled = useCallback(
    (feature: string) => canUseFeature({ feature: feature as never, flags: config.features }),
    [config.features],
  );

  const value = useMemo(
    () => ({ config, loading, refresh, isFeatureEnabled }),
    [config, loading, refresh, isFeatureEnabled],
  );

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    throw new Error('useAppConfig must be used inside AppConfigProvider');
  }
  return ctx;
}
