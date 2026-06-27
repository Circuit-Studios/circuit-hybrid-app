# Circuit Mobile

Expo dev client (not Expo Go). Requires a native build for push, secure store, document picker.

## Quick start

```bash
npm run setup:env:mobile # from repo root
```

**`apps/mobile/.env`**

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://your-api.onrender.com
# local: http://localhost:3009
```

## First-time iOS setup

```bash
cd apps/mobile
npm run generate:brand
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

## Run

```bash
# Terminal 1
npx expo start --dev-client --localhost

# Terminal 2 — Xcode
open ios/Circuit.xcworkspace
```

Or: `npx expo run:ios`

Backend must be running first (`npm run api:dev` from repo root).

## EAS builds

Set `EXPO_PUBLIC_*` in [EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) — not in `eas.json`.

```bash
eas build --profile preview
eas build --profile production
```

Env matrix: [../../docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md)
