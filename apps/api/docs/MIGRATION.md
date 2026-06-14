# v1 Scope & Deferred Features

> **Status: DRAFT.** This is **not** a rewrite or domain change. Circuit stays Circuit
> (film‑production planning). v1 is a **minor release with limited functionality**; the rest of
> the existing modules are **deferred**, not deleted. See [PRODUCT.md](./PRODUCT.md).

---

## Principle: keep everything, surface a subset

- **Keep** the full backend (controllers, services, Prisma schema, queues, AI pipeline,
  realtime, notifications) and all AWS/CDK infra **intact**.
- **v1 surfaces** only the agreed subset of modules (proposed in PRODUCT.md §2 — confirm vs PDF).
- **Deferred modules** stay in the codebase but are **not exposed** in v1 (route not mounted,
  screen not shipped, or behind a feature flag).
- **Future release** flips deferred features on — no re‑architecture required.

---

## Backend

| Area | v1 action |
|---|---|
| Auth / users / profile | Keep, ship |
| Projects (create/join) | Keep, ship |
| Workspace: tasks, schedule, Health Ring | Keep, ship (subset of fields if PDF narrows them — TBD) |
| Team / invites | Keep, ship (basic role scoping) |
| Conflict & alert engine (Module 5) | Keep, ship |
| AI script intelligence (Module 2) | **Keep code; do not mount v1 routes** (only deferred module) |
| AI row edits/overrides | **Keep code; deferred** (depends on Module 2) |
| Realtime / notifications / storage | Keep, ship (shared foundations) |
| Infra (CDK), Secrets, CloudWatch | Keep, ship as‑is |

**No tables dropped.** The Prisma schema is unchanged; v1 just doesn't write to the tables that
back deferred features.

### Feature‑flagging (TBD)

Pick one once confirmed:
- **Build/config flag** (e.g. `CIRCUIT_V1=true`) that skips mounting deferred routers, **or**
- **Runtime flag** stored in config (Secrets Manager) for toggling without redeploy.

---

## Mobile

| Area | v1 action |
|---|---|
| Auth / onboarding screens | Keep, restyle to new visual language |
| Project list / create | Keep, restyle |
| Workspace (tasks, schedule) | Keep subset, restyle |
| Team screen | Keep basic, restyle |
| Workspace Health Ring | Keep, ship, restyle |
| Conflict / alerts screens | Keep, ship, restyle |
| AI script analysis screens | **Hide / don't ship in v1** (only deferred area) |
| Theme / design tokens | **Replace** dark theme with orange/glass tokens (see DESIGN-SYSTEM.md) |

The exact v1 screen list and navigation come from the **PDF (pending)** — **TBD**.

---

## Sequencing (proposed)

1. ✅ v1 modules confirmed: 1, 3 (incl. Health Ring), 4, 5 in; **Module 2 (AI) deferred**.
2. Resolve per‑screen layout/content TBDs against the PDF.
3. Land the new mobile design tokens/theme (visual restyle only).
4. Add the v1 feature flag; gate the deferred AI routers/screens behind it.
5. Restyle and ship the v1 screens; QA the limited flow end‑to‑end.
6. Future release: flip the AI module on, restyle its screens.

---

## Risk notes

- Don't delete deferred code — it's the foundation for the full release.
- Keep DB migrations forward‑only; deferred tables remain in the schema.
- Confirm the v1 list before hiding anything, so we don't cut a screen the PDF includes.
