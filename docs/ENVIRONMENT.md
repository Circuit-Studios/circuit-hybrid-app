# Environment

Config surfaces — do not mix them.

| Surface      | Location                    | When                    |
| ------------ | --------------------------- | ----------------------- |
| Local mobile | `apps/mobile/.env`          | Expo on your machine    |
| Local API    | `apps/api/.env.development` | `npm run api:dev`       |
| Deployed API | Render → Environment        | Production / shared dev |
| Cloud builds | EAS Environment Variables   | `eas build`             |

Git tracks `.env.example` only — never commit secrets.

```bash
npm run setup:env # creates both env files from examples
```

---

## Workflow A — Mobile → Render (default)

**`apps/mobile/.env`**

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://circuit-api-dev.onrender.com
```

```bash
npm run mobile
```

No local API env needed.

---

## Workflow B — Full local stack

**`apps/api/.env.development`** — copy from `apps/api/.env.example`, then edit:

```bash
NODE_ENV=development
APP_ENV=local
PORT=3009
DATABASE_URL=postgresql://circuit:circuit@localhost:5432/circuit_dev?schema=public
JWT_SECRET=replace_with_local_long_secret_min_32_chars
OTP_SECRET=replace_with_local_otp_secret_min_32_chars
SIGNUP_VERIFICATION_CHANNEL=EMAIL
LOGIN_IDENTIFIER=EMAIL
EMAIL_OTP_PROVIDER=MOCK
PHONE_OTP_PROVIDER=MOCK
LLM_PROVIDER=NVIDIA
NVIDIA_API_KEY=nvapi_xxxxx
NVIDIA_MODEL_EXTRACTOR=nvidia/nemotron-3-nano-30b-a3b
NVIDIA_MODEL_PLANNER=nvidia/nemotron-3-super-120b-a12b
NVIDIA_MODEL_FAST=nvidia/nemotron-3-nano-30b-a3b
CORS_ORIGINS=http://localhost:8081,http://localhost:19006
```

**`apps/mobile/.env`**

```bash
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_BASE_URL=http://localhost:3009
```

```bash
cd apps/api && docker compose up -d && npm run db:prepare:dev
npm run api:dev # terminal 1
npm run mobile  # terminal 2
```

Dev OTP: **`111111`** when OTP providers are `MOCK`.

Omit `REDIS_URL` unless Redis is running (conflict scans run inline without it).

---

## Render (deployed API)

| Variable                                    | Notes                        |
| ------------------------------------------- | ---------------------------- |
| `NODE_ENV`                                  | `production`                 |
| `APP_ENV`                                   | `dev` or `prod`              |
| `DATABASE_URL`                              | Supabase pooler URL          |
| `JWT_SECRET` / `OTP_SECRET`                 | ≥ 32 chars each              |
| `EMAIL_OTP_PROVIDER`                        | `RESEND` in prod             |
| `RESEND_API_KEY` / `RESEND_OTP_TEMPLATE_ID` | Required when Resend enabled |
| `PHONE_OTP_PROVIDER`                        | `MSG91` or `MOCK`            |
| `ALLOW_MOCK_OTP_IN_PROD`                    | `false`                      |
| `ALLOW_DIRECT_REGISTER`                     | `false` (required in prod)   |

Build/start commands: [apps/api/docs/DEPLOYMENT.md](../apps/api/docs/DEPLOYMENT.md)

---

## LLM providers (required)

API-only — never in mobile `.env`. Two providers ship: **NVIDIA** (default) and **Gemini**.

**One switch controls everything:**

| `LLM_PROVIDER` | What runs |
| --- | --- |
| `NVIDIA` | All stages use `NVIDIA_MODEL_*` |
| `GEMINI` | All stages use `GEMINI_MODEL_*` |

| Variable | Notes |
| --- | --- |
| `LLM_PROVIDER` | `NVIDIA` or `GEMINI` |
| `LLM_REQUEST_TIMEOUT_MS` | `180000` for long scripts on Render |

Only the selected provider's keys/models must be set (validated at boot).

**NVIDIA** (`nvapi-...` from [build.nvidia.com](https://build.nvidia.com)):

| Variable | MVP value |
| --- | --- |
| `NVIDIA_API_KEY` | `nvapi-...` |
| `NVIDIA_MODEL_EXTRACTOR` | `nvidia/nemotron-3-nano-30b-a3b` |
| `NVIDIA_MODEL_PLANNER` | `nvidia/nemotron-3-super-120b-a12b` |
| `NVIDIA_MODEL_FAST` | `nvidia/nemotron-3-nano-30b-a3b` |

**Gemini** (`AIza...` from [aistudio.google.com](https://aistudio.google.com)):

| Variable | Example |
| --- | --- |
| `GEMINI_API_KEY` | `AIza...` |
| `GEMINI_MODEL_EXTRACTOR` | `gemini-2.5-flash` |
| `GEMINI_MODEL_PLANNER` | `gemini-2.5-pro` |
| `GEMINI_MODEL_FAST` | `gemini-2.5-flash` |

Optional: `LLM_MAX_SCRIPT_CHARS` (default `250000`), `LLM_MAX_CHUNK_CHARS` (default `18000`).

**Advanced — mix providers per stage** (rarely needed): set `LLM_PROVIDER_EXTRACTOR`,
`LLM_PROVIDER_PLANNER`, or `LLM_PROVIDER_FAST` to override that stage only. Both providers'
keys must be configured. Example: `LLM_PROVIDER=NVIDIA` + `LLM_PROVIDER_EXTRACTOR=GEMINI`
extracts scenes with Gemini, plans with NVIDIA.

`scripts.shootingPlan` and `scripts.taskSuggestions` feature flags must be enabled to run the pipeline.

---

## Mobile (EAS)

```bash
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_BASE_URL=https://your-api.onrender.com
```

Set in EAS dashboard — not in `eas.json`. Never put secrets in `EXPO_PUBLIC_*`.

Runtime config (no secrets): `GET /app/config`

---

## Feature flags

Toggle in DB without mobile rebuild:

```sql
UPDATE feature_flags SET enabled = false WHERE key = 'scripts.upload';
```

Keys: `scripts.upload`, `scripts.shootingPlan`, `scripts.taskSuggestions`, `team.invites`, `auth.emailOtp`, `auth.phoneOtp`, `notifications.push`
