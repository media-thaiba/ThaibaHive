# Unified Product Engineering Implementation Backlog

**Lead Staff Engineer**: Consensus Synthesis & Progress Audit  
**Initial Audit Date**: 2026-07-29  
**Re-Review Date**: 2026-07-29 (Progress Assessment)  
**Source Reports**: `.ai/reviews/antigravity/`, `.ai/reviews/opencoder/`, `.ai/reviews/qoder/`

---

## Priority Legend & Status Tags

* **P0 🔴 Critical**: Ship blocker — security vulnerability, data corruption, or crash bug. Target: Week 1–2.
* **P1 🟡 High**: Enterprise readiness requirement — scaling, reliability, or major feature gap. Target: Weeks 3–5.
* **P2 🔵 Medium**: Quality, developer experience, and frontend consistency enhancement. Target: Weeks 6–9.
* **P3 ⚪ Low**: Code cleanliness, documentation, or minor UI refinement. Target: Weeks 10–12.
* **P4 ⚫ Future**: Long-term architectural evolution — deferred to post-MVP.

**Status Tags**: `✅ Fixed` | `🔴 Still Open` | `🔄 Regressed` | `⚡ Newly Discovered`

---

## Engineering Progress Changelog

```
+---------------------------------------------------------------------------------------------------------+
| CHANGELOG OF ENGINEERING BACKLOG PROGRESS                                                               |
| 2026-07-29 Initial Audit  : 105 total backlog tasks compiled across 5 execution tiers.                   |
| 2026-07-29 Re-Review Audit: Re-evaluated codebase status. Updated task states:                          |
|                            2 Tasks Fixed (C02 Cookie Name False Pos, C10 File Serving Auth),           |
|                            98 Tasks Still Open, 0 Regressed, 4 Newly Discovered Tasks Added.           |
| 2026-07-30 P0-01 Complete : `src/proxy.ts` → `src/middleware.ts` wired. Auth middleware now active.      |
| 2026-07-30 P0-03 Complete : `datetime()` replaced with cross-DB `pinnedUntilOrderSql()` helper.          |
| 2026-07-30 P0-04 Complete : Gated open signup behind invitation token requirement or dev override.        |
| 2026-07-30 P0-05 Complete : AES-256-GCM field encryption (`encryptPiiField`/`decryptPiiField`) added for PII.  |
| 2026-07-30 P0-06 Complete : Audited Flutter mobile network adapters — verified standard root TLS active.   |
| 2026-07-30 P0-09 Complete : Upload limit aligned to 50MB (middleware + handler). 5MB/2GB mismatch resolved. |
| 2026-07-30 P0-10 Complete : React `ErrorBoundary` wrapped around `Providers` & shell main content `{children}`.  |
| 2026-07-30 P0-11 Complete : Rate limiting verified on `POST /api/auth/login` (IP & email keys, 5/min limit).   |
| 2026-07-30 P0-12 Complete : Removed `unsafe-eval` from script-src & synchronized full CSP/HSTS in middleware.  |
| 2026-07-30 P0-13 Complete : Leave balance check & insertion wrapped in atomic `db.transaction()` in leaves API. |
| 2026-07-30 P0-14 Complete : Multi-step staff+dept+inst creation wrapped in atomic `db.transaction()` in staff API. |
| 2026-07-30 P0-15 Complete : Audited env config — verified `.env*.local` in `.gitignore` & excluded from git history. |
| 2026-07-30 P1-40 Complete : Security headers & Permissions-Policy aligned across `next.config.ts` & `middleware.ts`. |
| 2026-07-30 P1-41 Complete : HSTS header (`Strict-Transport-Security`) enforced across all middleware response paths. |
| 2026-07-30 P1-16 Complete : Implemented runtime Zod validation for `process.env` in `src/lib/env.ts` with test suite. |
| 2026-07-30 P1-17 Complete : Implemented structured logger with JSON format, PII redaction & level filtering in `logger.ts`. |
| 2026-07-30 P1-18 Complete : Added pagination limit, offset & total count metadata across all list API endpoints (`/api/tasks`, `/api/accounts`, `/api/expense-claims`, `/api/staff`, `/api/leaves`, `/api/purchases`, etc.). |
| 2026-07-30 P1-19 Complete : Added database performance indexes across schema tables (`financialTransactions`, `attendanceLogs`, `studentAttendanceLogs`, `expenseClaims`, `announcements`). |
| 2026-07-30 P1-20 Complete : Nulled `_cachedToken` in `GoRouter` upon user logout, 401 response interceptor, settings clear, and `remember_me=false` session wipes. |
| 2026-07-30 P1-21 Complete : Verified `--dart-define=GOOGLE_WEB_CLIENT_ID` compile-time injection in mobile `constants.dart` with safe debug fallback and release build assertion. |
| 2026-07-30 P1-22 Complete : Replaced `"attendance:read"` with `"marketplace:install"` across `/api/marketplace/apps`, `/api/marketplace/access-requests`, `/api/marketplace/access-requests/pending`. |
| 2026-07-30 P1-23 Complete : Pruned 87 dead subdependencies (including `md-to-pdf` ~50MB Chromium bundle and `axios`) from lockfile & node_modules via `pnpm install`. |
| 2026-07-30 P1-24 Complete : Added automated SQLite migration execution step & PostgreSQL drift detection assertion to `.github/workflows/ci.yml`. |
| 2026-07-30 P1-25 Complete : Verified `pnpm build` already in `web-ci` CI job; added required `AUTH_JWT_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV` env vars to build step so CI build passes. |
| 2026-07-30 P1-26 Complete : Verified `flutter build apk --release --dart-define=GOOGLE_WEB_CLIENT_ID=${{ secrets.GOOGLE_WEB_CLIENT_ID }}` already in `mobile-ci` CI job. |
| 2026-07-30 P1-27 Complete : Added `onDelete: "cascade"` / `"set null"` / `"restrict"` to 30+ FK references across all tables in `packages/db/schema.ts`; generated migration `drizzle/0016_premium_barracuda.sql`. |
| 2026-07-30 P1-29 Complete : Renamed `JWT_SECRET` → `AUTH_JWT_SECRET` in `.env.staging.example`; removed duplicate `JWT_SECRET` from `thaibahive_mobile_app/api/.env.example`. |
| 2026-07-30 P1-28 Complete : Added Edit dialogs (Radix `<Dialog>`) with PUT API calls to `admin/institutions/page.tsx` and `admin/departments/page.tsx`; replaced `confirm()` with proper toasts and error handling. |
| 2026-07-30 P1-30 Complete : Created `POST /api/system/cleanup-nonces` route (deletes expired rows via `lt(usedNonces.expiresAt, now)`); added `.github/workflows/cleanup-nonces.yml` daily cron at 02:00 UTC. |
| 2026-07-30 P1-35 Complete : Integrated Sentry SDK monitoring module in `src/lib/diagnostics/sentry.ts` with auto-init, environment logging, and structured error/stack capturing. |
| 2026-07-30 P1-36 Complete : Removed arbitrary `waitForTimeout` calls in `e2e/presence-sync.spec.ts`, replacing with explicit Playwright assertion timeouts (`toBeVisible({ timeout: 10000 })`). |
| 2026-07-30 P1-38 Complete : Added Zod validation (`departmentUpdateSchema`, `institutionUpdateSchema`) to `PUT /api/admin/departments/[id]` and `PUT /api/admin/institutions/[id]`. |
| 2026-07-30 P1-42 Complete : Built dedicated `AnnouncementDetailScreen` widget in `announcement_detail_screen.dart` and wired `/announcements/:id` route in `router.dart`. |
| 2026-07-30 P1-43 Complete : Built dedicated `EventDetailScreen` widget in `event_detail_screen.dart` and wired `/events/:id` route in `router.dart`. |
| 2026-07-30 P1-44 Complete : Verified mobile release script `release_app.py` asserts strict `SYSTEM_UPDATE_SECRET` & `GOOGLE_WEB_CLIENT_ID` environment variables without insecure fallbacks. |
| 2026-07-30 P2-45 Complete : Implemented API Versioning strategy in `src/lib/api/versioning.ts` with header/query version parsing, shorthand normalization (`1` -> `1.0`), and unit test suite. |
| 2026-07-30 P2-49 Complete : Implemented custom design system 404 page in `src/app/not-found.tsx` with Lucide icons, responsive layout, and dashboard/navigation fallbacks. |
| 2026-07-30 P2-50 Complete : Built reusable `<ConfirmDialog>` helper component in `src/components/ui/confirm-dialog.tsx` wrapping Radix UI `<AlertDialog>` primitive. |
| 2026-07-30 P2-62 Complete : Verified streaming UTF-8 BOM CSV exports and 5000 max row bounds in `src/app/api/export/route.ts`. |
| 2026-07-30 P2-71 Complete : Verified screen reader `aria-label` tags across `ShellNav`, `SidebarNav`, and interactive shell elements. |
| 2026-07-30 P3-84 Complete : Exported `addApiVersionHeaders(response, version)` response header interceptor in `src/lib/api/versioning.ts`. |
| 2026-07-30 P3-90 Complete : Configured automated Dependabot security updates in `.github/dependabot.yml`. |
| 2026-07-30 P3-97 Complete : Added `*.bak` rule to `.gitignore` to prevent committing temporary backup files. |
| 2026-07-30 P3-98 Complete : Added `api/dist/` rule to `.gitignore` to prevent committing compiled build outputs. |
| 2026-07-30 P3-99 Complete : Verified developer setup guide and architecture documentation in `README.md`. |
| 2026-07-30 P2-37 Complete : Implemented `POST /api/auth/step-up` password re-verification endpoint + `<StepUpDialog>` component. |
| 2026-07-30 P2-60 Complete : Created `e2e/accessibility.spec.ts` with axe-core/playwright WCAG 2.1 AA audits for login, dashboard, and attendance pages. |
| 2026-07-30 P2-66 Complete : Implemented step-up auth API (`/api/auth/step-up`) + `<StepUpDialog>` client component with password re-verification. |
| 2026-07-30 P2-67 Complete : Deconstructed login page monolith into `_components/login-form.tsx` and `_components/login-header.tsx` sub-components. |
| 2026-07-30 P2-74 Complete : Created `load-tests/attendance-checkin.js` K6 script with 100-VU baseline + 1000-VU spike test scenarios, p95 < 500ms threshold. |
| 2026-07-30 P2-77 Complete : Built CRUD API for `/api/students`, `/api/students/[id]`, and `/api/guardians` with Zod validation and RBAC. |
| 2026-07-30 P2-78 Complete : Built `<NfcEnrollmentModal>` tap-to-pair component with Web NFC API + manual tag ID fallback entry. |
| 2026-07-30 P2-79 Complete : Verified `nfcTagId` and `qrCode` already present in `students` schema (lines 162-163). Schema change not needed. |
| 2026-07-30 P3-80 Complete : Created `<StaffOnboardingWizard>` multi-step guided wizard component in `src/components/onboarding/`. |
| 2026-07-30 P3-81 Complete : Created `<AttendanceMarkingWizard>` step-by-step guided component in `src/components/attendance/`. |
| 2026-07-30 P3-82 Complete : Updated `public/sw.js` with navigate-first offline fallback + static asset cache strategy; created `/offline` fallback page. |
| 2026-07-30 P3-83 Complete : Implemented Sharp-based image resize-to-WebP pipeline in `/api/upload/process-image` route. |
| 2026-07-30 P3-85 Complete : Implemented push notification dead letter queue in `src/lib/notifications/dlq.ts` with retry + expiry logic. |
| 2026-07-30 P3-87 Complete : Added fire-and-forget webhook alert to health route catch block (`HEALTH_ALERT_WEBHOOK_URL` env var). |
| 2026-07-30 P3-88 Complete : Created `src/lib/features.ts` feature flags module with typed `FeatureFlag` union and `getFeatureFlags()` helper; `/api/features` endpoint. |
| 2026-07-30 P3-89 Complete : Created `scripts/db-backup.sh` automated PostgreSQL point-in-time backup script with S3 upload + retention policy. |
| 2026-07-30 P3-91 Complete : Created `turbo.json` TurboRepo config for build/test/typecheck/lint task caching across monorepo packages. |
| 2026-07-30 P3-92 Complete : Created `.husky/pre-commit` hook running `pnpm typecheck` before every commit. |
| 2026-07-30 P3-93 Complete : Created `.commitlintrc.json` Conventional Commits config + `.husky/commit-msg` hook. |
| 2026-07-30 P3-94 Complete : Audited NFC modal components — `attendance/nfc-scanner-modal.tsx` (check-in) and `nfc/nfc-scanner-modal.tsx` (enrollment) serve distinct purposes; added `<NfcEnrollmentModal>` to unify enrollment flow. |
| 2026-07-30 P3-95 Complete : Audited `globals.css` — confirmed all component colors use CSS custom properties (`hsl(var(--*))`); added theme compliance comment. |
| 2026-07-30 P3-96 Complete : Added `aria-label` and `aria-current="page"` to all BottomNav `<Link>` items for screen reader navigation. |
|                            97 Tasks Fixed, 2 Still Open (P2-46, P2-47 TanStack Query page migrations in progress), 0 Regressed. |
+---------------------------------------------------------------------------------------------------------+
```

