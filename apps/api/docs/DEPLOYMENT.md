# Circuit — Deployment (Render)

Production runs on **[Render](https://render.com)**. Configure everything in the **Render dashboard**.

> **Config surfaces:** local mobile → `apps/mobile/.env`; local API → `apps/api/.env.development`; deployed API → **Render → Environment**. See [`../../docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md).

---

## Architecture

```text
Mobile app  ──HTTPS──►  Render Web Service (circuit-api)
                              │
                              ▼
                    Supabase Postgres (pooler)
                    DATABASE_URL on Render
```

Script PDFs are stored on the service disk (`uploads/`). Mount a **persistent disk** at `/app/uploads` if uploads must survive redeploys.

**Database:** use a **Supabase** project (recommended) and set `DATABASE_URL` to the **connection pooler** URL (Session or Transaction mode per your Prisma setup). Render Postgres is optional but not the default documented path.

**Redis:** omit `REDIS_URL` entirely unless you operate a real Redis instance. Do not set a blank or placeholder value — the API treats invalid URLs as fatal at boot.

---

## Render web service (manual setup — recommended)

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Web Service** → connect the repo.
3. Set **Root directory** to the **monorepo root** (not `apps/api`).
4. Add environment variables in Render → **Environment** (never commit secrets).
5. Apply database migrations **outside** build/start (see [Migrations](#migrations)).

### Render commands

| Setting                | Value                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **Root directory**     | Repository root                                                                                          |
| **Runtime**            | Node 22                                                                                                  |
| **Pre-Deploy Command** | _(leave empty — not available on Render Free)_                                                           |
| **Build Command**      | `npm ci --include=dev && npm run prisma:generate -w circuit-backend && npm run build -w circuit-backend` |
| **Start Command**      | `npm start -w circuit-backend`                                                                           |
| **Health check path**  | `/health`                                                                                                |

**Important:**

- Do **not** run `prisma migrate deploy` in the Render build or start command. Migrations are manual/controlled (see below).
- **Render Free** does not support a Pre-Deploy Command — leave it empty and run migrations from your machine or CI when schema changes land.
- `prisma generate` in the build command is required so the compiled API has a Prisma client; it does **not** apply schema changes.

### Supabase `DATABASE_URL`

In Supabase → **Project Settings** → **Database** → **Connection string**, copy the **pooler** URI (not the direct DB host if you're serverless/constrained). Example shape:

```text
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

Paste into Render → **Environment** as `DATABASE_URL`. Never commit this value.

---

## Migrations

Run when schema changes land — locally, in CI, or from an operator workstation — **not** on every Render deploy:

```bash
cd apps/api
npm run prisma:deploy
```

Local dev (Docker Postgres or Supabase dev):

```bash
cd apps/api
docker compose up -d
npm run db:prepare:dev
npm run dev
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
LOGIN_IDENTIFIER=EMAIL
EMAIL_OTP_PROVIDER=RESEND
PHONE_OTP_PROVIDER=MSG91
ALLOW_MOCK_OTP_IN_PROD=false

RESEND_API_KEY=re_...
RESEND_OTP_TEMPLATE_ID=circuit-email-otp
RESEND_OTP_EXPIRES_MINUTES=5

LLM_PROVIDER=NVIDIA
NVIDIA_API_KEY=nvapi_xxxxx
NVIDIA_MODEL_EXTRACTOR=nvidia/nemotron-3-nano-30b-a3b
NVIDIA_MODEL_PLANNER=nvidia/nemotron-3-super-120b-a12b
NVIDIA_MODEL_FAST=nvidia/nemotron-3-nano-30b-a3b
LLM_REQUEST_TIMEOUT_MS=180000

EXPO_PUSH_PROVIDER=EXPO

CORS_ORIGINS=
```

| Variable                     | Notes                                                          |
| ---------------------------- | -------------------------------------------------------------- |
| `NODE_ENV`                   | `production` on Render (set by `npm start`)                    |
| `APP_ENV`                    | `dev` (shared dev API) or `prod` (production)                  |
| `DATABASE_URL`               | Supabase pooler URL (recommended)                              |
| `EMAIL_OTP_PROVIDER`         | `RESEND` for real email OTP (hosted template)                  |
| `RESEND_API_KEY`             | Resend API key (Render Environment only)                       |
| `RESEND_OTP_TEMPLATE_ID`     | Published template id/alias in Resend dashboard                |
| `RESEND_OTP_EXPIRES_MINUTES` | Passed to template as `EXPIRES_MINUTES` variable (default `5`) |
| `PHONE_OTP_PROVIDER`         | `MSG91` for real SMS                                           |
| `OTP_SECRET`                 | HMAC key for OTP hashes (≥ 32 chars)                           |
| `LLM_PROVIDER`               | Must be `NVIDIA`                                               |
| `NVIDIA_API_KEY`             | From [build.nvidia.com](https://build.nvidia.com)              |
| `NVIDIA_MODEL_PLANNER`       | Required — MVP: `nvidia/nemotron-3-super-120b-a12b`            |
| `NVIDIA_MODEL_EXTRACTOR`     | MVP: `nvidia/nemotron-3-nano-30b-a3b`                          |
| `NVIDIA_MODEL_FAST`          | MVP: `nvidia/nemotron-3-nano-30b-a3b`                           |
| `LLM_REQUEST_TIMEOUT_MS`     | `180000` recommended for 175-page scripts on Render            |
| `REDIS_URL`                  | **Omit** unless using Redis — never set empty                  |
| `OTP_PROVIDER`               | Legacy alias; prefer split providers above                     |

Dev/preview can use `EMAIL_OTP_PROVIDER=MOCK` and `PHONE_OTP_PROVIDER=MOCK` (code `111111`).

---

## Resend email OTP template

Signup and login use **`POST /auth/request-otp`** and **`POST /auth/verify-otp`**.

Post-account email verification uses **`POST /email/request-otp`** and **`POST /email/verify-otp`**.

When `EMAIL_OTP_PROVIDER=RESEND`:

1. Create a **hosted template** in the [Resend dashboard](https://resend.com/templates).
2. Set **From** and **Subject** on the template (not in API env vars).
3. Add template variables used by the backend:
   - `CODE` — 6-digit OTP
   - `EXPIRES_MINUTES` — string minutes until expiry
   - `APP_NAME` — e.g. `Circuit`
4. Publish the template and set on Render:
   - `RESEND_API_KEY` — API key (Environment only)
   - `RESEND_OTP_TEMPLATE_ID` — template id or alias (e.g. `circuit-email-otp`)

The backend sends only `to`, `template.id`, and `template.variables` — no `from` or `subject` in code.

---

## Local development

From monorepo root:

```bash
npm run setup:env # api + mobile env files if missing
# or individually:
npm run setup:env:api
npm run setup:env:mobile
```

Edit `apps/api/.env.development` — `JWT_SECRET`, `OTP_SECRET`, `NVIDIA_API_KEY`, `DATABASE_URL`.

```bash
cd apps/api
docker compose up -d
npm run db:prepare:dev
npm run dev
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

GitHub Actions runs `npm ci` from the repo root, then workspace scripts (`mobile:*`, `api:*`, `format:check`). Render deploys from its own Git integration.

---

## Checklist before go-live

- [ ] `NVIDIA_API_KEY`, `NVIDIA_MODEL_PLANNER`, `JWT_SECRET`, `OTP_SECRET` set on Render
- [ ] Remove legacy `OPENAI_*` env vars if present
- [ ] `DATABASE_URL` = Supabase pooler (or chosen Postgres)
- [ ] `EMAIL_OTP_PROVIDER=RESEND` + `RESEND_API_KEY` + `RESEND_OTP_TEMPLATE_ID`
- [ ] `PHONE_OTP_PROVIDER=MSG91` + MSG91 keys (if phone signup enabled)
- [ ] `APP_ENV=prod` and `ALLOW_MOCK_OTP_IN_PROD=false`
- [ ] Migrations applied via `npm run prisma:deploy` (not in Render build/start)
- [ ] `REDIS_URL` omitted unless Redis is in use
- [ ] Health check returns `{ "status": "ok" }`
- [ ] Mobile uses HTTPS Render URL
