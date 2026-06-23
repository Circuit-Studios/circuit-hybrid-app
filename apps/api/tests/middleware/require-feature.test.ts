import { describe, expect, it, vi } from 'vitest';
import { forbidden } from '../../src/lib/http.js';

const isFeatureEnabled = vi.fn().mockResolvedValue(false);

vi.mock('../../src/config/features.js', () => ({
  isFeatureEnabled,
}));

describe('requireFeature middleware', () => {
  it('rejects when feature is disabled', async () => {
    const { requireFeature } = await import('../../src/middleware/require-feature.js');
    const middleware = requireFeature('scripts.upload');

    const next = vi.fn();
    await middleware({} as never, {} as never, next);

    expect(next).toHaveBeenCalledWith(forbidden('This feature is currently disabled'));
  });
});
