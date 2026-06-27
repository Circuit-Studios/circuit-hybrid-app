# Environment configuration

Circuit uses **four separate config surfaces**. Do not mix them.

> **All documentation:** [docs/README.md](./README.md) — architecture, database, env, deploy.

| Surface                 | File / location             | Used when                       |
| ----------------------- | --------------------------- | ------------------------------- |
| **Local mobile**        | `apps/mobile/.env`          | Expo Metro on your machine      |
| **Local API**           | `apps/api/.env.development` | `npm run api:dev` only          |
| **Deployed API**        | Render → Environment        | Production / shared dev backend |
| **Cloud mobile builds** | EAS Environment Variables   | `eas build` profiles            |

Git tracks **`.env.example` only** — never commit real secrets.

---

## Quick setup

From the monorepo root:

```bash
npm run setup:env
# or individually:
npm run setup:env:api
npm run setup:env:mobile
```

This creates (or skips with a message if already present):

- `apps/api/.env.development` from `apps/api/.env.example`
- `apps/mobile/.env` from `apps/mobile/.env.example`

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
# Sign up: OTP via SIGNUP_VERIFICATION_CHANNEL (EMAIL or PHONE)
# Sign in (mobile): email + password via POST /auth/login — not OTP
SIGNUP_VERIFICATION_CHANNEL=EMAIL
LOGIN_IDENTIFIER=EMAIL
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
- **Sign in (mobile)** uses **email + password** (`POST /auth/login`). `LOGIN_IDENTIFIER` only affects legacy OTP login (`purpose=login` on `/auth/request-otp`), not the mobile Sign In tab.
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
npm run api:dev # from repo root

npm run mobile # second terminal
```

---

## Deployed API (Render)

Set in Render → **Environment** (never commit):

| Variable   | Render value    | Purpose                                                                         |
| ---------- | --------------- | ------------------------------------------------------------------------------- |
| `NODE_ENV` | `production`    | Node/Express production mode (Render always uses this at runtime)               |
| `APP_ENV`  | `dev` or `prod` | Circuit environment — controls mock OTP guards, logging tone, `GET /app/config` |

- **`APP_ENV=dev`** — shared dev/preview API (can use `MOCK` OTP providers).
- **`APP_ENV=prod`** — production API (`EMAIL_OTP_PROVIDER=RESEND`, `PHONE_OTP_PROVIDER=MSG91`, etc.).

`NODE_ENV` and `APP_ENV` are independent: local API uses `NODE_ENV=development` + `APP_ENV=local`; Render uses `NODE_ENV=production` + `APP_ENV=dev|prod`.

---

## Workflow C — Production

| Layer    | Config                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------- |
| Mobile   | EAS env: `EXPO_PUBLIC_APP_ENV=production`, production API URL                                      |
| API      | Render dashboard: unique `JWT_SECRET`, `OTP_PROVIDER=MSG91` or `RESEND_EMAIL`, real `DATABASE_URL` |
| Database | Supabase **production** project (separate from dev/test)                                           |

See [`apps/api/docs/DEPLOYMENT.md`](../apps/api/docs/DEPLOYMENT.md) for Render deploy.

---

## Environment matrix

| Mode                 | Mobile API URL          | Backend           | Database                       | OTP                                                     |
| -------------------- | ----------------------- | ----------------- | ------------------------------ | ------------------------------------------------------- |
| **Local full stack** | `http://localhost:3009` | `npm run api:dev` | Docker Postgres / Supabase dev | `EMAIL_OTP_PROVIDER=MOCK`, `PHONE_OTP_PROVIDER=MOCK`    |
| **Mobile → Render**  | Render URL              | Render (remote)   | Supabase (dev project)         | Render env (see dev example below)                      |
| **Production**       | Custom domain           | Render paid       | Supabase prod                  | `EMAIL_OTP_PROVIDER=RESEND`, `PHONE_OTP_PROVIDER=MSG91` |

---

## Resend email OTP

Use when `EMAIL_OTP_PROVIDER=RESEND`. The **From address and Subject** live in your **Resend dashboard template** — the API only needs the template id/alias and variables (`CODE`, `EXPIRES_MINUTES`, `APP_NAME`).

**Render dashboard** (deployed API — do not commit secrets):

