#!/usr/bin/env node
/** Local prod smoke test only — runs migrate then start. Render uses `npm start`. */

import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npx', ['prisma', 'migrate', 'deploy']);
run('node', ['dist/server/index.js']);