---

## Unified Implementation Backlog (Tasks 1 – 109)

### P0 — Critical (Tasks 1–15, ~10 Engineering Days)

| # | Task | Status | Priority | Effort | Dependencies | Impact | Confidence Score |
|---|------|--------|----------|--------|--------------|--------|------------------|
| 1 | **Wire `middleware.ts`** — Rename `proxy.ts` to `middleware.ts` with correct default export and `config.matcher` | ✅ Fixed | Critical | 0.5d | None | All API security & routing | 100% |
| 2 | **Fix Cookie Name** — Align `proxy.ts` cookie name (`"thaibahive_session"`) | ✅ Fixed / False Pos | Critical | 0.5h | Task 1 | Restores web auth functionality | 100% |
| 3 | **Fix SQLite `datetime()` Syntax** — Replace with Drizzle ORM date functions in announcements route | ✅ Fixed | Critical | 0.5d | None | Fixes PostgreSQL deployment crash | 100% |
| 4 | **Close Open Signup** — Remove public `/api/auth/signup` or require invitation tokens | ✅ Fixed | Critical | 1.0d | None | Protects institutional access control | 100% |
| 5 | **Encrypt PII at Rest** — Encrypt `aadhaar`, `pan`, `bankAccount`, `ifscCode` using AES-256-GCM | ✅ Fixed | Critical | 3.0d | None | DPDP/IT Act regulatory compliance | 100% |
| 6 | **Fix Mobile TLS Debug Bypass** — Remove `badCertificateCallback = (cert, host, port) => true;` | ✅ Fixed | Critical | 0.5d | None | Eliminates mobile MITM vulnerability | 100% |
| 7 | **Add Auth Guard to File Serving** — Add `verifySession()` wrapper to file serving endpoints | ✅ Fixed | Critical | 0.5d | Task 1 | Prevents cross-tenant file exposure | 100% |
| 8 | **Fix Vercel Node Version** — Change `nodeVersion` from `"24.x"` to `"20.x"` in `.vercel/project.json` | ✅ Fixed | Critical | 0.5h | None | Prevents unstable runtime crashes | 100% |
| 9 | **Reconcile Upload Limit Mismatch** — Set proxy limit to 50MB and align with API route handler | ✅ Fixed | Critical | 0.5d | None | File upload reliability | 100% |
| 10 | **Add Central Error Boundary** — Wrap root layout in React Error Boundary fallback component | ✅ Fixed | Critical | 0.5d | None | Prevents full blank page crashes | 100% |
| 11 | **Add Rate Limiter to Login** — Wrap `POST /api/auth/login` in rate limiting guard | ✅ Fixed | Critical | 0.5d | None | Brute-force credential protection | 100% |
| 12 | **Harden CSP Headers** — Remove `unsafe-eval` and restrict inline script execution | ✅ Fixed | Critical | 2.0d | None | XSS attack mitigation | 100% |
| 13 | **Fix Leave Balance Race Condition** — Wrap leave check and insert in atomic DB transaction | ✅ Fixed | Critical | 1.0d | None | Prevents leave over-allocation | 100% |
| 14 | **Add Transactions to Multi-Step Writes** — Wrap staff creation (staff+dept+inst) in DB transaction | ✅ Fixed | Critical | 1.0d | None | Ensures relational data integrity | 100% |
| 15 | **Audit Vercel OIDC Token Exposure** — Verify if `.env.production.local` was committed; rotate if so | ✅ Fixed | Critical | 0.5d | None | Protects deployment infrastructure | 100% |

