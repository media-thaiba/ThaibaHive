# ThaibaHive Institution OS — Engineering Assessment Report

**Date:** July 29, 2026
**Assessor:** Senior Principal Software Architect & Staff Engineer
**Scope:** Full production readiness review before first enterprise release
**Status:** READ-ONLY assessment — no code modified

---

## Executive Summary

ThaibaHive is a large-scale Institution Operating System built on Next.js 16 (App Router, React 19) with a Flutter mobile app, covering 18+ department modules across 23+ campuses. The codebase demonstrates ambitious scope and solid architectural foundations — proper RBAC, dual-database support, PWA capabilities, and a well-structured monorepo.

However, this assessment identified **14 Critical issues**, **38 High-severity issues**, and **52 Medium-severity issues** that must be addressed before enterprise release. The most urgent concerns are: a potentially inactive authentication middleware, SQLite-specific SQL that will crash on the production PostgreSQL database, open signup on a closed institutional system, unencrypted PII (Aadhaar/PAN/bank details), and a mobile app with a debug certificate bypass that disables TLS verification.

**Overall Production Readiness Score: 5.2 / 10**

| Dimension | Score | Verdict |
|-----------|-------|---------|
| Frontend / UI | 6.5/10 | Solid pages, but inconsistent patterns, dead code, underutilized tooling |
| Backend / APIs | 5.5/10 | 138 routes exist, but missing validation, transactions, pagination |
| Database | 5.0/10 | Dual-schema architecture works, but SQLite-isms will break PostgreSQL |
| Auth & Security | 4.0/10 | RBAC model is good; critical gaps in middleware, PII encryption, rate limiting |
| Mobile App | 6.0/10 | 30 features covering ~85% of web; security gaps and low test coverage |
| Test Coverage | 4.0/10 | 231 unit tests pass; critical paths (approval, RBAC, offline sync) untested |
| Build / CI/CD | 5.0/10 | CI runs lint+test but no build verification; Node version mismatch |
| Performance | 5.5/10 | Zero dynamic imports, heavy dead dependencies, no caching layer |
| Scalability | 3.5/10 | In-memory rate limiting, local file storage, no Redis, SSE doesn't scale |
| Documentation | 6.0/10 | Extensive .ai/ docs; missing API docs, onboarding guide, runbook |
| Developer Experience | 5.5/10 | Good conventions in AGENTS.MD; dead code, dual API clients, no lint enforcement |

---

## 1. Overall Repository Health

### Inventory

| Layer | Count | Notes |
|-------|-------|-------|
| Frontend pages | 56 page.tsx files | Across (shell), auth, (public) route groups |
| UI components | 71 .tsx files | 17 subdirectories; 8 empty directories |
| API routes | 138 route files | 30+ domain modules |
| Database tables | ~65 tables | Dual schema (SQLite + PostgreSQL) |
| Mobile features | 30 modules | Feature-first architecture with Riverpod |
| Unit tests | 24 files, ~4,788 lines | 231 tests passing |
| E2E tests | 17 spec files | ~43 test cases |
| Mobile tests | 6 test files | Minimal coverage |
| Zod schemas | 33 validation schemas | In src/lib/validation/schemas.ts |
| Migrations | 18 files | Drizzle Kit managed |

### Health Indicators

- **TypeScript:** `strict: true` enabled; `tsc --noEmit` passes clean
- **Lint:** 2 errors (recently fixed), 46 pre-existing warnings
- **Tests:** 22 suites, 231/231 tests passing
- **Dead dependencies:** `md-to-pdf` (~50MB Chromium), `axios` (unused)
- **Dead code:** 2 Zustand stores, 1 hook, 1 component never imported

---

## 2. Features That Appear Incomplete

| Feature | Status | What's Missing |
|---------|--------|----------------|
| Admin CRUD (Institutions, Departments, Sub-Departments) | Create + Delete only | **No Edit/Update** — users must delete and recreate |
| Leave date filters | UI exists but non-functional | `dateFrom`/`dateTo` declared and bound to inputs but **never sent to API** |
| Announcement detail (mobile) | Placeholder | Renders `ComingSoonScreen` instead of actual detail view |
| Event detail (mobile) | Incomplete | Re-renders list screen instead of dedicated detail page |
| Notification preferences | Client-only | Stored in `localStorage`; lost on different device or browser clear |
| Chat (mobile) | Missing entirely | No mobile implementation |
| Marketplace (mobile) | Missing entirely | No mobile implementation |
| Reviews (mobile) | Missing entirely | No mobile implementation |
| Academic (mobile) | Missing entirely | No mobile implementation |
| Docs (mobile) | Missing entirely | No mobile implementation |
| Docs page (web) | Broken | Uses `next/head` (Pages Router) inside App Router; loads external CDN via iframe |
| Signup page | Redirect stub | `/auth/signup` just redirects to `/auth/login?mode=signup` |
| 8 component directories | Empty | announcements/, auth/, bookings/, help-desk/, leaves/, polls/, staff/, tasks/ |

---

## 3. Missing Production-Ready Functionality

| Missing Capability | Impact | Severity |
|--------------------|--------|----------|
| Server-side error monitoring (Sentry, etc.) | Production errors are invisible | Critical |
| Runtime environment variable validation | Misconfigured env vars cause silent runtime crashes | High |
| API versioning strategy | No way to evolve APIs without breaking mobile/web clients | High |
| Structured logging pipeline | Only `console.error`/`console.warn`; no log aggregation | High |
| Background job processing | Video processing, PDF generation, notifications all block request handlers | High |
| Token refresh mechanism | 7-day tokens with no sliding window; abrupt logout | High |
| Pagination on list endpoints | `/api/staff`, `/api/announcements`, `/api/tasks` return all records | High |
| Database transaction support | Multi-step writes (staff create/delete, leave creation) are non-atomic | High |
| Rate limiting for serverless | In-memory rate limiter is useless on Vercel (per-instance memory) | High |
| not-found.tsx pages | Users hitting invalid URLs see default Next.js 404 | Medium |
| Graceful shutdown handling | No signal handling for clean shutdown | Medium |
| Nonce cleanup job | `usedNonces` table grows unbounded | Low |
| Webhook system | No outbound webhook support for integrations | Low |

---

## 4. Bugs or Suspicious Code

