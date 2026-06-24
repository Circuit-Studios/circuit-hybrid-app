import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  featureFlag: {
    findMany: vi.fn(),
  },
};

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('features service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns DB flag values when present', async () => {
    prismaMock.featureFlag.findMany.mockResolvedValue([
      { key: 'scripts.upload', enabled: false, configJson: null },
    ]);

    const { isFeatureEnabled, clearFeatureFlagCacheForTests } =
      await import('../../src/config/features.js');
    clearFeatureFlagCacheForTests();
    await expect(isFeatureEnabled('scripts.upload')).resolves.toBe(false);
  });

  it('falls back to safe defaults when key missing', async () => {
    prismaMock.featureFlag.findMany.mockResolvedValue([]);

    const { isFeatureEnabled, clearFeatureFlagCacheForTests } =
      await import('../../src/config/features.js');
    clearFeatureFlagCacheForTests();
    await expect(isFeatureEnabled('team.invites')).resolves.toBe(true);
  });

  it('defaults sensitive flags to false in prod when DB read fails', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', () => ({
      env: { APP_ENV: 'prod' },
    }));

    prismaMock.featureFlag.findMany.mockRejectedValue(new Error('db down'));

    const { isFeatureEnabled, clearFeatureFlagCacheForTests } =
      await import('../../src/config/features.js');
    clearFeatureFlagCacheForTests();

    await expect(isFeatureEnabled('scripts.upload')).resolves.toBe(false);
    await expect(isFeatureEnabled('auth.emailOtp')).resolves.toBe(true);
  });
});
