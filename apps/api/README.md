# Circuit Backend

Node.js + Express + Prisma + Postgres + OpenAI + Redis backend for the Circuit MVP.

## Quick start (local)

```bash
cd apps/api
npm install
npm run setup:env
# Edit .env.development — see ../../docs/ENVIRONMENT.md (Workflow B)

docker compose up -d
npm run dev:db
npm run dev               # http://localhost:3009
curl http://localhost:3009/health
```

**Dev OTP:** with `OTP_PROVIDER=MOCK`, sign-in code is **`111111`**.

**Production:** deploy to [Render](docs/DEPLOYMENT.md) using `render.yaml`. See [Environment matrix](docs/DEPLOYMENT.md#recommended-environment-matrix) for how local, preview, and production line up across mobile, backend, DB, and OTP.

Mobile app: see [`../mobile/README.md`](../mobile/README.md) or the [root README](../../README.md).

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | API with hot reload |
| `npm run dev:db` | Apply migrations (local) |
| `npm run build` | Compile TypeScript |
| `npm start` | Production server (`dist/server/index.js`) |
| `npm run start:prod` | Local only: migrate + start (not used on Render) |
| `npm run prisma:studio` | DB browser |
| `npm test` | Vitest suite |

---

## Docs

| Doc | Contents |
|-----|----------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local dev + Render deploy |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, routes, realtime |
| [docs/DATABASE.md](docs/DATABASE.md) | Prisma schema reference |
| [prisma/README.md](prisma/README.md) | Migrations |