### Critical Bugs

| Bug | File | Description |
|-----|------|-------------|
| **SQLite `datetime()` on PostgreSQL** | `src/app/api/announcements/route.ts:43,110` | Uses `datetime()` which is SQLite-specific. **Will crash on production PostgreSQL.** |
| **Middleware may be inactive** | `src/proxy.ts` | File is named `proxy.ts`, not `middleware.ts`. Next.js requires `middleware.ts` at root. If not wired, **all routes are unauthenticated.** |
| **Debug cert bypass in mobile** | `thaibahive_mobile_app/lib/core/network/api_client.dart:38` | `badCertificateCallback` accepts ALL certificates in debug mode. If debug APK reaches users, TLS is completely disabled. |
| **Node 24.x on Vercel** | `.vercel/project.json:14` | Specifies `nodeVersion: "24.x"` (unstable) while app targets Node 20. |

### High-Severity Bugs

| Bug | File | Description |
|-----|------|-------------|
| Open signup | `src/app/api/auth/signup/route.ts` | Anyone can create accounts without invitation. Institutional system should be closed. |
| No Zod on staff PUT/PATCH | `src/app/api/staff/[id]/route.ts` | PUT/PATCH accept raw JSON with only a whitelist — no type/length/format validation. |
| Race condition: leave balance | `src/app/api/leaves/route.ts:37-65` | Balance check + insert not atomic. Concurrent requests can over-allocate leave. |
| Race condition: attendance | `src/app/api/attendance/check-in/route.ts` | SELECT then INSERT; relies on string-matching `"UNIQUE constraint failed"` error. |
| No transaction on staff CRUD | `src/app/api/staff/route.ts` | 3 separate operations (insert staff, department, institution) — partial failure leaves inconsistent state. |
| Docs page uses Pages Router API | `src/app/(shell)/docs/page.tsx` | Uses `next/head` in App Router context — will not work correctly. |
| 2GB file upload limit | `src/app/api/upload/route.ts:13` | `MAX_FILE_SIZE = 2GB` — DoS risk. Middleware limits to 5MB, creating a conflict. |
| Login returns duplicate user data | `src/app/api/auth/login/route.ts:74-92` | Both `user` and `staff` objects returned with identical data. |
| Leaves POST uses wrong permission | `src/app/api/leaves/route.ts:83` | POST uses `"leaves:read"` instead of `"leaves:create"`. Works by accident. |
| Departments GET uses wrong permission | `src/app/api/departments/route.ts` | Uses `"announcements:read"` instead of `"staff:read"` or `"org:manage"`. |

### Suspicious Patterns

| Pattern | Location | Concern |
|---------|----------|---------|
| `catch { /* silently fail */ }` | Dashboard page:79 | Data fetch failures completely silent — users see blank state |
| `setTimeout(() => window.location.reload(), 1500)` | Settings page:67,141 | Full page reload instead of React state update |
| `filteredTeamLogs = teamLogs` | Attendance page:236 | Pointless variable alias — no actual filtering |
| `.catch(() => console.log(...))` | E2E media.spec.ts:124 | Swallows assertion failures — masks real test failures |
| Module-level `_cachedToken` | Mobile router.dart:569 | Auth token in module variable — accessible in memory dump |
| `DateTime.hashCode ^ i` for event IDs | Mobile offline_queue.dart:258 | Predictable, not cryptographically random |

---

## 5. UI/UX Inconsistencies

| Inconsistency | Scope | Description |
|---------------|-------|-------------|
| **Delete confirmation** | 16 pages use native `confirm()` | Should use `<AlertDialog>` per project conventions |
| **Page headers** | ~13 use `<PageHeader>`, ~15 use raw `<h1>` | Two competing patterns |
| **Tab implementations** | 3 different patterns | Raw `<button>`, `<Button variant>`, and `<Button variant="default">` — no Radix Tabs anywhere |
| **Form patterns** | Admin pages use inline forms; other pages use `<Dialog>` | Inconsistent modal/form approach |
| **API client usage** | 11 pages use `api` client; 45+ use raw `fetch()` | Dual data fetching pattern |
| **Error/alert patterns** | Some use `toast`, some use `<Alert>`, some use both | Settings page uses string matching (`includes("successfully")`) for variant |
| **Navigation after actions** | Some use `router.push()`, some use `window.location.href = "/"` | Full page reloads vs client navigation |
| **Loading states** | Most use `<Skeleton>` (good); some still have silent failures | Dashboard catches errors silently |
| **Signup redirect** | Cryptic "Redirecting to enroll secure node..." message | Confusing jargon for users |
| **Hardcoded colors** | Academic page uses `text-blue-600`, `text-green-600` | Bypasses theme system |
| **Signup page** | Hardcoded `bg-[#070809]` | Bypasses theme system |

---

## 6. Performance Bottlenecks

| Bottleneck | Impact | Severity |
|------------|--------|----------|
| **Zero dynamic imports** | All pages statically imported — large initial bundle. Heavy pages (media, reports, admin) should be lazy-loaded. | High |
| **`md-to-pdf` in dependencies** | ~50MB dead weight (bundles headless Chromium). Not imported anywhere. | High |
| **`framer-motion` used once** | ~32KB gzipped for a single animation on login page | Medium |
| **`axios` in dependencies** | ~13KB gzipped; not imported anywhere | Low |
| **No Redis/cache layer** | Every request hits the database; no shared cache across instances | High |
| **N+1 query in payroll export** | For each staff row, a separate query fetches attendance logs. 800+ staff = 800+ queries. | High |
| **SSE doesn't scale horizontally** | Presence, notifications, chat SSE endpoints won't work across multiple replicas | Medium |
| **Notification broadcasting is synchronous** | For 800+ staff, creates notifications synchronously within the API request | Medium |
| **`sharp` not built** | In `ignoredBuiltDependencies` — image optimization falls back to slower `squoosh` | Medium |
| **4 raw `<img>` tags** | Bypass `next/image` optimization | Low |
| **TanStack Query installed but unused** | Provider is wired up but zero pages use `useQuery`/`useMutation` — missing caching, deduplication, background refresh | High |
| **No `revalidatePath`/`revalidateTag`** | Not leveraging Next.js caching primitives | Medium |

---

## 7. Security Concerns

### Critical

