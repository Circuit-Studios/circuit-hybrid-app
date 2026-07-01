# Circuit API

Express + Prisma + PostgreSQL. Script analysis uses **NVIDIA NIM** (`LLM_PROVIDER=NVIDIA`).

## Local dev

First-time setup applies database migrations once (not on every `npm run dev`):

```bash
npm run setup:env # from repo root — creates .env.development
cd apps/api
docker compose up -d
npm run db:prepare:dev   # prisma migrate deploy + generate
npm run dev              # http://localhost:3009
```

After pulling new migrations: run `npm run db:prepare:dev` again.

From repo root: `npm run api:dev`

Dev OTP: `EMAIL_OTP_PROVIDER=MOCK` → code **`111111`**

## Scripts

| Command                  | Purpose                         |
| ------------------------ | ------------------------------- |
| `npm run dev`            | Hot reload                      |
| `npm run db:prepare:dev` | Migrate + generate client       |
| `npm run prisma:deploy`  | Apply migrations (staging/prod) |
| `npm test`               | Vitest                          |

## Deploy

[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) · Env: [../../docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md)