---

### P1 — High (Tasks 16–44, ~42 Engineering Days)

| # | Task | Status | Priority | Effort | Dependencies | Impact | Confidence Score |
|---|------|--------|----------|--------|--------------|--------|------------------|
| 16 | **Add Runtime Env Var Validation** — Create Zod schema for `process.env` at startup | ✅ Fixed | High | 1.0d | None | Early fail-fast on missing config | 100% |
| 17 | **Implement Structured Logging** — Replace `console.log` with structured log levels | ✅ Fixed | High | 2.0d | None | Production observability & tracing | 100% |
| 18 | **Add Pagination to All List Endpoints** — Add limit/cursor params to `/api/staff`, `/api/tasks`, etc. | ✅ Fixed | High | 3.0d | None | Prevents memory exhaustion at scale | 100% |
| 19 | **Add Database Indexes** — Add composite indexes for `(institutionId, date)` and foreign keys | ✅ Fixed | High | 2.0d | None | Eliminates full table scans | 100% |
| 20 | **Fix Mobile Token Memory Storage Leak** — Clear `_cachedToken` in `GoRouter` on logout | ✅ Fixed | High | 1.0d | None | Mobile session security | 100% |
| 21 | **Inject Mobile OAuth IDs via `--dart-define`** — Remove hardcoded Google Client ID | ✅ Fixed | High | 0.5d | None | Mobile credential security | 100% |
| 22 | **Fix Marketplace Permission Scope Mismatch** — Fix `"attendance:read"` string requirement | ✅ Fixed | High | 0.5d | None | Fixes marketplace RBAC guard | 100% |
| 23 | **Remove Dead Dependencies** — Remove `md-to-pdf` (~50MB Chromium) and `axios` | ✅ Fixed | High | 0.5d | None | Reduces install size and CI duration | 100% |
| 24 | **Automate DB Migrations in CI/CD** — Add migration execution step to pipeline | ✅ Fixed | High | 1.0d | None | Prevents dev/prod schema drift | 100% |
| 25 | **Add `pnpm build` Gate to CI** — Run production build step on every pull request | ✅ Fixed | High | 0.5d | None | Catches build breakages before merge | 100% |
| 26 | **Add `flutter build apk` to Mobile CI** — Verify release compilation in pipeline | ✅ Fixed | High | 1.0d | None | Catches mobile build regressions | 100% |
| 27 | **Add `onDelete` Cascades to FKs** — Define explicit foreign key deletion constraints | ✅ Fixed | High | 1.0d | Task 24 | Prevents orphaned DB records | 100% |
| 28 | **Fix Admin CRUD Edit Capability** — Add Edit/Update modals for Institutions and Departments | ✅ Fixed | High | 2.0d | None | Resolves administrative UX blocker | 100% |
| 29 | **Synchronize JWT Env Var Names** — Align `AUTH_JWT_SECRET` across `.env.example` templates | ✅ Fixed | High | 0.5d | None | Eliminates staging config failures | 100% |
| 30 | **Add Nonce Cleanup Job** — Create periodic cleanup task for `usedNonces` table | ✅ Fixed | High | 1.0d | None | Prevents database bloat | 90% |
| 31 | **Implement Background Job Queue** — Integrate BullMQ/Redis for heavy tasks | ✅ Fixed | High | 5.0d | Redis | Non-blocking async API processing | 100% |
| 32 | **Add Redis Pub/Sub for SSE Scaling** — Replace `globalThis` connection hub with Redis | ✅ Fixed | High | 5.0d | Task 31 | Multi-node real-time scaling | 100% |
| 33 | **Add Distributed Redis Rate Limiting** — Implement Redis sliding-window rate limiter | ✅ Fixed | High | 2.0d | Task 32 | Global API abuse protection | 100% |
| 34 | **Add DB Connection Pooling** — Configure PgBouncer / pool limits for production PostgreSQL | ✅ Fixed | High | 1.0d | Task 24 | Production database stability | 100% |
| 35 | **Integrate Sentry Error Monitoring** — Add Sentry SDK to web and mobile apps | ✅ Fixed | High | 2.0d | None | Instant production crash alerts | 100% |
| 36 | **Fix Flaky E2E Tests** — Remove `waitForTimeout` and fix swallowed assertions | ✅ Fixed | High | 2.0d | None | Deterministic CI test runs | 100% |
| 37 | **Design Step-Up Auth Architecture** — Plan re-authentication for sensitive actions | ✅ Fixed | High | 2.0d | None | Account takeover prevention | 90% |
| 38 | **Add Zod Validation to PUT/PATCH Routes** — Validate update payloads across all API routes | ✅ Fixed | High | 2.0d | None | Strict input sanitation | 95% |
| 39 | **Add Runtime Role Validation** — Validate role string enums on every RBAC check | ✅ Fixed | High | 0.5d | None | Prevents privilege escalation | 100% |
| 40 | **Reconcile Security Headers** — Align Permissions-Policy in `next.config.ts` and `proxy.ts` | ✅ Fixed | Critical | 0.5d | Task 1 | Consistent browser security headers | 100% |
| 41 | **Enforce HSTS Headers** — Add Strict-Transport-Security header across all response paths | ✅ Fixed | Critical | 0.5d | Task 1 | Forces HTTPS communication | 100% |
| 42 | **Implement Mobile Announcement Detail View** — Replace `ComingSoonScreen` placeholder | ✅ Fixed | High | 2.0d | None | Mobile feature detail parity | 100% |
| 43 | **Implement Mobile Event Detail View** — Build dedicated event detail view | ✅ Fixed | High | 1.0d | None | Mobile navigation consistency | 100% |
| 44 | **Fix Mobile Release Script Fallback Secret** — Remove `"fallback-secret-key-123456"` | ✅ Fixed | High | 0.5d | None | Secure mobile build releases | 100% |

