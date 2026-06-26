# Circuit — Documentation index

Master index for the **circuit-hybrid-app** monorepo. Start here for architecture, database mapping, environment setup, and deployment.

```text
circuit-hybrid-app/
├── docs/                          ← cross-cutting (this folder)
│   ├── README.md                  ← you are here
│   └── ENVIRONMENT.md             ← env workflows (mobile / local API / Render / EAS)
├── apps/mobile/docs/              ← Expo app architecture & design
└── apps/api/docs/                 ← backend architecture, DB, deploy
    └── prisma/schema.prisma       ← schema source of truth (see DATABASE.md)
```

---

## Cross-cutting

| Doc                                | Contents                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | **Env workflows A/B/C** — `apps/mobile/.env`, `apps/api/.env.development`, Render dashboard, EAS, Resend OTP |
| [../README.md](../README.md)       | Monorepo quick start, scripts, CI, Prettier                                                                  |

---

## Mobile app (`apps/mobile`)

| Doc                                                                                | Contents                                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [../apps/mobile/README.md](../apps/mobile/README.md)                               | Setup, EAS, smoke test, push                                      |
| [../apps/mobile/docs/README.md](../apps/mobile/docs/README.md)                     | Mobile docs index                                                 |
| [../apps/mobile/docs/ARCHITECTURE.md](../apps/mobile/docs/ARCHITECTURE.md)         | Navigation (expo-router), module structure, React Query, realtime |
| [../apps/mobile/docs/CODING_STANDARDS.md](../apps/mobile/docs/CODING_STANDARDS.md) | Layers, `qk` keys, env, tests                                     |
| [../apps/mobile/docs/DESIGN-SYSTEM.md](../apps/mobile/docs/DESIGN-SYSTEM.md)       | v1 visual language — colors, glass, typography                    |

---

## Backend API (`apps/api`)

| Doc                                                                  | Contents                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| [../apps/api/README.md](../apps/api/README.md)                       | Local quick start, npm scripts                            |
| [../apps/api/docs/README.md](../apps/api/docs/README.md)             | Backend docs index                                        |
| [../apps/api/docs/ARCHITECTURE.md](../apps/api/docs/ARCHITECTURE.md) | System map, modules, auth, AI pipeline, realtime, queues  |
| [../apps/api/docs/DATABASE.md](../apps/api/docs/DATABASE.md)         | **Database mapping** — ER diagram, tables, enums, indexes |
| [../apps/api/docs/PRODUCT.md](../apps/api/docs/PRODUCT.md)           | v1 product scope (in vs deferred)                         |
| [../apps/api/docs/MIGRATION.md](../apps/api/docs/MIGRATION.md)       | v1 scope & deferred features                              |
| [../apps/api/docs/DEPLOYMENT.md](../apps/api/docs/DEPLOYMENT.md)     | Local dev + Render dashboard deploy                       |
| [../apps/api/prisma/README.md](../apps/api/prisma/README.md)         | Prisma migrations workflow                                |

**Schema source of truth:** [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma)

---

## By topic

### Architecture

| Layer                       | Document                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Full stack (high level)     | [API ARCHITECTURE](../apps/api/docs/ARCHITECTURE.md) §1 — mobile ↔ Express ↔ Postgres                                   |
| Mobile navigation & modules | [Mobile ARCHITECTURE](../apps/mobile/docs/ARCHITECTURE.md)                                                              |
| Backend modules & routes    | [API ARCHITECTURE](../apps/api/docs/ARCHITECTURE.md) §2–8                                                               |
| Realtime (Socket.IO)        | [API ARCHITECTURE](../apps/api/docs/ARCHITECTURE.md) §8 · [Mobile ARCHITECTURE](../apps/mobile/docs/ARCHITECTURE.md) §3 |
| AI script pipeline          | [API ARCHITECTURE](../apps/api/docs/ARCHITECTURE.md) §5                                                                 |

### Database

| Need                         | Document                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| ER diagram + table reference | [DATABASE.md](../apps/api/docs/DATABASE.md)                                                        |
| Prisma schema (code)         | [`prisma/schema.prisma`](../apps/api/prisma/schema.prisma)                                         |
| Run migrations locally       | [prisma/README.md](../apps/api/prisma/README.md) · [DEPLOYMENT.md](../apps/api/docs/DEPLOYMENT.md) |

### Environment & deploy

| Need                       | Document                                        |
| -------------------------- | ----------------------------------------------- |
| Which `.env` file to edit  | [ENVIRONMENT.md](./ENVIRONMENT.md)              |
| Render deploy + env matrix | [DEPLOYMENT.md](../apps/api/docs/DEPLOYMENT.md) |
| EAS mobile builds          | [Mobile README](../apps/mobile/README.md) § EAS |

### v1 scope

| Need                               | Document                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| What's in v1 vs deferred (backend) | [PRODUCT.md](../apps/api/docs/PRODUCT.md) · [MIGRATION.md](../apps/api/docs/MIGRATION.md) |
| Mobile screens & navigation        | [Mobile ARCHITECTURE](../apps/mobile/docs/ARCHITECTURE.md) §1                             |
| Design / restyle                   | [DESIGN-SYSTEM.md](../apps/mobile/docs/DESIGN-SYSTEM.md)                                  |

---

## Recommended reading order

1. [ENVIRONMENT.md](./ENVIRONMENT.md) — pick Workflow A (Render) or B (local full stack)
2. [API ARCHITECTURE](../apps/api/docs/ARCHITECTURE.md) — how the system fits together
3. [DATABASE.md](../apps/api/docs/DATABASE.md) — data model when touching API or Prisma
4. [Mobile ARCHITECTURE](../apps/mobile/docs/ARCHITECTURE.md) — screens, features, `qk` keys
5. [CODING_STANDARDS](../apps/mobile/docs/CODING_STANDARDS.md) — before opening a PR on mobile
