# Database bootstrap

## Files

| File | Purpose |
|------|---------|
| `schema.prisma` | Data model (edit this) |
| `init.sql` | Full schema SQL for a fresh database |
| `migrations/20260608120000_init/` | Prisma migration (same SQL) |

## Local dev (Docker)

```bash
docker compose up -d
npm run dev:db
```

## Render (production)

Render Postgres is linked via `DATABASE_URL`. Migrations run in the Render **build** command:

```bash
npx prisma migrate deploy
```

For a one-off local run against prod: `npm run prod:bootstrap`

## After changing `schema.prisma`

```bash
npm run db:sql          # regenerate init.sql + migration copy
npm run prisma:migrate  # create a new incremental migration (dev only)
```
