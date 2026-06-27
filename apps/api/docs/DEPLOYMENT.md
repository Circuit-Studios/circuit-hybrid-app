# Deploy (Render)

Production runs on [Render](https://render.com). Secrets go in Render → **Environment** only.

## Setup

1. Push repo to GitHub.
2. Render → **New** → **Web Service** → connect repo.
3. **Root directory:** monorepo root (not `apps/api`).

| Setting      | Value                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Runtime      | Node 22                                                                                                  |
| Build        | `npm ci --include=dev && npm run prisma:generate -w circuit-backend && npm run build -w circuit-backend` |
| Start        | `npm start -w circuit-backend`                                                                           |
| Health check | `/health`                                                                                                |
| Pre-Deploy   | leave empty                                                                                              |

Do **not** run `prisma migrate deploy` in build/start. Run migrations manually when schema changes:

```bash
cd apps/api && npm run prisma:deploy
```

## Database

Use **Supabase** pooler URL as `DATABASE_URL`:

```text
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Environment (production example)

```bash
NODE_ENV=production
APP_ENV=prod
LOG_LEVEL=info
DATABASE_URL=your_supabase_pooler_url
JWT_SECRET=your_long_secret_min_32_chars
OTP_SECRET=your_otp_secret_min_32_chars
SIGNUP_VERIFICATION_CHANNEL=EMAIL
LOGIN_IDENTIFIER=EMAIL
EMAIL_OTP_PROVIDER=RESEND
PHONE_OTP_PROVIDER=MSG91
ALLOW_MOCK_OTP_IN_PROD=false
ALLOW_DIRECT_REGISTER=false
RESEND_API_KEY=re_...
RESEND_OTP_TEMPLATE_ID=circuit-email-otp
LLM_PROVIDER=NVIDIA
NVIDIA_API_KEY=nvapi_xxxxx
NVIDIA_MODEL_EXTRACTOR=nvidia/nemotron-3-nano-30b-a3b
NVIDIA_MODEL_PLANNER=nvidia/nemotron-3-super-120b-a12b
NVIDIA_MODEL_FAST=nvidia/nemotron-3-nano-30b-a3b
LLM_REQUEST_TIMEOUT_MS=180000
EXPO_PUSH_PROVIDER=EXPO
CORS_ORIGINS=
```

Full variable reference: [../../docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md)

## Uploads

Script PDFs store on disk (`uploads/`). Mount a **persistent disk** at `/app/uploads` if uploads must survive redeploys.

## Redis

Omit `REDIS_URL` unless you operate Redis. Never set an empty value.

## Checklist

- [ ] `NVIDIA_API_KEY`, `NVIDIA_MODEL_PLANNER`, `JWT_SECRET`, `OTP_SECRET` on Render
- [ ] Remove legacy `OPENAI_*` env vars
- [ ] `DATABASE_URL` = Supabase pooler
- [ ] Migrations applied via `npm run prisma:deploy`
- [ ] Mobile `EXPO_PUBLIC_API_BASE_URL` points to Render HTTPS URL
- [ ] Health check returns `{ "status": "ok" }`

## Mobile

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-service.onrender.com
```

Set in `apps/mobile/.env` (local) or EAS env (cloud builds).
