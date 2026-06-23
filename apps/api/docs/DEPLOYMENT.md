# Circuit — Deployment (Render)

Production runs on **[Render](https://render.com)**. Configure everything in the **Render dashboard** — there is no Blueprint or `render.yaml` in this repo.

> **Config surfaces:** local mobile → `apps/mobile/.env`; local API → `apps/api/.env.development`; deployed API → **Render → Environment**. See [`../../docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md).

---

## Architecture

```text
Mobile app  ──HTTPS──►  Render Web Service (circuit-api)
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              Render Postgres     Render Redis (optional)
              (DATABASE_URL)      (REDIS_URL)
```

Script PDFs are stored on the service disk (`uploads/`). Mount a **persistent disk** at `/app/uploads` if uploads must survive redeploys.

---

## Render web service (manual setup)

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Web Service** → connect the repo.
3. Set **Root directory** to the **monorepo root** (not `apps/api`).
4. Add environment variables in Render → **Environment** (never commit secrets).
5. Apply database migrations **outside** build/start (see [Migrations](#migrations)).

### Render commands

| Setting | Value |
|---------|--------|
| **Root directory** | Repository root |
| **Runtime** | Node 22 |
| **Pre-Deploy Command** | *(leave empty)* |
| **Build Command** | `npm ci --include=dev && npm run prisma:generate -w circuit-backend && npm run build -w circuit-backend` |
| **Start Command** | `npm start -w circuit-backend` |
| **Health check path** | `/health` |

**Important:** Do **not** run `prisma migrate deploy` in the Render build or start command unless you have explicitly chosen that operational workflow. The default documented here keeps migrations manual.

Link a **Render Postgres** database (or Supabase) and set `DATABASE_URL` on the web service.

---

## Migrations

Run when schema changes land — locally or in CI, not automatically on every Render deploy:

```bash
cd apps/api
npm run prisma:deploy
```

Local dev:

```bash
cd apps/api
docker compose up -d
npm run dev:db
```

---

## Environment variables (production)

Set in Render → **Environment**. Example production set:

```bash
NODE_ENV=production
APP_ENV=prod
PORT=10000
LOG_LEVEL=info

DATABASE_URL=your_supabase_pooler_url

JWT_SECRET=your_long_secret_min_32_chars
JWT_ISSUER=circuit-api
JWT_AUDIENCE=circuit-mobile
JWT_EXPIRES_IN=7d
OTP_SECRET=your_otp_hmac_secret_min_32_chars

SIGNUP_VERIFICATION_CHANNEL=EMAIL
LOGIN_IDENTIFIER=PHONE
EMAIL_OTP_PROVIDER=RESEND
PHONE_OTP_PROVIDER=MSG91
ALLOW_MOCK_OTP_IN_PROD=false

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Circuit <noreply@your-verified-domain.com>
RESEND_REPLY_TO=support@yourdomain.com

OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o
OPENAI_MODEL_FAST=gpt-4o-mini

EXPO_PUSH_PROVIDER=EXPO

CORS_ORIGINS=
```

| Variable | Notes |
|----------|--------|
| `APP_ENV` | `prod` in production |
| `EMAIL_OTP_PROVIDER` | `RESEND` for real email OTP |
| `PHONE_OTP_PROVIDER` | `MSG91` for real SMS |
| `OTP_SECRET` | HMAC key for OTP hashes (≥ 32 chars) |
| `REDIS_URL` | Optional — omit unless using Redis |
| `OTP_PROVIDER` | Legacy alias; prefer split providers above |

**Do not set `REDIS_URL`** to a blank value — omit the key entirely if unused.

Dev/preview can use `EMAIL_OTP_PROVIDER=MOCK` and `PHONE_OTP_PROVIDER=MOCK` (code `111111`).

---

## Local development

From monorepo root:

```bash
npm run setup:env:api      # creates apps/api/.env.development if missing
npm run setup:env:mobile   # creates apps/mobile/.env if missing
```

Edit `apps/api/.env.development` — `JWT_SECRET`, `OTP_SECRET`, `OPENAI_API_KEY`, `DATABASE_URL`.

```bash
cd apps/api
docker compose up -d
npm run dev:db
npm run dev                   # http://localhost:3009
```

Or from repo root: `npm run api:dev`

**Dev OTP:** `EMAIL_OTP_PROVIDER=MOCK` + `PHONE_OTP_PROVIDER=MOCK` → code **`111111`**.

See [`../../docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md) for Workflow A (mobile → Render) vs Workflow B (full local).

---

## Mobile app

Point Expo at your Render URL:

```bash
EXPO_PUBLIC_API_BASE_URL=https://circuit-api-dev.onrender.com
```

Set in `apps/mobile/.env` locally or EAS environment variables for cloud builds.

Mobile reads public runtime config from `GET /app/config` (signup channel, feature flags).

---

## CI

GitHub Actions runs tests on push/PR. Render deploys from its own Git integration.

---

## Checklist before go-live

- [ ] `OPENAI_API_KEY`, `JWT_SECRET`, `OTP_SECRET` set on Render
- [ ] `EMAIL_OTP_PROVIDER=RESEND` + `RESEND_API_KEY` + `RESEND_FROM_EMAIL`
- [ ] `PHONE_OTP_PROVIDER=MSG91` + MSG91 keys (if phone signup enabled)
- [ ] `APP_ENV=prod` and `ALLOW_MOCK_OTP_IN_PROD=false`
- [ ] `DATABASE_URL` linked
- [ ] Migrations applied via `npm run prisma:deploy` (not in Render start)
- [ ] Health check returns `{ "status": "ok" }`
- [ ] Mobile uses HTTPS Render URL
