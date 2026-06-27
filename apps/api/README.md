# Circuit Backend

Node.js + Express + Prisma + Postgres backend for the Circuit MVP.

Uses **NVIDIA NIM** for script analysis (`LLM_PROVIDER=NVIDIA`). Email OTP uses Resend via raw `fetch` when configured. See [`../../docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md).

## Quick start (local)

```bash
cd apps/api
npm install
npm run setup:env
# Edit .env.development — see ../../docs/ENVIRONMENT.md (Workflow B)

docker compose up -d
npm run db:prepare:dev
npm run dev # http://localhost:3009
curl http://localhost:3009/health
```

From monorepo root: `npm run setup:env:api` then `npm run api:dev`

**Dev OTP:** `EMAIL_OTP_PROVIDER=MOCK` + `PHONE_OTP_PROVIDER=MOCK` → code **`111111`**.

**Production:** deploy via the [Render dashboard](docs/DEPLOYMENT.md) (manual web service).

Mobile app: see [`../mobile/README.md`](../mobile/README.md) or the [root README](../../README.md).

---

## Scripts

| Command                  | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | API with hot reload                        |
| `npm run db:prepare:dev` | Apply migrations + generate client (local) |
| `npm run build`          | Compile TypeScript                         |
| `npm start`              | Production server (`dist/server/index.js`) |
| `npm run prisma:deploy`  | Apply migrations (staging/prod)            |
| `npm run prisma:studio`  | DB browser                                 |
| `npm test`               | Vitest suite                               |

---

## Docs

| Doc                                          | Contents                  |
| -------------------------------------------- | ------------------------- |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Local dev + Render deploy |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, routes, realtime |
| [docs/DATABASE.md](docs/DATABASE.md)         | Prisma schema reference   |
| [prisma/README.md](prisma/README.md)         | Migrations                |
