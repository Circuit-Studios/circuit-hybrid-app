# Circuit Hybrid App

Monorepo for **Circuit** — film production planning (Expo mobile + Node.js API).

| Package | Path | Stack |
|---------|------|-------|
| **Mobile** | [`apps/mobile`](./apps/mobile) | Expo SDK 56 · React Native · expo-router · React Query |
| **API** | [`apps/api`](./apps/api) | Express · Prisma · PostgreSQL · Redis · Socket.IO · OpenAI |

---

## Quick start

### 1. Install

```bash
git clone git@github.com:Circuit-Studios/circuit-hybrid-app.git
cd circuit-hybrid-app
npm install
npm run setup:env
```

### 2. Pick a workflow

**Default (mobile → Render)** — edit `apps/mobile/.env` only:

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://circuit-api-dev.onrender.com
```

Then `npm run mobile`. No local API env needed.

**Full local stack** — also create `apps/api/.env.development` and point mobile at `http://localhost:3009`.

Full guide: **[docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)** · All docs: **[docs/README.md](./docs/README.md)**

### 3. Backend (Workflow B only)

```bash
cd apps/api
docker compose up -d
npm run dev:db
npm run dev          # http://localhost:3009
```

From repo root: `npm run api:dev`

**Dev OTP:** `OTP_PROVIDER=MOCK` → code **`111111`**

### 4. Mobile

```bash
npm run mobile       # or: npm run dev:mobile
```

First-time iOS native setup: [`apps/mobile/README.md`](./apps/mobile/README.md)

---

## Monorepo scripts (repo root)

| Command | Purpose |
|---------|---------|
| `npm install` | Install all workspace dependencies |
| `npm run setup:env` | Create `apps/api/.env.development` + `apps/mobile/.env` from examples |
| `npm run api:dev` | Start API with hot reload |
| `npm run mobile` | Start Expo Metro (alias: `npm run dev:mobile`) |
| `npm run typecheck` | Typecheck mobile + API |
| `npm run lint` | Lint both packages |
| `npm run test` | Run mobile Jest + API Vitest |

---

## Environment configuration

Config is split by surface — see **[docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)** for workflows A/B/C.

| File | Purpose |
|------|---------|
| `apps/mobile/.env` | Local Expo only |
| `apps/api/.env.development` | Local API only (`npm run api:dev`) |
| Render dashboard | Deployed API |
| EAS env | Cloud mobile builds |

## Environment matrix

| Environment | Mobile (`EXPO_PUBLIC_*`) | Backend | Database | OTP |
|-------------|--------------------------|---------|----------|-----|
| **Local** | `http://localhost:3009` | `npm run api:dev` | Docker Postgres | `MOCK` |
| **Dev / Preview** | Render URL | Render Free | Supabase dev | `MOCK` |
| **Production** | Custom API domain | Render paid | Supabase prod | MSG91 / Twilio |

Details: [`apps/api/docs/DEPLOYMENT.md`](./apps/api/docs/DEPLOYMENT.md)

---

## Deploy API (Render)

1. Push to GitHub.
2. Render → **New** → **Blueprint** → connect this repo.
3. Set `OPENAI_API_KEY` in the dashboard (sync: false).
4. Migrations run during build (`build:deploy` script).

Blueprint: [`render.yaml`](./render.yaml)

---

## Documentation

**Start here:** **[docs/README.md](./docs/README.md)** — master index (architecture, database, env, deploy).

| Doc | Contents |
|-----|----------|
| [docs/README.md](./docs/README.md) | **Documentation hub** — all architecture & DB docs |
| [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) | Env workflows — mobile / local API / Render / EAS |
| [apps/mobile/docs/ARCHITECTURE.md](./apps/mobile/docs/ARCHITECTURE.md) | Mobile navigation, module structure |
| [apps/mobile/docs/CODING_STANDARDS.md](./apps/mobile/docs/CODING_STANDARDS.md) | Mobile production conventions |
| [apps/mobile/docs/DESIGN-SYSTEM.md](./apps/mobile/docs/DESIGN-SYSTEM.md) | Visual language (v1 restyle) |
| [apps/api/docs/ARCHITECTURE.md](./apps/api/docs/ARCHITECTURE.md) | Backend modules, realtime, AI pipeline |
| [apps/api/docs/DATABASE.md](./apps/api/docs/DATABASE.md) | **Database mapping** — ER diagram, tables, enums |
| [apps/api/docs/DEPLOYMENT.md](./apps/api/docs/DEPLOYMENT.md) | Local dev + Render deploy |

---

## Repository layout

```text
circuit-hybrid-app/
├── apps/
│   ├── mobile/          # Expo app (circuit-mobile workspace)
│   └── api/             # Express API (circuit-backend workspace)
├── docs/                # Cross-cutting docs (index, environment)
│   ├── README.md        # Master documentation index
│   └── ENVIRONMENT.md
├── .github/workflows/   # CI (mobile + API)
├── render.yaml          # Render Blueprint
├── package.json         # npm workspaces root
└── LICENSE
```

---

## CI

GitHub Actions runs on push/PR to `main` and `develop`:

- **Mobile** — typecheck, lint, Jest
- **API** — Prisma validate/migrate, lint, typecheck, build, Vitest (Postgres service)

---

## License

See [LICENSE](./LICENSE).
