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
npm run setup:env:api
npm run setup:env:mobile
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
EXPO_PUBLIC_API_BASE_URL=https://circuit-api-dev.onrender.com
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
APP_ENV=local
PORT=3009
LOG_LEVEL=debug

DATABASE_URL=postgresql://circuit:circuit@localhost:5432/circuit_dev?schema=public

JWT_SECRET=replace_with_local_long_secret_min_32_chars
JWT_ISSUER=circuit-api
JWT_AUDIENCE=circuit-mobile
JWT_EXPIRES_IN=7d

# Verification — mobile reads GET /app/config (no rebuild needed to switch)
SIGNUP_VERIFICATION_CHANNEL=EMAIL
LOGIN_IDENTIFIER=PHONE
EMAIL_OTP_PROVIDER=MOCK
PHONE_OTP_PROVIDER=MOCK
OTP_SECRET=replace_with_local_otp_secret_min_32_chars

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

- `APP_ENV` on the API (`local` | `dev` | `prod`) is separate from mobile `EXPO_PUBLIC_APP_ENV`. The API exposes `appEnv` via `GET /app/config`.
- Omit `REDIS_URL` completely if you are not using Redis. Blank values are treated as unset, but omitting is clearer.
- Dev OTP code is **`111111`** when `EMAIL_OTP_PROVIDER=MOCK` or `PHONE_OTP_PROVIDER=MOCK` (and `APP_ENV` is not `prod`, unless `ALLOW_MOCK_OTP_IN_PROD=true`).
- Toggle signup channel with `SIGNUP_VERIFICATION_CHANNEL=EMAIL|PHONE` — backend enforces; mobile follows `/app/config`.
- Runtime module toggles use the `feature_flags` table (see below) — no mobile rebuild required.

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
| API | Render dashboard: unique `JWT_SECRET`, `OTP_PROVIDER=MSG91` or `RESEND_EMAIL`, real `DATABASE_URL` |
| Database | Supabase **production** project (separate from dev/test) |

See [`apps/api/docs/DEPLOYMENT.md`](../apps/api/docs/DEPLOYMENT.md) for Render deploy.

---

## Environment matrix

| Mode | Mobile API URL | Backend | Database | OTP |
|------|----------------|---------|----------|-----|
| **Local full stack** | `http://localhost:3009` | `npm run api:dev` | Docker Postgres / Supabase dev | `EMAIL_OTP_PROVIDER=MOCK`, `PHONE_OTP_PROVIDER=MOCK` |
| **Mobile → Render** | Render URL | Render (remote) | Render / Supabase (remote) | Render env (see dev example below) |
| **Production** | Custom domain | Render paid | Supabase prod | `EMAIL_OTP_PROVIDER=RESEND`, `PHONE_OTP_PROVIDER=MSG91` |

---

## Resend email OTP

Use when `EMAIL_OTP_PROVIDER=RESEND` (or legacy `OTP_PROVIDER=RESEND_EMAIL`).

**Render dashboard** (production source of truth — do not commit secrets):

| Variable | Required | Notes |
|----------|----------|-------|
| `APP_ENV` | Yes | `prod` for production |
| `EMAIL_OTP_PROVIDER` | Yes | Set to `RESEND` |
| `RESEND_API_KEY` | Yes | From [resend.com](https://resend.com) → API Keys |
| `OTP_FROM_EMAIL` or `RESEND_FROM_EMAIL` | Yes | Verified domain, e.g. `Circuit <noreply@yourdomain.com>` |
| `RESEND_REPLY_TO` | No | Optional reply-to address |
| `OTP_SECRET` | Yes | Min 32 chars — HMAC key for OTP hashes (never store plain OTP) |

**Render dev example** (shared dev API):

```bash
APP_ENV=dev
SIGNUP_VERIFICATION_CHANNEL=EMAIL
LOGIN_IDENTIFIER=BOTH
EMAIL_OTP_PROVIDER=RESEND
PHONE_OTP_PROVIDER=MOCK
RESEND_API_KEY=re_...
OTP_FROM_EMAIL=Circuit <no-reply@your-verified-domain.com>
```

**Production guard:** if `APP_ENV=prod` and any active OTP provider is `MOCK`, the API refuses to start unless `ALLOW_MOCK_OTP_IN_PROD=true`.

**Important:** Resend delivers **email only**. Phone/SMS uses `PHONE_OTP_PROVIDER` (`MSG91` / `TWILIO` / `MOCK`).

**Local testing:** `EMAIL_OTP_PROVIDER=MOCK` and `PHONE_OTP_PROVIDER=MOCK` — code is `111111`.

**Public runtime config (no secrets):**

```bash
GET /app/config
```

Returns `appEnv`, `signupVerificationChannel`, `loginIdentifier`, and `features` map.

---

## Feature flags (`feature_flags` table)

Toggle modules without a mobile rebuild. Backend enforces via `requireFeature()`; mobile hides UI from `GET /app/config`.

| Key | Default | Routes affected |
|-----|---------|-----------------|
| `scripts.upload` | on | `POST /projects/:id/scripts` |
| `scripts.aiAnalysis` | on | `POST /scripts/:id/analyze` |
| `team.invites` | on | `POST /projects/:id/members` |
| `auth.emailOtp` | on | Email OTP send/verify |
| `auth.phoneOtp` | on | Phone OTP send/verify |
| `notifications.push` | on | Mobile push registration |

Example — disable script upload in dev:

```sql
UPDATE feature_flags SET enabled = false WHERE key = 'scripts.upload';
```

Flags are cached server-side for 30 seconds.

---

## `.gitignore` rules

These paths are never committed:

```text
apps/mobile/.env
apps/api/.env.development
apps/api/.env.production
```

Examples **are** committed: `apps/mobile/.env.example`, `apps/api/.env.example`.
