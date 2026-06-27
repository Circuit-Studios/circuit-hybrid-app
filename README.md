# Circuit

Film production planning — Expo mobile + Node.js API monorepo.

| App    | Path          | Stack                                      |
| ------ | ------------- | ------------------------------------------ |
| Mobile | `apps/mobile` | Expo · React Native · expo-router          |
| API    | `apps/api`    | Express · Prisma · PostgreSQL · NVIDIA NIM |

## Quick start

```bash
npm install
npm run setup:env
```

**Mobile → Render (default)** — edit `apps/mobile/.env`:

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://your-api.onrender.com
npm run mobile
```

**Full local stack** — see [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md).

```bash
npm run api:dev # terminal 1
npm run mobile  # terminal 2
```

Dev OTP when providers are `MOCK`: **`111111`**

## Scripts

| Command             | Purpose                |
| ------------------- | ---------------------- |
| `npm run mobile`    | Start Expo             |
| `npm run api:dev`   | Start API (hot reload) |
| `npm run typecheck` | Typecheck both         |
| `npm run test`      | Run all tests          |
| `npm run format`    | Prettier write         |

## Deploy

- **API:** Render — [apps/api/docs/DEPLOYMENT.md](./apps/api/docs/DEPLOYMENT.md)
- **Env vars:** [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)
- **Migrations:** `cd apps/api && npm run prisma:deploy` (not in Render build)

## Docs

| Doc                                                          | Contents                              |
| ------------------------------------------------------------ | ------------------------------------- |
| [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)                 | Env files, NVIDIA LLM, Render secrets |
| [apps/api/docs/DEPLOYMENT.md](./apps/api/docs/DEPLOYMENT.md) | Render build/start commands           |
| [apps/api/README.md](./apps/api/README.md)                   | API local dev                         |
| [apps/mobile/README.md](./apps/mobile/README.md)             | Mobile dev client setup               |

Schema source of truth: `apps/api/prisma/schema.prisma`
