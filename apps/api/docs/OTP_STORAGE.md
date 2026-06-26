# OTP storage — single table policy

## Current state (canonical)

All OTP lifecycle logic — issue, cooldown, attempts, expiry, verify, consume, cleanup —
runs through **one Prisma model** and **one service**:

| Layer | Location | Role |
| ----- | -------- | ---- |
| Schema | `AuthOtp` in `prisma/schema.prisma` | Single table for phone + email |
| Store helpers | `src/modules/auth/auth-otp.store.ts` | Active/consumed query shapes |
| Service | `src/modules/auth/otp.service.ts` | Issue + verify for every channel/purpose |
| Delivery | `src/modules/auth/providers/*` | Send only (Resend, MSG91, MOCK) — **not** storage |

`AuthOtp` rows are keyed by:

- `channel` — `PHONE` | `EMAIL`
- `target` — E.164 phone or normalized email
- `purpose` — `SIGNUP` | `LOGIN` | `VERIFY_EMAIL` | `PASSWORD_RESET`
- `codeHash`, `attempts`, `expiresAt`, `consumedAt`

The legacy `EmailOtp` / `email_otps` table was **dropped** in migration
`20260624120000_drop_email_otps`. Do not reintroduce a second OTP table or parallel
service.

## Do not add

- A new `EmailOtp` (or `PhoneOtp`) Prisma model
- Channel-specific OTP services (`email-otp.service.ts`, `phone-otp.service.ts`, etc.)
- Direct `prisma.authOtp` reads/writes outside `otp.service.ts` or `auth-otp.store.ts`
  without a documented reason (prefer extending the store helpers)

Delivery providers (`ResendEmailOtpProvider`, future MSG91 adapter) send codes only;
they must never persist OTP rows.

## Legacy columns (cleanup TODO)

`AuthOtp` still carries backward-compatible columns:

- `phone` — mirror of `target` for old phone rows; stop writing in a future migration
- `consumed` — boolean flag; prefer `consumedAt IS NOT NULL`

**TODO (follow-up migration, not required for feature work):**

1. Stop writing `phone` and `consumed`; use `target` + `consumedAt` only
2. Drop `phone` and `consumed` columns after all readers are updated
3. Route any remaining direct `prisma.authOtp` calls in `auth.routes.ts` through
   `auth-otp.store.ts` helpers

## Adding OTP features

When extending OTP behavior (new purpose, audit trail, cleanup job):

1. Extend `OtpPurpose` enum if needed
2. Add logic to `otp.service.ts` (or extract shared helpers beside it)
3. Extend `auth-otp.store.ts` for new query shapes
4. Add delivery adapter under `providers/` if a new send channel is needed
5. Update tests in `tests/auth/otp.service.test.ts` only — not a separate email/phone suite

**Account deletion:** `DELETE /auth/me` removes `AuthOtp` rows by `userId` and by
`channel`+`target` for the user's email/phone (rows often have `userId=null`).
Helpers: `authOtpDeleteByEmailTargetWhere`, `authOtpDeleteByPhoneTargetWhere`.

## Related docs

- [DATABASE.md § AuthOtp](./DATABASE.md#authotp)
- [ARCHITECTURE.md § Authentication](./ARCHITECTURE.md#4-authentication-flow-unified-otp)
