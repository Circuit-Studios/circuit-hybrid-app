import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const nodeEnv = process.env.NODE_ENV ?? 'development';

/** Load `.env.development` when NODE_ENV=development (local dev). Production uses Render env vars. */
export function loadEnvFiles(): void {
  const path = resolve(ROOT, `.env.${nodeEnv}`);
  if (!existsSync(path)) {
    if (nodeEnv !== 'test') {
      console.warn(`[env] Missing ${path} — run: npm run setup:env`);
    }
    return;
  }
  config({ path });
}

loadEnvFiles();