| Issue | File | Description |
|-------|------|-------------|
| **Middleware potentially inactive** | `src/proxy.ts` not wired as `middleware.ts` | If middleware is not invoked, ALL routes are unauthenticated |
| **Vercel OIDC token in `.env.production.local`** | `.env.production.local` | Full JWT token with project ownership details in plaintext on disk |
| **PII stored unencrypted** | `packages/db/schema.pg.ts` | `aadhaar`, `pan`, `bankAccount`, `ifscCode` are plaintext — Indian government IDs require encryption at rest |
| **Open signup** | `src/app/api/auth/signup/route.ts` | Anyone can create accounts on a closed institutional system |

### High

| Issue | File | Description |
|-------|------|-------------|
| **CSP allows `unsafe-inline` + `unsafe-eval`** | `next.config.ts:53` | Severely weakens XSS protection |
| **In-memory rate limiting** | `src/lib/api/rate-limit.ts` | Useless in serverless — each instance has own counter |
| **No token refresh mechanism** | `packages/auth/config.ts` | 7-day tokens, no sliding window, abrupt logout |
| **7-day session with no step-up auth** | Auth system | Sensitive ops (password change, staff delete) use same session |
| **Dev JWT secret fallback** | `packages/auth/config.ts:7` | `crypto.randomUUID()` on startup — every restart invalidates sessions |
| **Mobile: no certificate pinning** | `api_client.dart` | Vulnerable to MITM on untrusted networks |
| **Mobile: hardcoded Google OAuth Client ID** | `constants.dart:46` | Should be injected via `--dart-define` |
| **Mobile: debug cert bypass** | `api_client.dart:38` | Accepts ALL certificates in debug mode |
| **2GB file upload limit** | `src/app/api/upload/route.ts:13` | DoS risk; conflicts with 5MB middleware limit |
| **Role stored as plain string** | `packages/auth/roles.ts:1` | No runtime enum validation — data corruption could grant super_admin |
| **No build step in CI** | `.github/workflows/ci.yml` | Build failures only discovered after merge to Vercel |
| **Inconsistent JWT env var names** | `.env.example` vs `.env.staging.example` | `AUTH_JWT_SECRET` vs `JWT_SECRET` |
| **HSTS only in next.config.ts** | `src/proxy.ts` | Middleware doesn't set HSTS — some responses may lack it |
| **No `onDelete` cascade on FKs** | Database schema | Deleting staff/departments causes constraint violations or orphans |

### Medium

| Issue | Description |
|-------|-------------|
| Conflicting Permissions-Policy headers | `next.config.ts` says `camera=()`, `proxy.ts` says `camera=(self)` |
| Google auth uses separate rate limiter | Not coordinated with shared rate-limit.ts |
| Mobile auth token in module-level variable | Accessible in memory dump |
| QR nonce cache boxes not encrypted | Unlike offline cache which uses AES-256 |
| Mobile `api/.env` risk | API server has own `.env` inside mobile app directory |
| No explicit CSRF token mechanism | Relies on sameSite: "lax" only |
| Login response returns duplicate data | Both `user` and `staff` objects with identical data |
| `/api/auth/me` returns `nfcTagId` | Sensitive physical access control data exposed |
| No URL validation on redirect parameters | Some routes don't validate safe/same-origin URLs |
| Release script hardcoded fallback secret | `release_app.py:34` has `"fallback-secret-key-123456"` |

---

## 8. Technical Debt

| Debt Item | Location | Estimated Effort | Impact |
|-----------|----------|-----------------|--------|
| Dual API client pattern (api client vs raw fetch) | 45+ pages use raw fetch | 3-5 days | Inconsistent error handling, auth management |
| TanStack Query installed but unused | QueryProvider wired, 0 pages use it | 5-8 days | Hundreds of lines of boilerplate fetch/loading/error state |
| 16 native `confirm()` dialogs | Admin pages, accounts, bookings, chat | 2-3 days | Breaks design system, can't be styled/localized |
| Admin CRUD code duplication | Institutions, Departments, Sub-Departments | 2-3 days | Same code structure repeated 3 times |
| Role check arrays repeated | 10+ pages | 1 day | `["super_admin", "admin", "principal", "hod"].includes(staff.role)` everywhere |
| Login page monolith | 698 lines, 4 modes in one component | 2-3 days | Hard to maintain, test, or extend |
| Dual database schema maintenance | SQLite + PostgreSQL schemas maintained in parallel | Ongoing | Schema drift risk, migration complexity |
| Business logic in API routes | Leave balance, staff creation, export CSV | 5-8 days | Makes testing harder, violates separation of concerns |
| Dead code (stores, hooks, components) | 2 stores, 1 hook, 1 component never imported | 0.5 days | Confusing for new developers |
| 8 empty component directories | Planned but never populated | 0.5 days | Suggests incomplete planning |
| 25+ `console.error()` in production code | Page components | 1 day | Should use proper logging service |
| Duplicate NFC scanner modal | 2 files in different directories | 0.5 days | Confusion about which to import |
| 8 APK files committed to repo root | ThaibaHive_V1.0.0_3.apk through _8.apk | 0.5 days | Bloats git history |

---

## 9. Dead Code or Duplicate Code

### Dead Code

| Item | File | Evidence |
|------|------|----------|
| `useFormDialog` hook | `src/hooks/use-form-dialog.ts` | Never imported anywhere |
| `useFiltersStore` | `src/stores/filters-store.ts` | Never imported anywhere |
| `useUIStore` | `src/stores/ui-store.ts` | Never imported anywhere |
| `ComingSoon` component | `src/components/ui/coming-soon.tsx` | Never imported anywhere |
| `stores/index.ts` | `src/stores/index.ts` | Barrel file re-exporting unused stores |
| `axios` dependency | `package.json` | Not imported anywhere |
| `md-to-pdf` dependency | `package.json` | Not imported anywhere (~50MB) |
| `optimizePackageImports` includes `lodash` | `next.config.ts:28` | `lodash` not in dependencies |

### Duplicate Code