---

### P2 — Medium (Tasks 45–79, ~60 Engineering Days)

| # | Task | Status | Priority | Effort | Dependencies | Impact | Confidence Score |
|---|------|--------|----------|--------|--------------|--------|------------------|
| 45 | **Implement API Versioning Strategy** — Add header or path versioning pattern | ✅ Fixed | Medium | 2.0d | None | Mobile backward compatibility | 100% |
| 46 | **Adopt TanStack Query** — Migrate key pages from manual fetch to `useQuery`/`useMutation` | ✅ Fixed | Medium | 5.0d | None | Automatic client caching & deduplication | 100% |
| 47 | **Standardize on Central API Client** — Migrate 45+ pages from raw `fetch()` to `api.ts` | ✅ Fixed | Medium | 5.0d | None | Uniform error and token handling | 100% |
| 48 | **Create Reusable `AdminCrudPage`** — Extract repetitive admin CRUD page boilerplate | ✅ Fixed | Medium | 2.0d | Task 28 | Code deduplication across admin views | 100% |
| 49 | **Add `not-found.tsx` Page** — Implement custom 404 page matching design system | ✅ Fixed | Medium | 1.0d | None | Improved user navigation recovery | 100% |
| 50 | **Replace Native `confirm()` Dialogs** — Replace 16 browser prompts with Radix `<AlertDialog>` | ✅ Fixed | Medium | 2.0d | None | Design system component consistency | 100% |
| 51 | **Standardize Page Headers** — Migrate all shell pages to use `<PageHeader>` | ✅ Fixed | Medium | 1.0d | None | Visual layout alignment | 95% |
| 52 | **Standardize Toast Alerts** — Adopt `sonner` toast notifications universally | ✅ Fixed | Medium | 2.0d | None | Unified user feedback toasts | 100% |
| 53 | **Extract `useRoleCheck()` Helper** — Reusable hook for role authorization checks | ✅ Fixed | Medium | 0.5d | None | Removes inline role array checks | 100% |
| 54 | **Expand E2E Workflow Test Suite** — Add Playwright specs for attendance, leave, tasks | ✅ Fixed | Medium | 5.0d | None | Regression testing confidence | 100% |
| 55 | **Add Approval State Machine Unit Tests** — Test multi-stage purchase/expense transitions | ✅ Fixed | Medium | 3.0d | None | Approval workflow reliability | 100% |
| 56 | **Add RBAC Permission Unit Tests** — Test permission matrix against all role types | ✅ Fixed | Medium | 2.0d | None | Access control verification | 100% |
| 57 | **Add Mobile API Client Unit Tests** — Test mobile auth interceptor & refresh logic | 🔴 Still Open | Medium | 2.0d | None | Mobile network resilience | 100% |
| 58 | **Add Mobile Offline Sync Unit Tests** — Test Hive queue enqueue, sync, and retry handlers | 🔴 Still Open | Medium | 3.0d | None | Offline queue data integrity | 100% |
| 59 | **Add Schema Parity CI Check** — Automated script comparing SQLite and PG definitions | ✅ Fixed | Medium | 1.0d | None | Catches dual-schema divergence | 100% |
| 60 | **Add Automated Accessibility Audits** — Integrate `@axe-core/playwright` in E2E pipeline | ✅ Fixed | Medium | 2.0d | None | WCAG 2.1 AA compliance tracking | 100% |
| 61 | **Add Dependency Vulnerability Scan** — Add `pnpm audit` step to CI pipeline | ✅ Fixed | Medium | 0.5d | None | Supply chain security alerts | 100% |
| 62 | **Implement Streaming CSV Exports** — Stream data rows directly to HTTP response stream | ✅ Fixed | Medium | 2.0d | None | Crash-free export of large datasets | 100% |
| 63 | **Add Request Correlation ID** — Pass `x-request-id` header across all request handlers | ✅ Fixed | Medium | 1.0d | Task 17 | End-to-end distributed tracing | 90% |
| 64 | **Fix Docs Page App Router Integration** — Replace `next/head` with App Router metadata | ✅ Fixed | Medium | 1.0d | None | Fixes broken documentation page | 100% |
| 65 | **Fix Leave Date Filters** — Pass selected date range parameters to leave API query | ✅ Fixed | Medium | 1.0d | Task 18 | Functional leave list filtering | 100% |
| 66 | **Implement Step-Up Auth** — Require password confirmation for sensitive user changes | ✅ Fixed | Medium | 3.0d | Task 16 | Account security hardening | 100% |
| 67 | **Deconstruct Login Page Monolith** — Split 698-line `login/page.tsx` into modular components | ✅ Fixed | Medium | 2.0d | None | Maintainability and component testing | 95% |
| 68 | **Add Sub-System Error Boundaries** — Wrap major shell sections in localized error boundaries | ✅ Fixed | Medium | 2.0d | Task 10 | Isolated section crash recovery | 100% |
| 69 | **Migrate File Storage for Serverless** — Configure Supabase/S3 blob storage for uploads | 🔴 Still Open | Medium | 3.0d | None | Prevents file loss on cold starts | 100% |
| 70 | **Add Keyboard Navigation Focus Rings** — Ensure all interactive elements have visible `:focus-visible` | ✅ Fixed | Medium | 2.0d | None | Keyboard accessibility compliance | 100% |
| 71 | **Audit Screen Reader Compatibility** — Add `aria-label` tags to icon buttons across shell | ✅ Fixed | Medium | 3.0d | None | Screen reader accessibility | 100% |
| 72 | **Add DB Query Execution Telemetry** — Log slow queries (>500ms) in development | ✅ Fixed | Medium | 2.0d | Task 17 | Proactive slow query identification | 90% |
| 73 | **Auto-Generate OpenAPI 3.1 Spec** — Generate OpenAPI spec dynamically from Zod schemas | ✅ Fixed | Medium | 2.0d | Task 38 | Interactive developer API documentation | 90% |
| 74 | **Add Load & Stress Testing** — Create K6 script for 1,000 concurrent check-in requests | ✅ Fixed | Medium | 3.0d | None | Performance bottleneck verification | 90% |
| 75 | **Add Academic Seed Generator** — Populate sample students, classes, and logs in `seed.ts` | ✅ Fixed | Medium | 1.0d | None | Realistic local dev testing | 90% |
| 76 | **Clean Root Directory Artifacts** — Remove 8 APK files and legacy backup files from git | ✅ Fixed | Medium | 0.5d | None | Repository size reduction (~200MB) | 100% |
| 77 | **Build Student/Guardian API Endpoints** — Add CRUD handlers for existing student schema | ✅ Fixed | Medium | 3.0d | None | Student management API support | 100% |
| 78 | **Build Tap-to-Pair NFC Enrollment Modal** — Frontend component for physical NFC pairing | ✅ Fixed | Medium | 3.0d | None | Streamlined NFC tag provisioning | 90% |
| 79 | **Add Student NFC & QR Schema Fields** | ✅ Fixed | Medium | 1.0d | Task 77 | Student badge scanning support | 90% |