| Variable                     | Required | Notes                                                     |
| ---------------------------- | -------- | --------------------------------------------------------- |
| `EMAIL_OTP_PROVIDER`         | Yes      | Set to `RESEND`                                           |
| `RESEND_API_KEY`             | Yes      | From [resend.com](https://resend.com) → API Keys          |
| `RESEND_OTP_TEMPLATE_ID`     | Yes      | Published template id or alias (e.g. `circuit-email-otp`) |
| `RESEND_OTP_EXPIRES_MINUTES` | No       | Default `5` — passed to template as `EXPIRES_MINUTES`     |
| `OTP_SECRET`                 | Yes      | Min 32 chars — HMAC key for OTP hashes                    |

**Local default:** `EMAIL_OTP_PROVIDER=MOCK` (code `111111`).

**Real local Resend testing (opt-in):**

```bash
EMAIL_OTP_PROVIDER=RESEND
RESEND_API_KEY=re_xxxxx
RESEND_OTP_TEMPLATE_ID=circuit-email-otp
```

**Render dev example** (shared dev API — set `NODE_ENV=production` on Render, `APP_ENV=dev`):

```bash
NODE_ENV=production
APP_ENV=dev
SIGNUP_VERIFICATION_CHANNEL=EMAIL
LOGIN_IDENTIFIER=EMAIL
EMAIL_OTP_PROVIDER=RESEND
RESEND_API_KEY=re_...
RESEND_OTP_TEMPLATE_ID=circuit-email-otp
PHONE_OTP_PROVIDER=MOCK
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

| Key                    | Default | Routes affected              |
| ---------------------- | ------- | ---------------------------- |
| `scripts.upload`       | on      | `POST /projects/:id/scripts` |
| `scripts.shootingPlan` | on      | `POST /scripts/:id/analyze`  |
| `team.invites`         | on      | `POST /projects/:id/members` |
| `auth.emailOtp`        | on      | Email OTP send/verify        |
| `auth.phoneOtp`        | on      | Phone OTP send/verify        |
| `notifications.push`   | on      | Mobile push registration     |

Example — disable script upload in dev:

```sql
UPDATE feature_flags SET enabled = false WHERE key = 'scripts.upload';
```

Flags are cached server-side for 30 seconds.

---

## LLM provider (OpenAI / NVIDIA NIM)

LLM configuration is **API-only**. Never put `NVIDIA_API_KEY`, model IDs, or `LLM_PROVIDER` in mobile `.env` or `/app/config`.

| Variable                  | Purpose                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `LLM_PROVIDER`            | `OPENAI` (default) or `NVIDIA`                                                               |
| `NVIDIA_API_KEY`          | Required when `LLM_PROVIDER=NVIDIA` — set in Render dashboard or `apps/api/.env.development` |
| `NVIDIA_BASE_URL`         | Default `https://integrate.api.nvidia.com/v1`                                                |
| `NVIDIA_MODEL_EXTRACTOR`  | Scene extraction (defaults to planner if unset)                                              |
| `NVIDIA_MODEL_PLANNER`    | Shooting plan + task suggestions (**required** for NVIDIA)                                   |
| `NVIDIA_MODEL_FAST`       | Fast/helper calls (defaults to extractor)                                                    |
| `NVIDIA_MODEL_FALLBACK`   | Optional repair/fallback model                                                               |
| `LLM_MAX_SCRIPT_CHARS`    | Script text cap before analysis                                                              |
| `LLM_MAX_CHUNK_CHARS`     | Scene batch size for extractor calls                                                         |
| `LLM_*_TEMPERATURE`       | Per-role temperature defaults                                                                |
| `LLM_JSON_REPAIR_RETRIES` | JSON repair attempts after invalid model output (default `1`)                                |
| `LLM_REQUEST_TIMEOUT_MS`  | Per-request timeout (default `120000`)                                                       |

**Recommended NVIDIA models** (configure via env — not hardcoded):

- Extractor: `nvidia/nemotron-3-super-120b-a12b`
- Planner: `nvidia/nemotron-3-ultra-550b-a55b`
- Fast: `nvidia/nemotron-3-nano-30b-a3b`
- Fallback: `nvidia/llama-3.1-nemotron-ultra-253b-v1`

**Script planning pipeline** (after PDF upload + `POST /scripts/:id/analyze`):

1. Extract PDF text
2. Split into scenes
3. Extract scene facts (characters, locations, risks)
4. Generate **task suggestions** (`TaskSuggestion` rows, status `PENDING`)
5. Generate **shooting plan** (`ShootingPlan` JSON, status `DRAFT`)

AI output is **reviewable** — final `Task` rows are created only when a director approves a suggestion. No automatic `ShootDay` schedule is created from AI output.

**Usage tracking:** every LLM call writes an `LlmRun` row (provider, model, stage, tokens, duration, status). Raw script text and prompts are never stored.

**Feature flag:** `llm.nvidia` must be enabled when using `LLM_PROVIDER=NVIDIA`.

---

## `.gitignore` rules

These paths are never committed:

```text
apps/mobile/.env
apps/api/.env.development
apps/api/.env.production
```

Examples **are** committed: `apps/mobile/.env.example`, `apps/api/.env.example`.
