# Mobile App

> **Circuit v1 (minor release).** Same app (film‑production planning) — shipping a
> **limited‑functionality v1** now, full features later, with a **new visual language**.
> The v1 plan lives in [`docs/`](./docs/README.md):
>
> | Doc                                                    | Contents                                                                      |
> | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
> | [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md)       | **New styling** — orange/amber, glass, from the design screenshots            |
> | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)         | **v1 navigation + screens** (existing screens, restyled; AI screens deferred) |
> | [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) | **Production conventions** — layers, types, `qk`, env, tests                  |
>
> The **layout + content source is a PDF (pending)**; unresolved specifics are marked **TBD**.
> Existing screens are **kept** — v1 ships a subset and restyles it (nothing removed).
> Backend scope: see [`../api/docs/PRODUCT.md`](../api/docs/PRODUCT.md) and [`MIGRATION.md`](../api/docs/MIGRATION.md).

---

## Full build reference (current Circuit)

Built with **Expo + React Native + TypeScript**.

This release implements **Modules 1, 2, 3, 4 and 5** end-to-end:

1. Welcome → signup with role context (`?ctx=starter` for directors/producers)
2. **Sign up:** phone OTP verification → account created with password
3. **Sign in:** mobile number + password
4. Project list with inline **pending-invites inbox** (Spider mode when you belong to ≥ 2 projects)
5. Create Project (3-step wizard)
6. Upload Script (PDF, ≤ 25 MB, multipart to the backend)
7. AI Analysis Progress (live polling of the 6-stage pipeline)
8. AI Analysis Results (characters, scenes, combination savings, departments,
   shoot-day estimates, budget draft)
9. **Workspace dashboard** — live `/projects/:id/health` data, multi-segment
   Health Ring, open conflict feed, next shoot day, headline stats
10. **Tasks** — Kanban board across TODO / IN PROGRESS / BLOCKED / DONE with
    a create + edit sheet, department filter, and one-tap status moves
11. **Schedule** — shoot-day timeline + add sheet (triggers conflict scan)
12. **Team** — active members + pending invites, invite-by-phone sheet
13. **Real-time** — Socket.IO client joins a per-project room and
    auto-invalidates React Query caches when tasks, shoot days, conflicts or
    AI analysis change on the server
14. **Push notifications** — registers an Expo push token on sign-in,
    handles foreground + background delivery, deep-links on tap
15. **Notifications inbox** — bell badge with unread count + paginated inbox
    screen + "Mark all read"
16. **Edit / override AI rows** — leadership can tap any character / scene /
    department / budget line on the AI Results screen to open a bottom sheet
    edit form. Edited rows display an EDITED badge.

Known gaps deliberately deferred to the next iteration: per-conflict
resolve / reschedule action sheet; "I was invited" deep link flow.

---

## Quick start (local iOS)

**1. Backend first** — from repo root or `apps/api/`:

```bash
npm install && cp .env.example .env
docker compose up -d
npm run prisma:generate && npm run prisma:migrate
npm run dev
```

**2. Mobile one-time setup** — in `apps/mobile/`:

```bash
npm install
cp .env.example .env
npm run generate:brand
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

(`ios/` is not committed; prebuild is required on a fresh clone.)

**3. Every dev session** — two terminals:

```bash
# Terminal 1 (apps/mobile/ or `npm run mobile` from repo root)
npx expo start --dev-client --localhost

# Terminal 2 — Xcode
open ios/Circuit.xcworkspace
# Pick a simulator → Run (⌘R)
```

Sign up in the app with OTP **`111111`** (backend `OTP_PROVIDER=MOCK`).

Backend details: [`../api/README.md`](../api/README.md) or the [root README](../../README.md).

---

## Prereqs

- Node ≥ 20
- npm ≥ 10 (or pnpm/yarn — we use npm in the lockfile)
- Xcode **15+** with iOS Simulator (tested on Xcode 16–26) **or** Android Studio
  (Pixel 7 image recommended)
- `xcode-select` pointing at full Xcode (not Command Line Tools only):
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
- CocoaPods (`sudo gem install cocoapods` or `brew install cocoapods`) for iOS
- The Circuit backend running locally at `http://localhost:3009`
  (see [`apps/api/README.md`](../api/README.md)) **or** point the app at Render via `.env`

