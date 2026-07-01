# Circuit Mobile

Expo **dev client** (not Expo Go). Requires a native iOS/Android build for push, secure store, and document picker.

The `ios/` and `android/` folders are **not in git** (see `.gitignore`). Each developer generates them locally the first time they build.

## Quick start

```bash
npm run setup:env:mobile # from repo root
```

**`apps/mobile/.env`**

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://your-api.onrender.com
# local API: http://localhost:3009
```

## First-time iOS setup (recommended)

Prerequisites on macOS: **Xcode** (App Store) and **Node 22**.

```bash
cd apps/mobile
npm run generate:brand
npx expo run:ios
```

`expo run:ios` generates the native project (`expo prebuild`), installs CocoaPods, builds, and launches the simulator. You do **not** need to open Xcode for normal setup.

Backend must be running when using a local API (`npm run api:dev` from repo root).

## Run (day to day)

```bash
# Terminal 1 — API (if using local backend)
npm run api:dev   # from repo root

# Terminal 2 — Metro bundler
cd apps/mobile
npx expo start --dev-client --localhost
```

After the first `expo run:ios`, the dev client stays on the simulator — reload from Metro for JS changes. Re-run `npx expo run:ios` when native dependencies change or the dev client needs a rebuild.

From repo root you can also use `npm run mobile` for Metro only (same as `expo start` without `--dev-client`; use `--dev-client` once you have the native build).

## Xcode (optional)

Open Xcode only when you need native debugging, signing, or project settings — **not** for everyday JS development.

The workspace exists only **after** the first native build:

```bash
cd apps/mobile
npx expo prebuild --platform ios   # skip if you already ran expo run:ios
cd ios && pod install && cd ..
open ios/Circuit.xcworkspace
```

If `open ios/Circuit.xcworkspace` fails with "does not exist", run `npx expo run:ios` or `npx expo prebuild --platform ios` first.

## Manual prebuild (alternative to run:ios)

Use this if you want to generate `ios/` without building immediately:

```bash
cd apps/mobile
npm run generate:brand
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

Then build from Xcode or run `npx expo run:ios`.

## EAS builds

Set `EXPO_PUBLIC_*` in [EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) — not in `eas.json`.

```bash
eas build --profile preview
eas build --profile production
```

Env matrix: [../../docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md)
