# Circuit

Film production planning — Expo mobile app + Node.js API (monorepo).

| App    | Path          | Stack                              |
| ------ | ------------- | ---------------------------------- |
| Mobile | `apps/mobile` | Expo · React Native · expo-router  |
| API    | `apps/api`    | Express · Prisma · PostgreSQL · LLM |

## Prerequisites

- **Node 22**
- **macOS + Xcode** (for iOS simulator)
- **Docker** (only if running the API locally)

## Choose your setup

### Option A — Mobile only (API on Render)

Use this if you only run the app and connect to a hosted API.

```bash
npm install
npm run setup:env
```

Edit `apps/mobile/.env`:

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://your-api.onrender.com
```

**First time (iOS):** see [apps/mobile/README.md](./apps/mobile/README.md) — run `npx expo run:ios` once.

**Every day:**

```bash
cd apps/mobile
npx expo start --dev-client --localhost
```

---

### Option B — Full local stack (mobile + API on your Mac)

Use this if you run the API and Postgres locally.

**First time only:**

```bash
npm install
npm run setup:env

# API database
cd apps/api
docker compose up -d
npm run db:prepare:dev

# iOS native build (generates ios/ folder — not in git)
cd ../mobile
npm run generate:brand
npx expo run:ios
```

Edit env files — see [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md):

- `apps/api/.env.development` — database, secrets, LLM keys
- `apps/mobile/.env` — `EXPO_PUBLIC_API_BASE_URL=http://localhost:3009`

**Every day:**

```bash
# Terminal 1 — API
npm run api:dev

# Terminal 2 — Metro bundler
cd apps/mobile
npx expo start --dev-client --localhost
```

The simulator app is already installed from the first `expo run:ios`. Re-run that command only when native dependencies change.

Dev login OTP (when providers are `MOCK`): **`111111`**

---

## Common commands

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run api:dev`   | Start API with hot reload       |
| `npm run mobile`    | Start Metro (without dev-client flag) |
| `npm run typecheck` | Typecheck mobile + API          |
| `npm run test`      | Run all tests                   |

## Database migrations

| When                         | Command                                      |
| ---------------------------- | -------------------------------------------- |
| First local API setup        | `cd apps/api && npm run db:prepare:dev`      |
| After pulling new migrations | `cd apps/api && npm run db:prepare:dev`      |
| Deployed API (Render)        | `cd apps/api && npm run prisma:deploy`       |

`npm install` runs `prisma generate` automatically. It does **not** create database tables — use `db:prepare:dev` for that.

## More docs

| Doc | Contents |
| --- | -------- |
| [apps/mobile/README.md](./apps/mobile/README.md) | iOS simulator, Metro, troubleshooting |
| [apps/api/README.md](./apps/api/README.md) | API local dev, Prisma |
| [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) | All env vars, LLM keys, Render |
| [apps/api/docs/DEPLOYMENT.md](./apps/api/docs/DEPLOYMENT.md) | Deploy API to Render |

Schema: `apps/api/prisma/schema.prisma`