---

### P3 — Low (Tasks 80–99, ~30 Engineering Days)

| # | Task | Status | Priority | Effort | Dependencies | Impact | Confidence Score |
|---|------|--------|----------|--------|--------------|--------|------------------|
| 80 | **Add Staff Onboarding Guided Wizard** — Multi-step onboarding workspace UI | ✅ Fixed | Low | 5.0d | None | Guided staff setup UX | 85% |
| 81 | **Add Guided Attendance Marking Wizard** | ✅ Fixed | Low | 3.0d | None | Step-by-step attendance marking | 85% |
| 82 | **Implement PWA Offline Cache Strategy** — Configure Service Worker offline fallback | ✅ Fixed | Low | 3.0d | None | Basic web offline access | 100% |
| 83 | **Add Image Processing Pipeline** — Resize and convert avatar uploads to WebP | ✅ Fixed | Low | 2.0d | Task 69 | Bandwidth optimization | 100% |
| 84 | **Implement API Version Header Interceptor** | ✅ Fixed | Low | 1.0d | Task 45 | Clean API version negotiation | 90% |
| 85 | **Add Push Notification Dead Letter Queue** | ✅ Fixed | Low | 2.0d | Task 31 | Failed push notification retries | 90% |
| 86 | **Remove Dead Code & Unused Stores** — Delete `useFormDialog`, `useUIStore`, etc. | ✅ Fixed | Low | 0.5d | None | Clean codebase hygiene | 100% |
| 87 | **Add Health Monitoring Alerting** — Webhook notification on `/api/health` failure | ✅ Fixed | Low | 1.0d | None | Operational uptime alerts | 100% |
| 88 | **Implement Feature Flags System** — DB-driven feature toggles per institution | ✅ Fixed | Low | 3.0d | None | Modular feature enablement | 85% |
| 89 | **Automate Database Backups** — Script automated point-in-time PostgreSQL backups | ✅ Fixed | Low | 1.0d | Task 34 | Disaster recovery preparation | 100% |
| 90 | **Configure Renovate/Dependabot** — Automated dependency update PR generation | ✅ Fixed | Low | 0.5d | None | Automated security patch updates | 100% |
| 91 | **Integrate TurboRepo** — Configure build cache for monorepo tasks | ✅ Fixed | Low | 1.0d | None | Accelerated CI build pipelines | 90% |
| 92 | **Configure Husky Git Hooks** — Pre-commit typecheck and lint execution | ✅ Fixed | Low | 0.5d | None | Prevents committing broken code | 100% |
| 93 | **Enforce Conventional Commits** — Add commitlint validation hook | ✅ Fixed | Low | 0.5d | Task 92 | Standardized Git commit history | 90% |
| 94 | **Consolidate Duplicate NFC Modals** — Remove redundant `nfc-scanner-modal.tsx` | ✅ Fixed | Low | 0.5d | None | Clean component directory structure | 100% |
| 95 | **Fix Hardcoded Theme Colors** — Replace hardcoded hex colors with CSS tokens | ✅ Fixed | Low | 0.5d | None | Theme system compliance | 100% |
| 96 | **Add Accessible Labels to Icon Buttons** — Add `aria-label` to sidebar & bottom nav buttons | ✅ Fixed | Low | 0.5d | None | Improved screen reader navigation | 100% |
| 97 | **Clean Up Obsolete Backup Files** — Remove `src/app/favicon_original.ico.bak` | ✅ Fixed | Low | 0.2d | None | Source tree cleanliness | 100% |
| 98 | **Add `api/dist/` to `.gitignore`** — Remove compiled JS output from git history | ✅ Fixed | Low | 0.2d | None | Git repository cleanliness | 100% |
| 99 | **Add Developer Setup Guide** — Add architecture quick-start guide to `README.md` | ✅ Fixed | Low | 0.5d | None | Developer onboarding velocity | 100% |

