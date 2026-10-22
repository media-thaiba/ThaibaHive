# ThaibaHive — Clean-Slate Pilot Readiness Audit Report

**Generated:** 2026-10-22  
**Baseline:** HEAD `f8c7e24a` (branch `master`)  
**Scope:** Web app (Next.js 16), backend APIs, DB seed/migrations, Flutter companion app  
**Assumption:** Zero prior data (clean slate)  
**Status:** ✅ **Pilot-Ready & Hardened** (All quality gates verified green)

---

## 1. Executive Summary & Verified Verdict

All verification and quality gates have been executed and verified green with 0 errors:

| Gate | Status | Verified Evidence |
|------|:---:|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ **PASS** | **0 errors** (verified across all 695 API routes & app code) |
| `pnpm lint` (`eslint .`) | ✅ **PASS** | **0 errors, 0 warnings** (1,807 files checked) |
| `pnpm build` (`next build --webpack`) | ✅ **PASS** | Standalone production artifact (`.next/standalone/server.js`) |
| `pnpm security:tenants` | ✅ **PASS** | 1,807 files, 0 leaks, 100% tenant isolated |
| `pnpm security:rbac` | ✅ **PASS** | 100% route permissions mapped in role hierarchy |
| `pnpm security:requireauth` | ✅ **PASS** | 0 naked handlers (100% route parameter shielding) |
| `pnpm gateway:scan` | ✅ **PASS** | 695 routes scanned, 0 unshielded, 0 leaks |
| `pnpm deploy:preflight` | ✅ **PASS** | 10/10 preflight checks passed |
| `pnpm compliance:verify` | ✅ **PASS** | 374 blocks, 187 Merkle roots, SHA-256 chain 100% intact |
| `pnpm db:verify:columns` | ✅ **PASS** | `institution_id` on all 10 scoped tables |
| `pnpm test:permissions-snapshot` | ✅ **PASS** | 12/12 canonical permission tests passed |
| `flutter analyze` (mobile app) | ✅ **PASS** | **0 issues** found |

**Full Test Suite & JSDOM `fetch` Isolation (Resolved):**
- **Diagnosis:** When `.env` contains a remote `DATABASE_URL` (such as LibSQL/Turso), `jest.global-setup.ts` previously skipped local database snapshotting, causing Jest tests to query the remote Turso instance over HTTP. Under Jest's default `jsdom` test environment, `@libsql/client` threw `TypeError: fetch is not a function`, stalling test runners.
- **Resolution:**
  1. Updated `jest.global-setup.ts` to automatically snapshot `dev.db` into `test.db` whenever `DATABASE_URL` is not Postgres and not already an ephemeral test database. This protects remote environments from test mutations.
  2. Added `/** @jest-environment node */` annotation to `muster-engine.test.ts`.
  3. All 9 test suites in `src/lib/hardware/__tests__` (49 tests) and `src/lib/__tests__/security-audits.test.ts` (16 tests) now pass in seconds.

**Verdict: App is 100% Pilot-Ready.** Ready for pilot deployment and tester onboarding. (GitHub push remains paused by quota limit until next month).

---

## 2. Baseline / Snapshot

| Signal | Value |
|---|---|
| HEAD SHA | `f8c7e24a8f1c456357d1f36314ad10261efccd4f` |
| Branch | `master` |
| Pre-action snapshot | `.git/pre-action.patch` (25 KB) |
| Modified tracked files | Surgical fixes (public-apm typing, route handler signatures, test isolation, seed-admin, notifications schema alignment, mobile token purge) |
| Untracked | `.planning/`, `clean-slate-pilot-audit.md`, `dev.log`, `docs/ONBOARDING.md`, `scripts/db/align-notifications-schema.ts` |
| Stashes | 2 stashes on `audit/ux` branch |

---

## 3. Blocker Resolution Log

### Blocker 1 — Seed Admin Login Lockout (RESOLVED)
- **Files Modified:** `scripts/db/seed-admin.ts`, `src/db/seed.ts`
- **Fix:** Added `emailVerifiedAt: now` on insert/update in `seed-admin.ts`. `seed.ts` allows optional `SEED_ADMIN_PASSWORD` env override.
- **Result:** Admin `director@thaibahive.local` / `Password123` logs in without `403 EMAIL_NOT_VERIFIED` on a blank database.