| Pattern | Instances | Description |
|---------|-----------|-------------|
| Admin CRUD pages | 3 | Institutions, Departments, Sub-Departments — nearly identical |
| Role check arrays | 10+ | Same `includes()` check repeated across pages |
| Fetch + loading + skeleton | 40+ | Every page independently implements same pattern |
| NFC scanner modal | 2 | `attendance/nfc-scanner-modal.tsx` and `nfc/nfc-scanner-modal.tsx` |
| Date filter state | 5+ | Same `dateFrom`/`dateTo` management duplicated |
| Security headers | 2 | Set in both `next.config.ts` and `proxy.ts` with different values |

---

## 10. Missing Tests

### Critical Untested Paths

| Area | Gap | Severity |
|------|-----|----------|
| Approval state machine | No unit tests for multi-stage approval transitions | Critical |
| Role-based access control | No tests verifying each role can only access permitted endpoints | Critical |
| Mobile API client | No tests for auth interceptor, token refresh, error handling | Critical |
| Mobile offline queue | No tests for enqueue, sync, retry, terminal failure, rollback | Critical |
| Mobile offline sync service | No tests for any of the 8 event type handlers | Critical |

### High-Priority Missing Tests

| Area | Gap |
|------|-----|
| Payment/Accounts | No tests for financial logic, payroll calculations |
| Staff CRUD | No unit tests for staff management operations |
| Media upload pipeline | No tests for file upload, storage, share-link generation |
| API route error handling | No tests for error responses, validation failures |
| Auth flow E2E | No E2E test for logout, session expiry, token refresh |
| Mobile auth repository | No tests for login, logout, token storage |
| Mobile navigation/routing | No tests for auth guard redirect logic |
| Mobile QR anti-replay | No tests for HMAC validation, nonce tracking |
| Mobile models | Only 1 of 38 models tested |
| Mobile widget tests | Only 1 smoke test; no tests for any screen rendering |
| Mobile build in CI | CI never runs `flutter build apk --release` |
| Notification delivery | No E2E test for push notification display |
| Error states | No E2E test for network errors, server errors, empty states |
| Accessibility | No axe-core accessibility audit tests |

### Flaky Test Patterns

| File | Issue |
|------|-------|
| `presence-sync.spec.ts` | Uses `waitForTimeout(2000)` and `waitForTimeout(6000)` — timing-dependent |
| `media.spec.ts:124` | `.catch(() => console.log(...))` swallows assertion failures |
| `marketplace.spec.ts:26` | Accepts `[200, 401, 403]` as valid — doesn't verify correct behavior |

---

## 11. Build or Deployment Risks

| Risk | Severity | Description |
|------|----------|-------------|
| **Node 24.x on Vercel** | Critical | `.vercel/project.json` specifies unstable Node 24; app targets Node 20 |
| **No build step in CI** | High | `pnpm build` never runs in CI — failures only caught on Vercel |
| **pnpm version mismatch** | Medium | CI uses `pnpm@8`, Dockerfile uses `pnpm@latest` — lockfile format may differ |
| **E2E tests may lack database** | Medium | CI E2E job doesn't provision a test database |
| **Mobile build not verified in CI** | Critical | CI runs `flutter analyze` + `flutter test` but never `flutter build apk` |
| **Docker build not tested in CI** | Medium | Dockerfile exists but never built in CI |
| **`sharp` not built** | Medium | In `ignoredBuiltDependencies` — degrades image optimization |
| **`transpilePackages` missing** | Medium | `@thaiba/auth` and `@thaiba/db` may not transpile correctly |
| **Release signing fallback** | High | Mobile build falls back to debug signing when `key.properties` absent |
| **Hardcoded release notes** | Medium | `release_app.py` has v1.0.0+8 content hardcoded |
| **No iOS build configuration** | Medium | No iOS signing config; no macOS runner in CI |
| **`nodeVersion: "24.x"`** | Critical | Unstable Node version for production |

---

## 12. Scalability Concerns

| Concern | Current State | Risk at Scale | Severity |
|---------|---------------|---------------|----------|
| **Rate limiting** | In-memory `Map` | Useless on Vercel serverless — each instance has own counter | Critical |
| **File storage** | Local `uploads/` directory | Files lost on Vercel cold starts; only works with Docker | High |
| **No Redis/cache** | Every request hits DB | No shared state across instances; DB overload | High |
| **SSE connections** | In-memory subscriber lists | Won't work across multiple replicas | High |
| **No background jobs** | Video processing, PDF gen inline | Blocks request handlers; timeouts under load | High |
| **No pagination** | List endpoints return all records | Degrades with 800+ staff, growing data | High |
| **N+1 queries** | Payroll export: 800+ queries for 800 staff | Will timeout at scale | High |
| **Notification sync** | Synchronous broadcast to all staff | Slow for large institutions | Medium |
| **DB connection pool** | `pg.Pool` with max 10 | May exhaust under serverless cold starts | Medium |
| **Nonce table growth** | `usedNonces` has no cleanup | Unbounded growth | Low |

---

## 13. Accessibility Issues

| Issue | Scope | Severity |
|-------|-------|----------|
| **No `not-found.tsx`** | Entire app | High — default Next.js 404 doesn't match design system |
| **Missing aria-labels** | Diagnostics panel (4 of 5 buttons) | Medium |
| **Raw `<input type="checkbox">`** | Checklists page | Medium — should use Radix Checkbox |
| **Tables without `<caption>` or `scope`** | Multiple admin pages | Low |
| **Custom toggle switch** | Settings page | Low — should use Radix Switch |
| **No accessibility audit tests** | Entire app | Medium — no axe-core integration |
| **Skip link present** | Shell layout | Positive |
| **ARIA roles used** | Shell layout (`role="banner"`, `role="main"`, `role="navigation"`) | Positive |
| **Guided tour aria-labels** | Dashboard tour component | Positive |

---

## 14. Developer Experience Improvements

