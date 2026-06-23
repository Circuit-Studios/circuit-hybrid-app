# Product Scope — Circuit v1 (minor release)

> **Status: DRAFT.** Circuit ships first as a **limited‑functionality v1**, then grows into
> the **full feature set** later. Product domain is **unchanged** (film‑production planning).
>
> - **Styling source:** the provided screenshots (orange/amber, light, glassmorphic) — a new
>   visual language for the app. See [`../mobile/docs/DESIGN-SYSTEM.md`](../mobile/docs/DESIGN-SYSTEM.md).
> - **Layout + content source:** the **PDF (pending)**. Do **not** copy the PDF's own styling.
> - Anything not yet confirmed by the PDF is marked **TBD**.

---

## 1. What Circuit is (unchanged)

A production‑planning app for **directors, producers, and crew**: create a film/series
project, plan the workspace (tasks, schedule), manage the team, and (in the full version)
run AI script analysis and cross‑project conflict detection.

Mobile‑first (Expo iOS/Android) on the existing Node/Express/Prisma/Postgres backend and AWS
infrastructure — all **reused as‑is**.

---

## 2. v1 strategy

Ship a **smaller, polished slice** now; keep the full architecture and database in place;
turn on the remaining modules in a later release. **No domain code is thrown away** — advanced
features are simply **not surfaced** in v1 (and may be feature‑flagged).

### v1 scope (confirmed; screen‑level details still TBD pending PDF)

| Module                          | v1          | Notes                                                             |
| ------------------------------- | ----------- | ----------------------------------------------------------------- |
| **1 — Onboarding & projects**   | ✅ In       | Phone OTP auth, create/join project, profile                      |
| **3 — Workspace**               | ✅ In       | Tasks board + Schedule + **Health Ring**                          |
| **4 — Team**                    | ✅ In       | Members + invite‑by‑phone (basic role scoping)                    |
| **5 — Conflict & alert engine** | ✅ In       | Cross‑project conflicts + alerts                                  |
| **2 — AI script intelligence**  | ⏳ Deferred | PDF upload + analysis → future release (the only deferred module) |
| AI row edits/overrides          | ⏳ Deferred | Depends on Module 2                                               |
| Spider mode / multi‑project     | ⏳ Deferred | Future                                                            |

> v1 includes everything **except AI script intelligence** (Module 2) and the features that
> depend on it. Per‑screen field lists/copy are still **TBD** until the PDF lands.

---

## 3. Always‑on foundations (v1 and beyond)

Auth (phone OTP + JWT), users/profile, realtime (Socket.IO), notifications (in‑app + Expo
push), storage (S3), config (Secrets Manager), logging (CloudWatch), and all CDK infra.

---

## 4. New visual language (v1)

v1 introduces the **orange/amber glassmorphic** look from the screenshots, replacing the prior
dark "stage black + gold" theme. This is a **mobile styling change only** — backend unaffected.
Details + tokens: [`../mobile/docs/DESIGN-SYSTEM.md`](../mobile/docs/DESIGN-SYSTEM.md).

---

## 5. Open questions (need PDF / product owner)

- Per‑screen layout, fields, and copy for the v1 screens. **TBD (from PDF)**
- v1 information architecture / navigation (the screenshots show a generic style example, not
  Circuit's IA). **TBD (from PDF)**
- App identifiers / store listing changes for the restyle (name stays "Circuit"?). **TBD**
- Feature‑flagging mechanism for the deferred AI module (build‑time vs runtime). **TBD**

---

## 6. Sources

- **Styling:** provided screenshots → [`../mobile/docs/DESIGN-SYSTEM.md`](../mobile/docs/DESIGN-SYSTEM.md).
- **Layout + content:** PDF — **pending**. Update this doc and resolve TBDs once received.
