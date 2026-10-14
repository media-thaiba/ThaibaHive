# Email Verification on Signup

**Status:** Implemented (2026-10-14)
**Scope:** Invitation / public self-signups start unverified and are hard-blocked at login until they click an emailed verification link. Admin-provisioned accounts and federated (SSO) logins are treated as already verified.

## Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Enforcement | Hard block: `login` returns `403` + `code: "EMAIL_NOT_VERIFIED"` | Unverified accounts can't be used as a backdoor into the tenant |
| Scope | Self-signups only | Admin-provisioned staff are vouched by an operator; SSO IdPs already proved email ownership |
| Token | 32 random bytes, emailed once, stored as SHA-256 hash | Matches password-reset convention; DB never holds the raw token |
| Expiry | 24 hours, single-use (`used_at` stamp) | Longer than reset (1h) because users check inboxes less predictably at signup |
| Enumeration | Resend endpoint always returns `success: true` | Mirrors `forgot-password`; unknown / inactive / already-verified emails are no-ops with dummy timing |
| Existing users | Migration backfills `email_verified_at = created_at` | Legacy accounts aren't locked out on deploy |
| Dev without `RESEND_API_KEY` | Log verify URL to server logger, still return success | Local/E2E flows stay usable |

## Data Model

`staff.email_verified_at` (nullable `text`) plus `email_verification_tokens`
(`id`, `staff_id` FK cascade, `token_hash` unique, `expires_at`, `used_at`,
`created_at`). Generated migrations: SQLite `drizzle/0039_real_millenium_guard.sql`,
Postgres `drizzle/postgres/0023_thin_karma.sql` (both include the backfill `UPDATE`).

## Endpoints

- `POST /api/auth/verify-email/[token]` — atomically consumes the token (`UPDATE … WHERE used_at IS NULL AND expires_at > now RETURNING`), then stamps `staff.email_verified_at`. Invalid/expired/reused → `400`.
- `POST /api/auth/verify-email/resend` — rate-limited (`authVerifyResend`, 3/min), re-issues a token, sends mail. Always `200 { success: true }`.
- `POST /api/auth/signup` — creates the user unverified, inserts a token, emails the link, returns `201` with a "check your email" message and **no session**.
- `POST /api/auth/login` — after password check, `!emailVerifiedAt` → `403 EMAIL_NOT_VERIFIED`.

## Touched Paths

- `src/lib/email.ts` — `sendVerificationEmail` + HTML template.
- `src/lib/api/rate-limit.ts` — `authVerifyResend` bucket.
- `src/app/api/auth/{signup,login,google}/route.ts`, `src/lib/auth/federated-user-mapper.ts` (OIDC/SAML JIT) — verification state transitions.
- `src/app/api/staff/route.ts`, `src/db/seed.ts`, `e2e/global-setup.ts` — provision verified.
- UI: `src/app/auth/verify-email/[token]/page.tsx`, `login/_components/login-form.tsx` (unverified notice + resend button, signup success state), `contexts/AuthContext.tsx` (no redirect after signup; attaches `code` to login errors).

## Verification

- 3 new suites (verify token, resend, login block) + updated `signup-gating.test.ts`.
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec jest --silent` → 844 suites / 5357 tests passing.

## Remaining Before Ship

- Re-run Playwright E2E (login/signup flows changed; global-setup now stamps `email_verified_at`).
- Postgres CI will apply `0023_thin_karma.sql` on next run; confirm the backfill executes.