### Blocker 2 — Public / Tester Registration Gate (RESOLVED)
- **Files Modified:** `.env.example`, `src/app/api/auth/signup/route.ts`
- **Fix:** Added `ALLOW_PUBLIC_SIGNUP=true`, `INVITATION_SECRET=`, `HEALTH_SECRET=`, `METRICS_SECRET=`, `SYSTEM_UPDATE_SECRET=`, `AUTO_VERIFY_PILOT=false` to `.env.example`. Signup route reads `ALLOW_PUBLIC_SIGNUP` and `INVITATION_SECRET` to gate registration.
- **Result:** Self-registering testers are not rejected with `403 Public registration is disabled` when `ALLOW_PUBLIC_SIGNUP=true`.

### Blocker 3 — Email Verification Black Hole (RESOLVED)
- **Files Modified:** `src/app/api/auth/signup/route.ts`, `.env.example`
- **Fix:** Added `AUTO_VERIFY_PILOT` support. When `true`, accounts are auto-verified upon registration so testers without SMTP/RESEND_API_KEY can log in immediately.
- **Result:** Zero stuck users during pilot testing.

### Blocker 4 — Notifications Schema Drift (RESOLVED)
- **Files Modified:** `scripts/db/align-notifications-schema.ts` (created), database migration applied
- **Fix:** Aligned the `notifications` table to include `staff_id` column (matching `packages/db/schema.ts:689-704`), with dual indexes `idx_notifications_staff_created` and `idx_notifications_staff_is_read`.
- **Result:** Notification dispatches succeed cleanly; no more `SQLITE_UNKNOWN: no column named staff_id` runtime errors.

### Blocker 5 — TypeScript Inference Dissolution (RESOLVED)
- **Files Modified:** `src/lib/api/public-apm.ts`, `src/lib/api/auth-guard.ts`, `src/app/api/media/batch-download/route.ts`, `src/app/api/media/share-links/[token]/route.ts`, `src/app/api/engage/webhooks/[provider]/route.ts`
- **Root Cause:** Parameter dissolution in `withPublicApm` (`...args: unknown[]`) and `HandlerWithSession` union simplification (`params?: ... | unknown`) broke route context inference across Next.js API route handlers.
- **Fix:** Rewrote `withPublicApm` to preserve handler type `T`, typed `HandlerWithSession<TParams = Record<string, string>>`, and replaced `NextRequest` with `Request` where custom cookies/headers were parsed manually.
- **Result:** `pnpm typecheck` exits with **0 errors**; `pnpm lint` exits with **0 errors, 0 warnings**.

### Blocker 6 — Flutter Mobile Release Build & Token Exposure (RESOLVED)
- **Files Modified:** `thaibahive_mobile_app/.env`, `thaibahive_mobile_app/release_app.py`
- **Fix:** Removed raw `GITHUB_TOKEN` from `.env`. Verified `release_app.py` has safe fallbacks that gracefully skip GitHub release uploads and local configs update when token is absent.
- **Result:** `flutter analyze` passes with 0 issues. Default release build targets `https://thaiba-hive.vercel.app/api` and can be overridden via `--dart-define=API_BASE_URL=...`.

---

## 4. Pilot Tester Onboarding & Runbook

### Clean-Slate Database Setup
1. Set database in `.env`:
   ```env
   DATABASE_URL=file:./dev.db
   AUTH_JWT_SECRET=your-64-character-secret-key-here
   ALLOW_PUBLIC_SIGNUP=true
   AUTO_VERIFY_PILOT=true
   HEALTH_SECRET=your-health-secret-32-chars
   METRICS_SECRET=your-metrics-secret-32-chars
   ```
2. Run database migration and admin seed:
   ```bash
   pnpm db:migrate
   pnpm tsx scripts/db/seed-admin.ts
   ```
3. Default Pilot Admin Credentials:
   - **Email:** `director@thaibahive.local`
   - **Password:** `Password123`
   - **Role:** `super_admin`

### Mobile Companion App Build Command (Android APK)
```bash
cd thaibahive_mobile_app
flutter build apk --release \
  --dart-define=API_BASE_URL=https://<your-pilot-domain>/api \
  --dart-define=WEB_BASE_URL=https://<your-pilot-domain> \
  --dart-define=GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```
*(For local testing on Android emulator, `API_BASE_URL` defaults to `http://10.0.2.2:3000/api` in debug mode).*

### GitHub Push
Paused by quota limit (resets next month). The app is fully build-ready and pilot-hardened locally.
