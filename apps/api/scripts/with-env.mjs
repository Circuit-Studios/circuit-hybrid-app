#!/usr/bin/env node
/**
 * Run a command with env vars from `.env.${NODE_ENV}`.
 *
 *   NODE_ENV=development node scripts/with-env.mjs npx prisma migrate deploy
 */

import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const envFile = resolve(`.env.${nodeEnv}`);

if (!existsSync(envFile)) {
  console.error(`Missing ${envFile}. Run: npm run setup:env:api`);
  process.exit(1);
}

config({ path: envFile });
process.env.NODE_ENV = nodeEnv;

const cmd = process.argv.slice(2);
if (cmd.length === 0) {
  console.error('Usage: NODE_ENV=development node scripts/with-env.mjs <command> [args...]');
  process.exit(1);
}

const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
