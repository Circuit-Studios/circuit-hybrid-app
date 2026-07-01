# Circuit Mobile

Expo **dev client** app (not Expo Go). Requires a one-time native build for push notifications, secure store, and document picker.

> The `ios/` folder is **not in git**. Each developer creates it locally with `npx expo run:ios`.

## Prerequisites

- macOS
- **Xcode** from the App Store
- **Node 22**
- API running if using local backend (`npm run api:dev` from repo root)

## Configure `.env`

Create with `npm run setup:env` from repo root, then edit `apps/mobile/.env`:

**Local API:**

```bash
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_BASE_URL=http://localhost:3009
```

**Hosted API (Render):**

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=https://your-api.onrender.com
```

---

## First-time setup (do once per machine)

```bash
cd apps/mobile
npm run generate:brand
npx expo run:ios
```

This command will:

1. Generate the `ios/` native project
2. Install CocoaPods
3. Build the app
4. **Open the iOS Simulator automatically**
5. Install and launch Circuit

You do **not** need to open Xcode for normal development.

If Xcode asks for a **Development Team**: **Xcode → Settings → Accounts** → add your Apple ID (free) → pick **Personal Team**. A paid developer account is not required for the simulator.

---

## Every day (normal development)

```bash
# Terminal 1 — only if using local API
npm run api:dev

# Terminal 2
cd apps/mobile
npx expo start --dev-client --localhost
```

Keep the simulator open from the first `expo run:ios`. JS changes reload from Metro automatically.

**Re-run `npx expo run:ios` only when:**

- Native dependencies changed
- The dev client needs a rebuild
- First time on a new machine

---

## Quick reference

| Goal | Command |
| ---- | ------- |
| First iOS build + open simulator | `npx expo run:ios` |
| Start Metro bundler | `npx expo start --dev-client --localhost` |
| List simulators | `xcrun simctl list devices available` |
| Clear Metro cache | `npx expo start --dev-client --localhost -c` |

---

## Troubleshooting

### `ios/Circuit.xcworkspace` does not exist

Normal on a fresh clone. Run:

```bash
npx expo run:ios
```

### App shows no data / network errors

1. Is the API running? (`npm run api:dev`)
2. Check `EXPO_PUBLIC_API_BASE_URL` in `.env`
3. For local API, use `http://localhost:3009` (not Render URL)

### Xcode: "A build only device cannot be used to run this target"

The toolbar destination is **Any iOS Device (arm64)** — that cannot run the app.

**Fix:** pick a named simulator (e.g. **iPhone 17**) in the toolbar, not "Any iOS Device".

**Easier fix:** skip Xcode and use `npx expo run:ios` instead.

### Xcode: "Signing requires a development team"

1. **Xcode → Settings → Accounts** → add Apple ID
2. Open `ios/Circuit.xcworkspace` → **Circuit** target → **Signing & Capabilities**
3. Enable **Automatically manage signing** → select **Personal Team**

If bundle ID conflicts, change it locally to e.g. `com.yourname.circuit` (only affects your machine).

### Xcode: simulators exist but Run still fails

1. Open **Simulator** app first and boot a device
2. Open **`Circuit.xcworkspace`** (not `.xcodeproj`)
3. Select the **booted** simulator by name in the toolbar
4. Press Run (▶)

Or use `npx expo run:ios` and avoid Xcode entirely.

### Build failed: `Operation not permitted` or `realpath: illegal option -- m`

macOS + Xcode blocks CocoaPods scripts. Fix in three commands:

```bash
brew install coreutils
cd apps/mobile
npm run ios:fix
cd ios && pod install && cd ..
npx expo run:ios
```

`ios:fix` disables User Script Sandboxing and configures GNU `realpath` for CocoaPods.

When building from Xcode, Metro must be running (`npx expo start --dev-client --localhost`).

---

## Xcode (optional)

Only needed for native debugging or signing issues. For everyday JS work, use `npx expo run:ios` + Metro.

```bash
open ios/Circuit.xcworkspace   # only works after expo run:ios
```

Metro must be running: `npx expo start --dev-client --localhost`

---

## EAS cloud builds

Set `EXPO_PUBLIC_*` in [EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) — not in `eas.json`.

```bash
eas build --profile preview
eas build --profile production
```

Env details: [../../docs/ENVIRONMENT.md](../../docs/ENVIRONMENT.md)
