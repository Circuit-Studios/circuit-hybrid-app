export type AppEnv = 'local' | 'development' | 'preview' | 'production';

const VALID_APP_ENVS: readonly AppEnv[] = ['local', 'development', 'preview', 'production'];

function parseAppEnv(raw: string | undefined): AppEnv {
  if (raw && (VALID_APP_ENVS as readonly string[]).includes(raw)) {
    return raw as AppEnv;
  }
  return 'development';
}

function parseApiBaseUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');
  }
  try {
    // Fail fast on typos before any network call.
    new URL(value);
  } catch {
    throw new Error(`Invalid EXPO_PUBLIC_API_BASE_URL: ${value}`);
  }
  return value;
}

const appEnv = parseAppEnv(process.env.EXPO_PUBLIC_APP_ENV);
const apiBaseUrl = parseApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

export const appConfig = {
  appEnv,
  apiBaseUrl,
  isLocal: appEnv === 'local',
  isProduction: appEnv === 'production',
} as const;

export type AppConfig = typeof appConfig;
