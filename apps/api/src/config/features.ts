import { env } from './env.js';
import { prisma } from '../lib/prisma.js';

export const FEATURE_FLAG_KEYS = [
  'scripts.upload',
  'scripts.shootingPlan',
  'scripts.taskSuggestions',
  'llm.nvidia',
  'team.invites',
  'auth.emailOtp',
  'auth.phoneOtp',
  'notifications.push',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

const SENSITIVE_PROD_FLAGS: FeatureFlagKey[] = [
  'scripts.upload',
  'scripts.shootingPlan',
  'scripts.taskSuggestions',
  'llm.nvidia',
  'team.invites',
];

/** Safe defaults when DB is unavailable or a key is missing. */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  'scripts.upload': true,
  'scripts.shootingPlan': true,
  'scripts.taskSuggestions': true,
  'llm.nvidia': true,
  'team.invites': true,
  'auth.emailOtp': true,
  'auth.phoneOtp': true,
  'notifications.push': true,
};

const CACHE_TTL_MS = 30_000;

type CacheEntry = {
  expiresAt: number;
  flags: Map<string, { enabled: boolean; configJson: unknown }>;
  dbFailed: boolean;
};

let cache: CacheEntry | null = null;

function defaultEnabledForKey(key: string, dbFailed: boolean): boolean {
  if (dbFailed && env.APP_ENV === 'prod' && SENSITIVE_PROD_FLAGS.includes(key as FeatureFlagKey)) {
    return false;
  }
  return DEFAULT_FEATURE_FLAGS[key as FeatureFlagKey] ?? false;
}

async function loadFlags(): Promise<CacheEntry> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache;
  }

  try {
    const rows = await prisma.featureFlag.findMany();
    const flags = new Map<string, { enabled: boolean; configJson: unknown }>();
    for (const row of rows) {
      flags.set(row.key, { enabled: row.enabled, configJson: row.configJson ?? null });
    }
    cache = { expiresAt: now + CACHE_TTL_MS, flags, dbFailed: false };
    return cache;
  } catch {
    cache = { expiresAt: now + CACHE_TTL_MS, flags: new Map(), dbFailed: true };
    return cache;
  }
}

export function clearFeatureFlagCacheForTests(): void {
  cache = null;
}

export async function getFeatureFlag(key: string): Promise<{
  enabled: boolean;
  configJson: unknown;
}> {
  const { flags, dbFailed } = await loadFlags();
  const row = flags.get(key);
  if (row) return row;

  return {
    enabled: defaultEnabledForKey(key, dbFailed),
    configJson: null,
  };
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await getFeatureFlag(key);
  return flag.enabled;
}

export async function getPublicFeatureFlags(): Promise<Record<string, boolean>> {
  const { flags, dbFailed } = await loadFlags();
  const result: Record<string, boolean> = {};

  for (const key of FEATURE_FLAG_KEYS) {
    const row = flags.get(key);
    result[key] = row ? row.enabled : defaultEnabledForKey(key, dbFailed);
  }

  for (const [key, row] of flags) {
    if (!(key in result)) result[key] = row.enabled;
  }

  return result;
}
