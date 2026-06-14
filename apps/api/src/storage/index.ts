import { logger } from '../lib/logger.js';
import { LocalStorageProvider } from './local.provider.js';
import type { StorageProvider } from './types.js';

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!provider) {
    provider = new LocalStorageProvider();
    logger.info('Using local-disk storage provider');
  }
  return provider;
}

export type { StorageProvider } from './types.js';