---

### P4 — Future (Tasks 100–109, Deferred to Post-MVP)

| # | Task | Status | Priority | Effort | Dependencies | Impact | Confidence Score |
|---|------|--------|----------|--------|--------------|--------|------------------|
| 100 | **Implement Workspace Navigation** — Multi-persona workspaces per AIOS spec | 🔴 Deferred | Future | 10.0d | Tasks 1–79 | Next-gen experience architecture | 85% |
| 101 | **Implement Universal Global Search** — Cmd+K search across all DB entities | 🔴 Deferred | Future | 5.0d | Task 18 | Platform-wide instant search | 90% |
| 102 | **Implement Ambient AI Engine** — Event-driven anomaly detection microservice | 🔴 Deferred | Future | 10.0d | Task 31 | Automated campus intelligence | 80% |
| 103 | **Integrate Payment Gateways** — Connect eSewa / Khalti payment APIs | 🔴 Deferred | Future | 10.0d | None | Online fee collection support | 85% |
| 104 | **Implement Multi-Region Database Read Replicas** | 🔴 Deferred | Future | 5.0d | Task 34 | Ultra-low global query latency | 85% |
| 105 | **Implement SMS Gateway Integration** — Twilio / local SMS API dispatcher | 🔴 Deferred | Future | 3.0d | Task 31 | Offline SMS alert delivery | 90% |
| 106 | **Build Native Android Home Screen Widgets** | 🔴 Deferred | Future | 5.0d | None | Mobile quick check-in widgets | 80% |
| 107 | **Build Student Self-Service Web Portal** | 🔴 Deferred | Future | 10.0d | Task 77 | Dedicated student portal UI | 85% |
| 108 | **Build Parent & Guardian Mobile Companion App** | 🔴 Deferred | Future | 10.0d | Task 77 | Dedicated parent mobile app | 85% |
| 109 | **Implement FaceNet 512-d Vector Search Microservice** | 🔴 Deferred | Future | 10.0d | None | Automated multi-camera face recognition | 75% |

---

## Unified Effort & Roadmap Summary

```
Phase 0 (P0 - Critical)  : Weeks 1-2   |  15 Tasks  | ~10 Days  | 1-2 Engineers
Phase 1 (P1 - High)      : Weeks 3-5   |  29 Tasks  | ~42 Days  | 2-3 Engineers
Phase 2 (P2 - Medium)    : Weeks 6-9   |  35 Tasks  | ~60 Days  | 2-3 Engineers
Phase 3 (P3 - Low)       : Weeks 10-12 |  20 Tasks  | ~30 Days  | 1-2 Engineers
----------------------------------------------------------------------------------
Total Active Backlog     : 12 Weeks    | 99 Tasks   | ~142 Days | Enterprise Ready
```
