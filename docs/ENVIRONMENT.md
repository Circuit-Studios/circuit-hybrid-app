# Environment configuration

Circuit uses **four separate config surfaces**. Do not mix them.

> **All documentation:** [docs/README.md](./README.md) — architecture, database, env, deploy.

| Surface | File / location | Used when |
|---------|-----------------|-----------|
| **Local mobile** | `apps/mobile/.env` | Expo Metro on your machine |
| **Local API** | `apps/api/.env.development` | `npm run api:dev` only |
| **Deployed API** | Render → Environment | Production / shared dev backend |
| **Cloud mobile builds** | EAS Environment Variables | `eas build` profiles |

Git tracks **`.env.example` only** — never commit real secrets.

---

## Quick setup

From the monorepo root:

```bash
npm run setup:env
```

This creates:

- `apps/api/.env.development` from `apps/api/.env.example` (if missing)
- `apps/mobile/.env` from `apps/mobile/.env.example` (if missing)

Then edit the files below for your workflow.

---

## Workflow A — Mobile against Render (default daily work)

Easiest setup. **No local API env required.**

**`apps/mobile/.env`**

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://circuithybridappservices.onrender.com
```

**Start mobile:**

```bash
npm run mobile
# alias: npm run dev:mobile
```

Do **not** copy Render dashboard secrets into local files.

---

## Workflow B — Full stack local (backend feature work)

Use when changing API routes, Prisma, or AI pipeline.

**1. Create `apps/api/.env.development`**

Use local Postgres (Docker) or a **Supabase dev** project — never production Supabase for experiments.

```bash
NODE_ENV=development
PORT=3009
LOG_LEVEL=debug

DATABASE_URL=postgresql://circuit:circuit@localhost:5432/circuit_dev?schema=public

JWT_SECRET=replace_with_local_long_secret_min_32_chars
JWT_ISSUER=circuit-api
JWT_AUDIENCE=circuit-mobile
JWT_EXPIRES_IN=7d

OTP_PROVIDER=MOCK

OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o
OPENAI_MODEL_FAST=gpt-4o-mini
OPENAI_MAX_RETRIES=3

LANGSMITH_TRACING=false

EXPO_PUSH_PROVIDER=MOCK

CORS_ORIGINS=http://localhost:8081,http://localhost:19006

# Optional — omit entirely unless Redis is running (conflict scans run inline without it).
# REDIS_URL=redis://localhost:6379
```

**Notes:**

- `APP_ENV` is **mobile-only** (`EXPO_PUBLIC_APP_ENV`). The API uses `NODE_ENV`.
- Omit `REDIS_URL` completely if you are not using Redis. Blank values are treated as unset, but omitting is clearer.
- Dev OTP code is always **`111111`** when `OTP_PROVIDER=MOCK`.

**2. Point mobile at localhost**

**`apps/mobile/.env`**

```bash
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_BASE_URL=http://localhost:3009
```

On a physical device, use your laptop's LAN IP instead of `localhost`.

**3. Start backend, then mobile**

```bash
cd apps/api && docker compose up -d && npm run dev:db
npm run api:dev          # from repo root

npm run mobile           # second terminal
```

---

## Workflow C — Production

| Layer | Config |
|-------|--------|
| Mobile | EAS env: `EXPO_PUBLIC_APP_ENV=production`, production API URL |
| API | Render dashboard: unique `JWT_SECRET`, `OTP_PROVIDER=MSG91`, real `DATABASE_URL` |
| Database | Supabase **production** project (separate from dev/test) |

See [`apps/api/docs/DEPLOYMENT.md`](../apps/api/docs/DEPLOYMENT.md) for Render deploy.

---

## Environment matrix

| Mode | Mobile API URL | Backend | Database | OTP |
|------|----------------|---------|----------|-----|
| **Local full stack** | `http://localhost:3009` | `npm run api:dev` | Docker Postgres / Supabase dev | `MOCK` |
| **Mobile → Render** | Render URL | Render (remote) | Render / Supabase (remote) | `MOCK` |
| **Production** | Custom domain | Render paid | Supabase prod | MSG91 / Twilio |

---

## `.gitignore` rules

These paths are never committed:

```text
apps/mobile/.env
apps/api/.env.development
apps/api/.env.production
```

Examples **are** committed: `apps/mobile/.env.example`, `apps/api/.env.example`.
