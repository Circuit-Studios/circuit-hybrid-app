# Coding standards — Circuit mobile (`apps/mobile`)

Production conventions for this repo. Architecture layout: [docs/ARCHITECTURE.md](./ARCHITECTURE.md).

## Layers

| Layer | Rule |
|-------|------|
| `app/` | Routes only — re-export feature screens or wire navigation params |
| `src/features/*` | Business UI + hooks; no raw axios calls outside `src/api` |
| `src/api/*` | HTTP + types + `qk` query keys only |
| `src/components/ui/*` | Generic, domain-agnostic UI |
| `src/components/project/*` | Project workspace chrome |
| `src/auth/` | Global session state (contexts), not screen UI |
| `src/lib/` | Pure helpers, storage, query client factory |
| `src/config/` | Validated runtime env (`appEnv.ts`) |

## TypeScript

- `strict` and `noUncheckedIndexedAccess` stay on.
- No `any` in new code; prefer `unknown` + narrowing.
- Export prop types from components (`export interface XProps`).
- App `typecheck` excludes `**/__tests__/**`; tests run via Jest.

## Environment

- Public config: `EXPO_PUBLIC_*` only — never secrets.
- Validate at boot in `src/config/appEnv.ts` (fail fast with clear errors).
- Local: `.env`; cloud builds: EAS environment variables.

## Data fetching

- All React Query keys via `qk` from `src/api/queryKeys.ts` — no inline string arrays.
- Prefix invalidation: `qk.tasksRoot(projectId)` for all task dept filters.
- Feature hooks live in `src/features/<domain>/hooks.ts`.
- Default query client: `createQueryClient()` in `src/lib/queryClient.ts`.

## API client

- Single axios instance in `src/api/client.ts`.
- Auth interceptor attaches JWT; 401 sign-out only on authenticated routes (`shouldSignOutOn401`).
- User-facing errors: `readApiError(err, fallback)`.

## UI

- Prefer `components/ui/*` primitives (`Button`, `TextField`, `FormSheet`, `LoadingState`, `ErrorState`).
- Inline form errors: `FormErrorText`. Full-screen failures: `EmptyState` / `ErrorState`.

## Realtime

- Socket invalidations must use the same `qk` keys as queries.
- Map topics in `RealtimeProvider.affectedKeys` only — do not scatter invalidations.

## Tests & CI

```bash
npm run typecheck
npm run lint
npm test
```

Add unit tests for pure logic (`qk`, `readApiError`, password/session helpers).

## Commits

- Focused diffs; match existing naming and import style (`@/` alias).
- Do not commit `.env`, credentials, or generated native folders unless intentional.