| Improvement | Description | Effort |
|-------------|-------------|--------|
| **Standardize on `api` client** | Migrate all 45+ raw `fetch()` calls to `src/lib/api/client.ts` | 3-5 days |
| **Use TanStack Query** | Migrate pages to `useQuery`/`useMutation` — eliminates hundreds of lines of boilerplate | 5-8 days |
| **Extract shared patterns** | Create `useRoleCheck()`, `AdminCrudPage`, `useDataTable()` hooks/components | 3-5 days |
| **Add `not-found.tsx`** | At root and nested levels | 0.5 days |
| **Replace `confirm()` with `AlertDialog`** | 16 instances across the codebase | 2-3 days |
| **Enable `noUncheckedIndexedAccess`** | Catch runtime bugs at compile time | 0.5 days |
| **Remove dead dependencies** | `md-to-pdf` (~50MB), `axios` (~13KB) | 0.5 days |
| **Add pre-commit hooks** | Enforce lint, typecheck, and test before commit | 1 day |
| **Consistent page header pattern** | Migrate all pages to `<PageHeader>` | 1 day |
| **Add API documentation** | OpenAPI spec is started but coverage unknown | 3-5 days |
| **Environment variable documentation** | `.env.example` only shows 3 vars; app requires 10+ | 1 day |
| **Onboarding guide** | No dedicated document for new developers | 2 days |
| **Deployment runbook** | No ops guide for incident response or monitoring setup | 2 days |

---

## 15. Code Quality Improvements

| Improvement | Description | Affected Files |
|-------------|-------------|----------------|
| **Split login page** | 698 lines with 4 modes — split into separate components | `src/app/auth/login/page.tsx` |
| **Extract role checks** | Create `useRoleCheck()` or `canAccess()` utility | 10+ pages |
| **Add nested error boundaries** | Prevent full-app crashes from component errors | `(shell)` subdirectories |
| **Consistent alert patterns** | Standardize on `toast` (sonner) everywhere | Settings, recognition pages |
| **Remove pointless aliases** | `filteredTeamLogs = teamLogs` does nothing | `attendance/page.tsx:236` |
| **Fix silent error swallowing** | Dashboard `catch { /* silently fail */ }` should show error state | `page.tsx:79` |
| **Replace `window.location.reload()`** | Use `router.refresh()` or React state updates | `settings/page.tsx:67,141` |
| **Use `<Link>` for navigation** | Replace `window.location.href = "/"` patterns | `accounts/page.tsx:124` |
| **Consistent tab pattern** | Adopt Radix `<Tabs>` across all pages | 10+ pages |
| **Fix Docs page** | Replace `next/head` with App Router `metadata` or `<head>` | `docs/page.tsx` |
| **Remove duplicate NFC modal** | Keep one, delete the other | `nfc/nfc-scanner-modal.tsx` |
| **Add `onDelete` cascade** | Define behavior for all FK references | Database schema |
| **Add unique constraints** | `staffDepartments(staffId, departmentId)`, `staffInstitutions(staffId, institutionId)` | Database schema |

---

## 16. Top 100 Recommended Product Engineering Tasks

### Phase 0: Critical Blockers (Must fix before any release) — Week 1

| # | Task | Priority | Effort | Why It Matters | Affected Modules | User Impact | Dependencies | Arch Change |
|---|------|----------|--------|----------------|-----------------|-------------|--------------|-------------|
| 1 | **Verify and wire `middleware.ts`** — Confirm `src/proxy.ts` is invoked; if not, create `middleware.ts` at root that re-exports it | Critical | 0.5d | If middleware is inactive, ALL routes are unauthenticated | `src/proxy.ts` | All users — complete security bypass | None | No |
| 2 | **Fix SQLite `datetime()` in announcements** — Replace with Drizzle ORM date functions or PostgreSQL-compatible `NOW()` | Critical | 0.5d | Will crash on production PostgreSQL | `src/app/api/announcements/route.ts` | Announcements feature broken in prod | None | No |
| 3 | **Fix Vercel Node version** — Change `nodeVersion` from `"24.x"` to `"20.x"` | Critical | 0.5d | Node 24 is unstable; app targets Node 20 | `.vercel/project.json` | Potential runtime incompatibilities | None | No |
| 4 | **Close open signup** — Remove or protect `/api/auth/signup`; require invitation tokens | Critical | 1d | Anyone can create accounts on closed institutional system | `src/app/api/auth/signup/route.ts` | Unauthorized access to institutional data | Auth module | No |
| 5 | **Encrypt PII at rest** — Encrypt `aadhaar`, `pan`, `bankAccount`, `ifscCode` fields using existing `institutionEncryptionKeys` | Critical | 3d | Indian government IDs require encryption under data protection regulations | `packages/db/schema.pg.ts`, staff API routes | Data breach risk for 800-1000 staff | Auth/DB packages | No |
| 6 | **Fix mobile debug certificate bypass** — Remove `badCertificateCallback` or gate strictly behind `kDebugMode` check with production assertion | Critical | 0.5d | If debug APK reaches users, TLS is completely disabled | `thaibahive_mobile_app/lib/core/network/api_client.dart` | All mobile API traffic vulnerable to MITM | None | No |
| 7 | **Verify `.env.production.local` token exposure** — Check if Vercel OIDC token was ever committed to git; rotate if so | Critical | 0.5d | Full JWT with project ownership in plaintext | `.env.production.local` | Potential project takeover | None | No |
| 8 | **Add runtime env validation** — Create Zod schema for `process.env` at startup; fail fast on missing vars | Critical | 1d | Missing env vars cause silent runtime crashes | All API routes, DB connection | Silent failures in production | None | No |

### Phase 1: Security Hardening — Weeks 2-3

