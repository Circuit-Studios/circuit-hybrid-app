import { prisma } from '../lib/prisma.js';

export const FEATURE_FLAG_KEYS = [
  'scripts.upload',
  'scripts.aiAnalysis',
  'team.invites',
  'auth.emailOtp',
  'auth.phoneOtp',
  'notifications.push',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

/** Safe defaults when DB is unavailable or a key is missing. */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  'scripts.upload': true,
  'scripts.aiAnalysis': true,
  'team.invites': true,
  'auth.emailOtp': true,
  'auth.phoneOtp': true,
  'notifications.push': true,
};

const CACHE_TTL_MS = 30_000;

type CacheEntry = {
  expiresAt: number;
  flags: Map<string, { enabled: boolean; configJson: unknown }>;
};

let cache: CacheEntry | null = null;

async function loadFlags(): Promise<Map<string, { enabled: boolean; configJson: unknown }>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.flags;
  }

  try {
    const rows = await prisma.featureFlag.findMany();
    const flags = new Map<string, { enabled: boolean; configJson: unknown }>();
    for (const row of rows) {
      flags.set(row.key, { enabled: row.enabled, configJson: row.configJson ?? null });
    }
    cache = { expiresAt: now + CACHE_TTL_MS, flags };
    return flags;
  } catch {
    return new Map();
  }
}

export function clearFeatureFlagCacheForTests(): void {
  cache = null;
}

export async function getFeatureFlag(key: string): Promise<{
  enabled: boolean;
  configJson: unknown;
}> {
  const flags = await loadFlags();
  const row = flags.get(key);
  if (row) return row;

  const defaultEnabled = DEFAULT_FEATURE_FLAGS[key as FeatureFlagKey];
  return {
    enabled: defaultEnabled ?? false,
    configJson: null,
  };
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await getFeatureFlag(key);
  return flag.enabled;
}

export async function getPublicFeatureFlags(): Promise<Record<string, boolean>> {
  const flags = await loadFlags();
  const result: Record<string, boolean> = { ...DEFAULT_FEATURE_FLAGS };

  for (const key of FEATURE_FLAG_KEYS) {
    const row = flags.get(key);
    if (row) result[key] = row.enabled;
  }

  for (const [key, row] of flags) {
    if (!(key in result)) result[key] = row.enabled;
  }

  return result;
}
