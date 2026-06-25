# Mobile Architecture — Circuit v1

> **Status: DRAFT — Circuit v1 (minor release).** Same app (film‑production planning), shipping
> a **limited‑functionality v1** with a **new visual language** (see [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)).
> The existing screens/stack are **kept**; v1 ships a **subset** and **restyles** it. Deferred
> screens (AI script analysis) stay in the codebase but aren't shipped in v1. The exact v1 screen
> list + navigation come from the **PDF (pending)** — items needing it are **TBD**.

> **Stack (reused):** Expo SDK 52 · React Native 0.76 · expo‑router · React Query · Axios ·
> Socket.IO client · react‑native‑reanimated · Secure Store. Dev client (not Expo Go).

---

## 1. Navigation (expo‑router) — existing structure

```text
app/
├── _layout.tsx                     # providers: Query, Auth, Realtime, theme, safe-area
├── index.tsx                       # gate → auth vs app
├── (auth)/                         # sign-in / sign-up + OTP               [v1 ✅ restyle]
│   ├── auth.tsx                    # unified AuthScreen (sign-in / sign-up tabs)
│   ├── otp.tsx
│   └── forgot-password.tsx
└── (app)/
    ├── _layout.tsx                 # app shell / tabs
    ├── projects.tsx                # project list                          [v1 ✅ restyle]
    ├── create-project.tsx          # new project                           [v1 ✅ restyle]
    ├── notifications.tsx           # in-app notifications                  [v1 ✅ restyle]
    ├── account.tsx                 # profile / settings                    [v1 ✅ restyle]
    └── project/[id]/
        ├── _layout.tsx             # project workspace shell
        ├── index.tsx               # workspace overview + Health Ring      [v1 ✅ restyle]
        ├── tasks.tsx               # tasks board                           [v1 ✅ restyle]
        ├── schedule.tsx            # schedule                              [v1 ✅ restyle]
        ├── team.tsx                # members / invites (basic)             [v1 ✅ restyle]
        ├── upload-script.tsx       # AI: upload script                     [⏳ deferred]
        ├── ai-progress.tsx         # AI: analysis progress                 [⏳ deferred]
        └── ai-results.tsx          # AI: results review                    [⏳ deferred]
```

> v1 = onboarding + projects + workspace (tasks/schedule/Health Ring) + conflict & alerts +
> team (basic) + account/notifications. Only the AI script screens (`upload-script`,
> `ai-progress`, `ai-results`) are **kept but not shipped** in v1 (gated behind a feature flag —
> mechanism TBD). Per‑screen detail comes from the PDF.

---

## 2. Theming / restyle (the main v1 mobile change)

- Replace `src/theme/tokens.ts` with the **orange/amber glass** palette from
  [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md). Keep `theme/index.ts` export shape stable so screens
  don't churn.
- Add `expo-linear-gradient` for gradient surfaces (hero/cards/FAB‑style accents).
- Re‑theme shared primitives (`Card`, `PrimaryButton`, inputs, tab bar) to the glass look.
- Update `app.json` `splash.backgroundColor`, notification `color`, and icons to the new palette.
  Product `name`/`slug`/`bundleIdentifier` stay **Circuit** unless told otherwise — **TBD**.

> The screenshots are a **style reference** (colors, glass pills, rounded geometry, gradient).
> Their content (Good Morning / Water / Sleep / streak / gauge) is **not** Circuit's content —
> Circuit keeps its own screens; only the **look** is adopted.

---

## 3. Data layer (reused)

- **React Query** for server state; keys are centralized in `src/api/queryKeys.ts` as the `qk` factory.
- **Axios** client (`src/api/client.ts`) with JWT from Secure Store.
- **Realtime:** `RealtimeProvider` maps Socket.IO topics → query invalidations via `qk`.
- AI‑related query keys/topics exist but are **not used** in v1 (deferred).

---

## 4. Module structure (scaling)

Separate **navigation**, **features**, **API**, and **UI** so screens stay thin and modules reuse cleanly:

```text
src/
  config/
    appEnv.ts                 # EXPO_PUBLIC_* runtime config

  api/                        # HTTP only — no UI
    client.ts
    queryKeys.ts
    auth.ts
    projects.ts
    workspace.ts
    scripts.ts
    notifications.ts
    types.ts

  features/                   # Business UI + hooks per domain
    auth/
      AuthScreen.tsx
      AuthSignupStickyFooter.tsx
      SignupFormFields.tsx
      OtpForm.tsx
      getAuthLayoutMetrics.ts
      hooks.ts
    projects/
      hooks.ts
      ProjectCard.tsx
      ProjectList.tsx
      CreateProjectSheet.tsx
    tasks/
      hooks.ts
      TaskSheet.tsx
    schedule/
      hooks.ts
      ShootDaySheet.tsx
    team/
      hooks.ts
      InviteMemberSheet.tsx
    scripts/
      hooks.ts
      UploadScriptScreen.tsx    # TODO
      AnalysisProgress.tsx      # TODO
      AnalysisResults.tsx       # TODO

  components/
    ui/                         # Generic visual primitives
      Button.tsx
      TextField.tsx
      FormSheet.tsx
      EmptyState.tsx
      ErrorState.tsx
      LoadingState.tsx
    project/                    # Project-scoped chrome
      ProjectScreenScaffold.tsx
      ProjectTabBar.tsx

  auth/                         # Global auth state (not feature UI)
    AuthContext.tsx
    OtpSessionContext.tsx

  realtime/
    RealtimeProvider.tsx
    socket.ts
    push.ts

  lib/
    phone.ts
    session.ts
    storage.ts
```

**Rules:**

| Layer                      | Responsibility                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| `app/` routes              | Navigation + screen composition only (re-export feature screens) |
| `src/features/*`           | Reusable business UI, forms, hooks                               |
| `src/api/*`                | HTTP clients and shared types — no React                         |
| `src/components/ui/*`      | Generic buttons, inputs, empty/error/loading states              |
| `src/components/project/*` | Project workspace chrome (tab bar, scaffold)                     |

**Migration status:** auth, projects list, and form sheets (`TaskSheet`, `ShootDaySheet`, `InviteMemberSheet`, `CreateProjectSheet`) extracted; `qk` query key factory and `components/ui/` in place; task board / schedule timeline / team list UI still in route files — move incrementally.

---

## 5. v1 screens

| Screen                                     | v1          | Content source                    |
| ------------------------------------------ | ----------- | --------------------------------- |
| Welcome / Login / Signup / OTP             | ✅          | existing flow, restyled           |
| Projects list                              | ✅          | existing, restyled                |
| Create project                             | ✅          | existing, restyled                |
| Project workspace (overview + Health Ring) | ✅          | existing, restyled                |
| Tasks board                                | ✅          | existing, restyled                |
| Schedule                                   | ✅          | existing, restyled                |
| Conflict / alerts (in‑app + notifications) | ✅          | Module 5, restyled                |
| Team (members/invite)                      | ✅ basic    | existing; advanced roles deferred |
| Notifications                              | ✅          | existing, restyled                |
| Account / settings                         | ✅          | existing, restyled                |
| Upload script / AI progress / AI results   | ⏳ deferred | kept, not shipped in v1           |

Per‑screen field lists and copy follow the **PDF** — **TBD**.

---

## 6. Open items

- Per‑screen layout/fields/copy + final navigation (from PDF). **TBD**
- Feature‑flag mechanism for deferred AI screens (build vs runtime). **TBD**
- Exact design tokens (confirm with designer). **TBD**
