# Circuit — Deployment (Render)

Production runs on **[Render](https://render.com)**. Local dev uses Docker Postgres and `apps/api/.env.development`.

> **Config surfaces:** local mobile → `apps/mobile/.env`; local API → `apps/api/.env.development`; deployed API → Render dashboard. See [`../../docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md).

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

Script PDFs are stored on the service disk (`uploads/`). On Render, use a **persistent disk** mounted at `/app/uploads` if you need uploads to survive redeploys.

---

## Recommended environment matrix

Use this as the mental model across mobile, backend, database, and OTP:

| Environment | Mobile API URL | Backend | Database | OTP |
|-------------|----------------|---------|----------|-----|
| **Local** | `http://localhost:3009` | Mac backend (`npm run dev`) | Local Postgres or Supabase dev | `MOCK` |
| **Dev / Preview** | `https://circuit-api-dev.onrender.com` | Render Free | Supabase dev/prod *(shared OK while testing)* | `MOCK` |
| **Production** | Custom API domain *(later)* | Render paid or stable host | Supabase prod | MSG91 / Twilio |

**While testing:** dev and preview mobile builds can share the same Render backend and Supabase project.

**Before App Store / public users:** split databases so test and real users never mix:

- Supabase **dev** project → local, dev client, TestFlight preview
- Supabase **production** project → App Store / Play Store builds only

Mobile env mapping: see [`../mobile/README.md`](../mobile/README.md) (`.env` locally, EAS environments for cloud builds).

---

## Local development

**Only needed when running the API locally** — skip if mobile uses the Render backend.

From monorepo root:

```bash
npm run setup:env
# Edit apps/api/.env.development — JWT_SECRET (≥32 chars), OPENAI_API_KEY, DATABASE_URL
# Use local Postgres or Supabase dev — not production. Omit REDIS_URL unless Redis is running.
```

```bash
cd apps/api
docker compose up -d          # Postgres :5432, Redis :6379 (Redis optional)
npm run dev:db                # apply migrations
npm run dev                   # http://localhost:3009
curl http://localhost:3009/health
```

Or from repo root: `npm run api:dev`

**Dev OTP:** `OTP_PROVIDER=MOCK` → code is always **`111111`**.

See [`../../docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md) for Workflow A (mobile → Render) vs Workflow B (full local).

---

## Deploy to Render

### Option A — Blueprint (recommended)

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → connect repo.
3. Render reads `render.yaml` and creates:
   - **Web service** `circuit-api`
   - **Postgres** `circuit-db`
4. In the Render dashboard, set **sync: false** env vars:
   - `OPENAI_API_KEY` (required)
   - `REDIS_URL` (optional — add a Render Redis instance)
   - `CORS_ORIGINS` (optional)
5. Deploy. Migrations run during **build** (`prisma migrate deploy`), not at server start.

### Option B — Manual web service

| Setting | Value |
|---------|--------|
| **Root directory** | Repo root (monorepo — see `render.yaml`) |
| **Runtime** | Node 20 |
| **Build command** | `npm ci && npm run build:deploy -w circuit-backend` |
| **Start command** | `npm run start -w circuit-backend` |
| **Health check** | `/health` |

Create a **Render Postgres** database and link `DATABASE_URL` in the web service environment.

---

## Environment variables (production)

Set in Render → **Environment** (not in git). Example production set:

```bash
NODE_ENV=production
PORT=10000
LOG_LEVEL=info

DATABASE_URL=your_supabase_pooler_url

JWT_SECRET=your_long_secret
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

CORS_ORIGINS=
```

**Do not set `REDIS_URL`** unless you have a real Redis URL. The backend treats it as optional; if the variable exists but is blank or invalid, boot will fail.

**Optional MSG91 fields** (`MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID`): leave unset when using `OTP_PROVIDER=MOCK`. Blank dashboard fields are treated as unset.

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | From Render Postgres or Supabase pooler |
| `JWT_SECRET` | ≥ 32 chars (`render.yaml` can auto-generate) |
| `OPENAI_API_KEY` | Required at boot |
| `PORT` | Render sets this (usually `10000`) |
| `OTP_PROVIDER` | `MOCK` for testing; `MSG91` for real SMS |
| `EXPO_PUSH_PROVIDER` | `MOCK` or `EXPO` |
| `LOG_LEVEL` | `info` |
| `REDIS_URL` | Optional — omit unless using Render Redis / Upstash |
| `CORS_ORIGINS` | Empty OK for mobile-only |

---

## Mobile app

Point the Expo app at your Render URL:

```bash
EXPO_PUBLIC_API_BASE_URL=https://circuit-api.onrender.com
```

Set in EAS env or `app.config` for production builds.

---

## CI

GitHub Actions runs tests on push/PR (`.github/workflows/ci.yml`). Render deploys from its own Git integration — no AWS deploy workflows.

---

## Checklist before go-live

- [ ] `OPENAI_API_KEY` set on Render
- [ ] `JWT_SECRET` is unique (not the dev value)
- [ ] `OTP_PROVIDER=MSG91` + MSG91 keys (not MOCK)
- [ ] `DATABASE_URL` linked to Render Postgres
- [ ] Migrations applied (runs in Render **build** command, not `npm start`)
- [ ] Health check returns `{ "status": "ok" }`
- [ ] Mobile app uses HTTPS Render URL
