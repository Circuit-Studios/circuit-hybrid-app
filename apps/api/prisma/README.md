# Database bootstrap

## Files

| File | Purpose |
|------|---------|
| `schema.prisma` | Data model (edit this) |
| `init.sql` | Reference SQL snapshot (historical) |
| `migrations/` | Prisma incremental migrations |

## Local dev (Docker)

```bash
docker compose up -d
npm run dev:db
```

## Render (production)

Render Postgres is linked via `DATABASE_URL`. Apply migrations **manually** when schema changes land:

```bash
cd apps/api
npm run prisma:deploy
```

Do **not** rely on Render build/start hooks for migrations unless you have explicitly configured that workflow.

## After changing `schema.prisma`

```bash
npm run prisma:migrate   # create a new incremental migration (dev only)
npm run prisma:deploy    # apply on shared/staging/prod
```
