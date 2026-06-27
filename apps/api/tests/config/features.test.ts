import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  featureFlag: { findMany: vi.fn() },
};

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

describe('features service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('reads enabled flags from the database', async () => {
    prismaMock.featureFlag.findMany.mockResolvedValue([
      { key: 'scripts.shootingPlan', enabled: true, configJson: null },
      { key: 'scripts.upload', enabled: false, configJson: null },
    ]);

    const { isFeatureEnabled, clearFeatureFlagCacheForTests } =
      await import('../../src/config/features.js');
    clearFeatureFlagCacheForTests();

    await expect(isFeatureEnabled('scripts.shootingPlan')).resolves.toBe(true);
    await expect(isFeatureEnabled('scripts.upload')).resolves.toBe(false);
  });
});