> We ship a **development build** (Expo SDK modules baked into the app
> binary), not Expo Go — the project pulls in `expo-notifications`,
> `expo-secure-store`, `expo-document-picker` and other modules that aren't
> available in Expo Go.

---

## Setup

Clone the [`circuit-hybrid-app`](https://github.com/Circuit-Studios/circuit-hybrid-app) monorepo.
Start the backend before the mobile app.

```bash
cd apps/mobile
npm install
cp .env.example .env
# Edit EXPO_PUBLIC_API_BASE_URL — see "Environment variables" below
```

### iOS — native project (one-time per machine)

```bash
npm run generate:brand

npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

The Podfile `post_install` hook patches `fmt` for newer Xcode clang; it runs
automatically on every `pod install`.

If `ios/` already exists (you ran prebuild before), skip prebuild and only run:

```bash
cd ios && pod install && cd ..
```

### Android — native project (one-time per machine)

```bash
npm run generate:brand
npx expo prebuild --platform android
```

### Environment variables

#### Environment matrix

| Environment       | Mobile (`EXPO_PUBLIC_*`)                                                                                          | Backend                   | Database                             | OTP               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------ | ----------------- |
| **Local**         | `EXPO_PUBLIC_APP_ENV=local`<br>`EXPO_PUBLIC_API_BASE_URL=http://localhost:3009`                                   | Mac backend               | Local Postgres or Supabase dev       | `MOCK` (`111111`) |
| **Dev / Preview** | `EXPO_PUBLIC_APP_ENV=development` or `preview`<br>`EXPO_PUBLIC_API_BASE_URL=https://circuit-api-dev.onrender.com` | Render Free               | Supabase _(shared OK while testing)_ | `MOCK`            |
| **Production**    | `EXPO_PUBLIC_APP_ENV=production`<br>Custom API URL _(later)_                                                      | Render paid / stable host | Supabase prod                        | MSG91 / Twilio    |

While testing, dev and preview can share the same Render backend. Before App Store or public users, use separate Supabase **dev** and **production** projects so test users and real users never share a database. Full cross-stack notes: [`../api/docs/DEPLOYMENT.md#recommended-environment-matrix`](../api/docs/DEPLOYMENT.md#recommended-environment-matrix).

Mobile env files (no secrets in git):

| File           | Committed?      | Purpose                                     |
| -------------- | --------------- | ------------------------------------------- |
| `.env`         | No (gitignored) | Local dev values — copy from `.env.example` |
| `.env.example` | Yes             | Placeholders + docs only                    |
| `eas.json`     | Yes             | EAS build profiles only — **no env values** |
| `app.json`     | Yes             | App config — **no API URLs**                |

Set `EXPO_PUBLIC_API_BASE_URL` (and optionally `EXPO_PUBLIC_APP_ENV`) in `.env` (local) or [EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) (cloud builds). Expo inlines `EXPO_PUBLIC_*` into the app bundle — fine for a public API URL; **never** put database URLs, API keys, JWT secrets, or AWS credentials in `EXPO_PUBLIC_*`.

Backend env: `apps/api/.env.development` (local) or Render dashboard (deployed) — see [`../api/.env.example`](../api/.env.example).

**Mobile runtime:** `EXPO_PUBLIC_*` → `src/config/appEnv.ts` → `src/api/client.ts`. No API URLs in `app.json` or `eas.json`. Missing `EXPO_PUBLIC_API_BASE_URL` throws at app load.

```bash
cp .env.example .env
# Edit env vars, then restart Metro after any change
```

```bash
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_BASE_URL=http://localhost:3009

# or Render:
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://circuit-api-dev.onrender.com
```

For a **physical device** on the same WiFi, use your laptop's LAN IP instead of
`localhost`, e.g. `http://192.168.1.42:3009`.

### EAS build profiles

`eas.json` maps each build profile to an [EAS environment](https://docs.expo.dev/eas/environment-variables/) — env values live in the Expo dashboard, not in git:

| Profile       | Use case                          | EAS environment |
| ------------- | --------------------------------- | --------------- |
| `development` | Dev client (simulator / internal) | `development`   |
| `preview`     | Internal TestFlight / ad hoc      | `preview`       |
| `production`  | App Store / Play Store            | `production`    |

Set these in the Expo dashboard (Project → Environment variables) or via CLI:

```bash
# development (eas build --profile development)
eas env:create --environment development --name EXPO_PUBLIC_API_BASE_URL --value https://circuit-api-dev.onrender.com
eas env:create --environment development --name EXPO_PUBLIC_APP_ENV --value development

# preview (eas build --profile preview)
eas env:create --environment preview --name EXPO_PUBLIC_API_BASE_URL --value https://circuit-api-dev.onrender.com
eas env:create --environment preview --name EXPO_PUBLIC_APP_ENV --value preview

# production (eas build --profile production)
eas env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://your-production-api.com
eas env:create --environment production --name EXPO_PUBLIC_APP_ENV --value production
```

```bash
eas build --profile preview    # internal TestFlight
eas build --profile production # App Store
```

---

## Run

Start the **backend** (`npm run api:dev` from repo root, or `npm run dev` in `apps/api/`) first.
Then run the mobile app — you need **Metro** (JS) plus the **native binary**.

### Option A — Xcode + Metro (recommended)

```bash
# Terminal 1: Metro
npx expo start --dev-client --localhost
```

Then in Xcode:

```bash
open ios/Circuit.xcworkspace
```

Pick the iPhone simulator (or your device) and hit **Run** (`⌘R`). Subsequent
launches: just hit Run again — Metro stays up across rebuilds.

### Option B — All-in-one via the Expo CLI

```bash
npx expo run:ios       # iOS simulator — builds native app + starts Metro
npx expo run:android   # Android emulator
# or: npm run android
```

First build takes ~5–10 minutes. Later runs are incremental.

> Do **not** use `npm run ios` for this project — that script targets Expo Go,
> which we do not use. Use Option A or `npx expo run:ios` instead.

### Reloading JS only

After a JS-only change, press `r` in the Metro terminal (or `⌘R` in the
simulator) — no native rebuild needed. Native rebuild is only required when
you touch `app.json`, `Podfile`, or any code under `ios/` / `android/`.

---

## Project structure

`app/` routes are thin navigation shells; business UI lives in `src/features/*`.
Full module rules and migration status: [docs/ARCHITECTURE.md § Module structure](./docs/ARCHITECTURE.md#4-module-structure-scaling). Coding standards: [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md).

```
apps/mobile/
├── app/                       # Expo Router — navigation + composition only
│   ├── (auth)/login.tsx       # → features/auth/LoginForm
│   ├── (auth)/signup.tsx      # → features/auth/SignupForm
│   ├── (auth)/otp.tsx         # → features/auth/OtpForm
│   ├── (app)/projects.tsx     # → features/projects/ProjectList
│   └── project/[id]/…         # tasks, schedule, team use feature sheets + scaffold
├── src/
│   ├── config/appEnv.ts       # EXPO_PUBLIC_* runtime config
│   ├── api/                   # HTTP only (client, queryKeys, auth, projects, …)
│   ├── features/              # Domain UI + hooks (auth, projects, tasks, …)
│   ├── components/
│   │   ├── ui/                # Button, TextField, EmptyState, FormSheet, …
│   │   └── project/           # ProjectTabBar, ProjectScreenScaffold
│   ├── auth/                  # AuthContext, SignupSessionContext
│   ├── realtime/              # socket, RealtimeProvider, push
│   ├── lib/                   # storage, session, phone, format
│   └── theme/
└── assets/
```

---

## End-to-end smoke test

With the backend running:

1. Open the app → tap **"I'm starting a project"** → fill name, phone, pick
   **Director** → tap **Send code**.
2. Enter **`111111`** — the dev-fixed code the backend uses when
   `OTP_PROVIDER=MOCK` (the default). For real SMS, set
   `OTP_PROVIDER=MSG91` + the MSG91 envs on the backend; the fixed code
   path turns off automatically.
3. You land on the projects screen.
4. Tap **Start a project** → fill in a title/language/genre → confirm.
5. You'll auto-route to the script upload screen — pick any PDF and tap
   **Upload & analyse**.
6. Watch the 6-stage AI pipeline tick through (~30–90s).
7. Land on the AI Results screen — characters, scenes, combinations, depts,
   shoot days, and a budget draft.
8. Tap **Open project workspace** → see the Health Ring populated with the
   AI-suggested departments at 0%.
9. Switch to **Tasks** → tap **+ Add** → create a task in any department.
   Move it across columns; the Health Ring updates in real time on the
   Workspace tab (open it in a second simulator to see the socket push).
10. Switch to **Schedule** → add a shoot day. The conflict scanner runs
    automatically; the Workspace tab's "Open conflicts" tile updates.
11. Switch to **Team** → invite a teammate by phone. From their device they'll
    see the invite on the projects screen and can accept it inline.
12. Back on the Projects screen, tap the **bell icon** in the top right. The
    inbox lists every notification the backend has dispatched to you so far
    (AI analysis complete, project invite, etc.). Pull-to-refresh, tap a row
    to deep-link to its source screen, or tap **Mark all read**.
13. As a Director or Producer, open **AI Results** again — tap any character,
    scene, department, or budget-line row to open the edit sheet. Save; the
    row gets an **EDITED** badge and the workspace re-syncs via Socket.IO.

---

## Realtime contract

The app maintains one socket per signed-in session and joins a per-project
room when any of the four project tabs mount. The server emits topical
events (`task.updated`, `shootday.created`, `conflict.created`,
`notification.created`, `character.updated`, etc.) and the
`RealtimeProvider` translates them into React Query cache invalidations.
Net effect: the UI updates within a second of a teammate making a change on
another device, without any per-screen WebSocket logic.

---

## Push notifications

`src/realtime/push.ts` wraps `expo-notifications`:

1. On sign-in, `RealtimeProvider` calls `registerForPush()`.
2. That requests OS permission, configures Android channels (Conflicts,
   Shoot day, Tasks, General), fetches the Expo push token, and POSTs it
   to `/me/push-tokens`.
3. `attachNotificationHandlers` installs foreground + tap handlers; tapping
   a notification triggers `router.push(deepLink)` so e.g. a SCHEDULE_CLASH
   alert deep-links to `/project/<id>/schedule`.
4. Both incoming and tapped notifications invalidate the bell-badge query
   so the count is always fresh.

On simulators / web, `registerForPush` is a no-op (Expo can't deliver to
non-physical devices). The IN_APP inbox + Socket.IO `notification.created`
path still works because the backend dispatcher writes the inbox row
regardless of whether a push token exists.

---

## Known TODOs (in priority order)

- "I was invited" deep link flow (`circuit://invite/:inviteId`).
- Detail screen for each conflict alert with a "Resolve" / "Reschedule"
  action.
- Brand PNGs are generated from `assets/circuit-logo.svg` via `npm run generate:brand`
  (required for app icon, splash, and favicon in `app.json`).
- Shared `@circuit/shared` package so `types.ts` doesn't drift from the
  backend's Zod schemas.

---

## Notes for App Store / Play Store submission

- Bundle IDs: `com.circuitstudios.circuit` for both iOS and Android.
- iOS privacy strings are set in `app.json` for camera, photo library, and
  microphone.
- `ITSAppUsesNonExemptEncryption: false` is declared — we only use Apple's
  standard TLS for network traffic.
- `expo-notifications` plugin is registered; iOS prompts for push permission
  on first sign-in. Apple requires you to enable the Push Notifications
  capability + create an APNs key in App Store Connect before submitting.
- Before submission, run `npx expo prebuild` to generate the native iOS /
  Android projects, then archive via Xcode (iOS) / `./gradlew bundleRelease`
  (Android). The CI/CD pipeline (Fastlane + GitHub Actions) is queued for
  the next backend iteration.