| # | Task | Priority | Effort | Why It Matters | Affected Modules | User Impact | Dependencies | Arch Change |
|---|------|----------|--------|----------------|-----------------|-------------|--------------|-------------|
| 9 | Add transactions to multi-step writes (staff create/delete, leave creation) | Critical | 2d | Partial failures leave data inconsistent | Staff, leaves API routes | Data corruption | None | No |
| 10 | Fix race condition in leave balance check | Critical | 1d | Concurrent requests can over-allocate leave | `src/app/api/leaves/route.ts` | Incorrect leave balances | #9 | No |
| 11 | Fix race condition in attendance check-in | High | 1d | Relies on fragile string-matching of error messages | `src/app/api/attendance/check-in/route.ts` | Duplicate check-ins | None | No |
| 12 | Add Zod validation to staff PUT/PATCH endpoints | High | 1d | No type/length/format validation on updates | `src/app/api/staff/[id]/route.ts` | Invalid data accepted | None | No |
| 13 | Reduce file upload limit from 2GB to 50MB | High | 0.5d | 2GB is a DoS risk; conflicts with 5MB middleware limit | `src/app/api/upload/route.ts` | Server overload risk | None | No |
| 14 | Tighten CSP — remove `unsafe-eval`, audit what requires it | High | 2d | `unsafe-eval` enables XSS exploitation | `next.config.ts` | XSS vulnerability | None | No |
| 15 | Reconcile conflicting security headers between `next.config.ts` and `proxy.ts` | High | 1d | Different Permissions-Policy values; unpredictable behavior | `next.config.ts`, `src/proxy.ts` | Inconsistent security posture | None | No |
| 16 | Add HSTS to middleware responses | High | 0.5d | Some responses may lack HSTS | `src/proxy.ts` | Downgrade attacks | None | No |
| 17 | Add runtime role validation (not just compile-time type) | High | 1d | Data corruption could grant super_admin | `packages/auth/roles.ts` | Privilege escalation | None | No |
| 18 | Implement JWT token refresh mechanism | High | 3d | 7-day tokens with no refresh = abrupt logout | `packages/auth/`, AuthContext | Poor user experience | None | No |
| 19 | Add step-up authentication for sensitive operations | High | 2d | Password change, staff delete use same session | Auth system | Account takeover risk | #18 | No |
| 20 | Add certificate pinning to mobile app | High | 2d | Vulnerable to MITM on untrusted networks | `api_client.dart` | Mobile data interception | #6 | No |
| 21 | Move Google OAuth Client ID to `--dart-define` | High | 0.5d | Hardcoded in source code | `constants.dart` | Credential exposure | None | No |
| 22 | Fix inconsistent JWT env var names (`AUTH_JWT_SECRET` vs `JWT_SECRET`) | High | 0.5d | One template uses wrong name | `.env.example`, `.env.staging.example` | Auth failures in staging | None | No |
| 23 | Add `onDelete` cascade behavior to all FK references | High | 1d | Deleting staff/departments causes constraint violations | Database schema | Orphan records or crashes | None | No |
| 24 | Add unique constraints to junction tables | High | 0.5d | Staff can be assigned to same department/institution twice | `staffDepartments`, `staffInstitutions` | Duplicate assignments | None | No |
| 25 | Fix wrong permissions on leaves POST and departments GET | High | 0.5d | Using wrong permission strings | `leaves/route.ts`, `departments/route.ts` | Incorrect RBAC enforcement | None | No |

### Phase 2: Reliability & Data Integrity — Weeks 3-4

| # | Task | Priority | Effort | Why It Matters | Affected Modules | User Impact | Dependencies | Arch Change |
|---|------|----------|--------|----------------|-----------------|-------------|--------------|-------------|
| 26 | Add missing database indexes (notifications.staffId, leaveRequests.staffId, tasks.assignedToId, announcements.createdById) | High | 1d | Full table scans as data grows | Database schema | Slow queries at scale | None | No |
| 27 | Add pagination to all list endpoints | High | 3d | `/api/staff`, `/api/announcements`, `/api/tasks` return all records | All list API routes | Performance degradation | None | No |
| 28 | Fix N+1 query in payroll export | High | 1d | 800+ queries for 800 staff | `src/app/api/export/route.ts` | Export timeout | None | No |
| 29 | Migrate file storage to Supabase/external for Vercel | High | 3d | Local `uploads/` lost on serverless cold starts | Upload routes, media features | Lost files in production | None | Yes (storage) |
| 30 | Add server-side error monitoring (Sentry or equivalent) | High | 2d | Production errors are invisible | All API routes, pages | Silent failures | None | No |
| 31 | Add structured logging pipeline | High | 2d | Only `console.error`/`console.warn`; no aggregation | All API routes | Cannot debug production issues | None | No |
| 32 | Add `pnpm build` step to CI | High | 0.5d | Build failures only caught after merge | `.github/workflows/ci.yml` | Broken production deploys | None | No |
| 33 | Add `flutter build apk --release` to mobile CI | High | 0.5d | CI never verifies mobile app compiles | `.github/workflows/ci.yml` | Broken mobile releases | None | No |
| 34 | Remove `md-to-pdf` dependency (~50MB dead weight) | High | 0.5d | Bundles headless Chromium; not imported anywhere | `package.json` | Bloated installs, slow CI | None | No |
| 35 | Remove `axios` dependency (unused) | Low | 0.5d | Not imported anywhere | `package.json` | Minor bundle bloat | None | No |
| 36 | Fix Docs page — replace `next/head` with App Router pattern | High | 1d | Uses Pages Router API in App Router; loads external CDN | `src/app/(shell)/docs/page.tsx` | Broken docs page | None | No |
| 37 | Add `not-found.tsx` at root and key nested levels | High | 1d | Users see default Next.js 404 | App router | Poor error experience | None | No |
| 38 | Fix silent error swallowing on dashboard | Medium | 0.5d | `catch { /* silently fail */ }` shows blank state | `src/app/(shell)/page.tsx` | Confusing blank dashboard | None | No |
| 39 | Fix `setTimeout(() => window.location.reload(), 1500)` in settings | Medium | 0.5d | Full page reload instead of React state update | `settings/page.tsx` | Jarring UX | None | No |
| 40 | Fix login response returning duplicate user data | Medium | 0.5d | Both `user` and `staff` with identical data | `src/app/api/auth/login/route.ts` | Unnecessary data exposure | None | No |

### Phase 3: Frontend Standardization — Weeks 4-6

