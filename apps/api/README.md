# Circuit API

Express + Prisma + PostgreSQL. Script analysis uses an LLM provider (`LLM_PROVIDER=NVIDIA` or `GEMINI`).

## Prerequisites

- **Node 22**
- **Docker** (for local Postgres)

---

## First-time setup (do once per machine)

```bash
npm run setup:env          # from repo root — creates .env.development
cd apps/api
docker compose up -d       # starts Postgres on localhost:5432
npm run db:prepare:dev     # applies migrations + generates Prisma client
```

Edit `apps/api/.env.development` (copy from `.env.example`). Minimum for local dev:

```bash
DATABASE_URL=postgresql://circuit:circuit@localhost:5432/circuit_dev?schema=public
JWT_SECRET=replace_with_local_long_secret_min_32_chars
OTP_SECRET=replace_with_local_otp_secret_min_32_chars
EMAIL_OTP_PROVIDER=MOCK
PHONE_OTP_PROVIDER=MOCK
```

See [../../docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md) for LLM keys and full variable list.

Verify it works:

```bash
npm run dev    # http://localhost:3009
```

From repo root: `npm run api:dev`

---

## Every day

```bash
npm run api:dev    # from repo root
# or
cd apps/api && npm run dev
```

No Prisma command needed unless you pulled new database migrations.

---

## After pulling new migrations

```bash
cd apps/api
npm run db:prepare:dev
```

---

## Commands

| Command | When to use |
| ------- | ----------- |
| `npm run dev` | Start API with hot reload |
| `npm run db:prepare:dev` | First setup, or after pulling migrations |
| `npm run prisma:migrate` | You changed `schema.prisma` locally (creates a new migration) |
| `npm run prisma:deploy` | Apply migrations on Render / staging / prod |
| `npm run prisma:studio` | Browse database in a UI |
| `npm test` | Run Vitest |

## Prisma notes

- `npm install` (repo root) runs `prisma generate` automatically
- `db:prepare:dev` runs `migrate deploy` + `generate` — this creates tables in Postgres
- You do **not** run Prisma on every `npm run dev`

## Dev login

When `EMAIL_OTP_PROVIDER=MOCK`: OTP code is **`111111`**

## Deploy

[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) · Env vars: [../../docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md)