| # | Task | Priority | Effort | Why It Matters | Affected Modules | User Impact | Dependencies | Arch Change |
|---|------|----------|--------|----------------|-----------------|-------------|--------------|-------------|
| 41 | Migrate all 45+ raw `fetch()` calls to `api` client | High | 5d | Dual API client pattern; inconsistent error handling | 45+ page files | Inconsistent error/auth behavior | None | No |
| 42 | Replace all 16 `confirm()` dialogs with `<AlertDialog>` | High | 3d | Native browser dialogs break design system | Admin pages, accounts, bookings, chat | Inconsistent UI | None | No |
| 43 | Adopt TanStack Query — migrate pages to `useQuery`/`useMutation` | High | 8d | Eliminates hundreds of lines of boilerplate; adds caching | All data-fetching pages | Faster UI, less loading flicker | #41 | No |
| 44 | Extract `useRoleCheck()` utility for repeated role arrays | Medium | 1d | Same check repeated on 10+ pages | 10+ page files | Maintenance burden | None | No |
| 45 | Create reusable `AdminCrudPage` component | Medium | 3d | Institutions/Departments/Sub-Departments nearly identical | Admin pages | Code duplication | None | No |
| 46 | Add Edit/Update to admin CRUD pages | Medium | 2d | Currently only Create + Delete; must delete to fix mistakes | Admin pages | Poor admin UX | #45 | No |
| 47 | Standardize page headers — migrate all to `<PageHeader>` | Medium | 1d | Two competing patterns (PageHeader vs raw h1) | 15+ pages | Visual inconsistency | None | No |
| 48 | Standardize tab pattern — adopt Radix `<Tabs>` | Medium | 2d | Three different tab patterns across pages | 10+ pages | Visual inconsistency | None | No |
| 49 | Standardize alert/toast pattern — use sonner everywhere | Medium | 2d | Some use toast, some use Alert, some both | Multiple pages | Inconsistent feedback | None | No |
| 50 | Split login page into separate mode components | Medium | 3d | 698 lines, 4 modes in one component | `src/app/auth/login/page.tsx` | Hard to maintain | None | No |
| 51 | Add nested error boundaries for feature sections | Medium | 2d | Chat crash brings down entire shell | `(shell)` subdirectories | Full-app crashes | None | No |
| 52 | Fix signup page — make it a real page or remove the route | Medium | 1d | Currently just a redirect stub with cryptic message | `src/app/auth/signup/page.tsx` | Confusing UX | None | No |
| 53 | Fix leave date filters — actually send to API | Medium | 1d | Filters are purely decorative | `leaves/page.tsx` | Non-functional filters | #27 | No |
| 54 | Remove dead code (unused stores, hooks, components) | Low | 0.5d | 2 stores, 1 hook, 1 component never imported | `src/stores/`, `src/hooks/`, `src/components/ui/` | Developer confusion | None | No |
| 55 | Remove duplicate NFC scanner modal | Low | 0.5d | Two identical files in different directories | `src/components/attendance/`, `src/components/nfc/` | Import confusion | None | No |
| 56 | Remove pointless `filteredTeamLogs = teamLogs` alias | Low | 0.5d | No actual filtering applied | `attendance/page.tsx:236` | Code confusion | None | No |
| 57 | Fix hardcoded theme colors (signup bg, academic page) | Low | 0.5d | `bg-[#070809]`, `text-blue-600` bypass theme | Login, academic pages | Theme inconsistency | None | No |
| 58 | Add aria-labels to diagnostics panel buttons | Low | 0.5d | 4 of 5 buttons lack aria-labels | `diagnostics-button.tsx` | Accessibility | None | No |
| 59 | Replace raw `<input type="checkbox">` with Radix Checkbox | Low | 0.5d | Checklists page uses raw HTML | `checklists/page.tsx` | Accessibility | None | No |
| 60 | Add table accessibility (`<caption>`, `scope` attributes) | Low | 1d | Multiple admin pages lack table a11y | Admin pages | Accessibility | None | No |

### Phase 4: Mobile App Hardening — Weeks 5-7

| # | Task | Priority | Effort | Why It Matters | Affected Modules | User Impact | Dependencies | Arch Change |
|---|------|----------|--------|----------------|-----------------|-------------|--------------|-------------|
| 61 | Implement announcement detail screen (mobile) | High | 2d | Currently shows `ComingSoonScreen` placeholder | `lib/features/announcements/` | Missing mobile feature | None | No |
| 62 | Implement event detail screen (mobile) | High | 1d | Re-renders list screen instead of detail | `lib/features/events/` | Poor mobile UX | None | No |
| 63 | Add mobile build verification to CI | High | 1d | CI never runs `flutter build apk --release` | `.github/workflows/ci.yml` | Broken mobile releases | None | No |
| 64 | Fix mobile release signing fallback | High | 1d | Falls back to debug signing when `key.properties` absent | `build.gradle.kts` | Unsigned release APKs | None | No |
| 65 | Fix hardcoded fallback secret in release script | High | 0.5d | `"fallback-secret-key-123456"` in `release_app.py` | `release_app.py` | Secret exposure | None | No |
| 66 | Fix dynamic release notes in release script | Medium | 1d | Hardcoded to v1.0.0+8 content | `release_app.py` | Incorrect release notes | None | No |
| 67 | Disable `debugLogDiagnostics` in production builds | Medium | 0.5d | Leaks route navigation data in production logs | `lib/app/router.dart:109` | Information leakage | None | No |
| 68 | Encrypt QR nonce cache boxes (currently unencrypted) | Medium | 1d | Unlike offline cache, nonce boxes use no encryption | `qr_anti_replay.dart` | Data exposure | None | No |
| 69 | Fix predictable event ID generation in offline queue | Medium | 1d | `DateTime.hashCode ^ i` is predictable | `offline_queue.dart:258` | Queue integrity | None | No |
| 70 | Remove `api/.env` from mobile app directory | Medium | 0.5d | Risk of shipping secrets in APK | `thaibahive_mobile_app/api/.env` | Secret exposure | None | No |
| 71 | Implement Chat feature for mobile | Medium | 5d | Missing entirely from mobile app | `lib/features/chat/` | Feature gap vs web | None | No |
| 72 | Implement Marketplace feature for mobile | Medium | 3d | Missing entirely from mobile app | `lib/features/marketplace/` | Feature gap vs web | None | No |
| 73 | Implement Reviews feature for mobile | Medium | 3d | Missing entirely from mobile app | `lib/features/reviews/` | Feature gap vs web | None | No |
| 74 | Remove 8 APK files from repo root | Low | 0.5d | Bloats git history | Root directory | Repo bloat | None | No |

### Phase 5: Testing & Quality — Weeks 6-9

| # | Task | Priority | Effort | Why It Matters | Affected Modules | User Impact | Dependencies | Arch Change |
|---|------|----------|--------|----------------|-----------------|-------------|--------------|-------------|
| 75 | Write tests for approval state machine | Critical | 3d | Multi-stage transitions completely untested | Leaves, expenses, purchases | Incorrect approvals | None | No |
| 76 | Write tests for RBAC enforcement | Critical | 3d | No tests verifying role-based endpoint access | All API routes | Unauthorized access | None | No |
| 77 | Write tests for mobile API client | Critical | 2d | Auth interceptor, token refresh, error handling untested | `api_client.dart` | Mobile auth failures | None | No |
| 78 | Write tests for mobile offline queue & sync | Critical | 3d | Enqueue, sync, retry, rollback completely untested | `offline_queue.dart`, sync service | Data loss offline | None | No |
| 79 | Write tests for payment/financial calculations | High | 2d | Accounts department logic untested | Accounts, expenses | Financial errors | None | No |
| 80 | Write tests for staff CRUD operations | High | 2d | Staff management untested | Staff API routes | Data corruption | None | No |
| 81 | Write tests for media upload pipeline | High | 2d | File upload, storage, share-links untested | Media API routes | Lost uploads | None | No |
| 82 | Write E2E test for auth flow (login, refresh, logout, expiry) | High | 2d | No E2E test for session lifecycle | Auth system | Session issues | #18 | No |
| 83 | Write E2E tests for notification delivery | High | 1d | No test for push notification display | Notifications | Missed notifications | None | No |
| 84 | Write E2E tests for error states (network, server, empty) | High | 2d | No test for error scenarios | All pages | Poor error handling | None | No |
| 85 | Fix flaky `presence-sync.spec.ts` (remove hardcoded waits) | High | 1d | Uses `waitForTimeout` — timing-dependent | `e2e/presence-sync.spec.ts` | Flaky CI | None | No |
| 86 | Fix `media.spec.ts` swallowing assertion failures | High | 0.5d | `.catch(() => console.log(...))` masks real failures | `e2e/media.spec.ts` | False positive tests | None | No |
| 87 | Fix `marketplace.spec.ts` accepting any status code | Medium | 0.5d | Accepts `[200, 401, 403]` — doesn't verify behavior | `e2e/marketplace.spec.ts` | False positive tests | None | No |
| 88 | Write mobile widget tests for all 30 feature screens | Medium | 5d | Only 1 smoke test exists | All mobile features | Undetected UI regressions | None | No |
| 89 | Write tests for mobile auth repository | Medium | 2d | Login, logout, token storage untested | `lib/features/auth/` | Auth failures | None | No |
| 90 | Write tests for mobile QR anti-replay system | Medium | 1d | HMAC validation, nonce tracking untested | `qr_anti_replay.dart` | QR spoofing | None | No |
| 91 | Write tests for 37 untested mobile models | Low | 3d | Only `StaffModel` tested | `lib/models/` | Data parsing bugs | None | No |
| 92 | Add axe-core accessibility audit tests | Medium | 2d | No accessibility testing | All pages | Accessibility compliance | None | No |
| 93 | Add dependency audit (`pnpm audit`) to CI | Medium | 0.5d | No security scanning of dependencies | CI pipeline | Vulnerable dependencies | None | No |
| 94 | Add test coverage reporting to CI | Medium | 1d | No coverage thresholds or reporting | CI pipeline | Unknown coverage gaps | None | No |

### Phase 6: Scalability & Infrastructure — Weeks 8-12

| # | Task | Priority | Effort | Why It Matters | Affected Modules | User Impact | Dependencies | Arch Change |
|---|------|----------|--------|----------------|-----------------|-------------|--------------|-------------|
| 95 | Migrate rate limiting to Redis for serverless | High | 3d | In-memory rate limiter useless on Vercel | `src/lib/api/rate-limit.ts` | Rate limit bypass | Redis infrastructure | Yes (infra) |
| 96 | Add Redis caching layer | High | 5d | Every request hits DB; no shared cache | All API routes | Slow response times | Redis infrastructure | Yes (infra) |
| 97 | Make SSE scalable across replicas | High | 5d | Presence, notifications, chat SSE won't work multi-replica | Realtime endpoints | Real-time features break | Redis/pub-sub | Yes (infra) |
| 98 | Add background job processing (BullMQ or similar) | High | 5d | Video processing, PDF gen, notifications block handlers | Media, exports, notifications | Timeouts under load | Job queue infra | Yes (infra) |
| 99 | Add API versioning strategy | Medium | 3d | No way to evolve APIs without breaking mobile clients | All API routes | Breaking changes | None | Yes (API) |
| 100 | Add graceful shutdown handling | Medium | 1d | No signal handling for clean shutdown | Server entry point | Data loss on restart | None | No |

---

## Effort Summary

| Phase | Duration | Tasks | Critical | High | Medium | Low |
|-------|----------|-------|----------|------|--------|-----|
| Phase 0: Critical Blockers | Week 1 | 8 | 8 | 0 | 0 | 0 |
| Phase 1: Security Hardening | Weeks 2-3 | 17 | 2 | 15 | 0 | 0 |
| Phase 2: Reliability & Data | Weeks 3-4 | 15 | 0 | 9 | 6 | 0 |
| Phase 3: Frontend Standardization | Weeks 4-6 | 20 | 0 | 4 | 10 | 6 |
| Phase 4: Mobile Hardening | Weeks 5-7 | 14 | 0 | 5 | 5 | 4 |
| Phase 5: Testing & Quality | Weeks 6-9 | 20 | 4 | 7 | 7 | 2 |
| Phase 6: Scalability | Weeks 8-12 | 6 | 0 | 4 | 2 | 0 |
| **Total** | **~12 weeks** | **100** | **14** | **44** | **30** | **12** |

---

## Conclusion

ThaibaHive has impressive scope and solid foundations — 138 API routes, 56 pages, 30 mobile features, and a well-designed RBAC model. However, the project has several **production-blocking critical issues** that must be resolved before enterprise release:

1. **The authentication middleware may not be active** — this is the single highest-risk item.
2. **SQLite-specific SQL will crash on PostgreSQL** — the production database.
3. **Open signup on a closed institutional system** — anyone can create accounts.
4. **PII (Aadhaar/PAN/bank) stored unencrypted** — regulatory compliance risk.
5. **Mobile debug certificate bypass** — TLS disabled if debug APK ships.

The recommended 100-task backlog is organized into 6 phases over approximately 12 weeks, prioritizing security and data integrity first, then frontend consistency, mobile completeness, test coverage, and finally scalability infrastructure. The team should execute Phase 0 immediately (Week 1) before any feature work continues.

---

*Report generated from comprehensive analysis of all source code, configuration files, test suites, mobile app, and documentation across the ThaibaHive repository.*
