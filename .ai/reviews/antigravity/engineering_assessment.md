# Engineering Assessment Report — ThaibaHive Institution OS

**Agent**: Antigravity (Senior Principal Software Architect & Staff Engineer)  
**Mode**: Product Engineering Review (Pre-Release Enterprise Readiness)  
**Date**: 2026-07-29  

---

## Executive Summary

ThaibaHive Institution OS is a multi-tenant campus operating system built on Next.js 16 (App Router, React 19), pnpm workspaces (`@thaiba/auth`, `@thaiba/db`), Drizzle ORM (dual-dialect SQLite/PostgreSQL), and a Flutter 3.2+ companion mobile application (`thaibahive_mobile_app`).

The codebase exhibits exceptional baseline type safety and test hygiene:
* **TypeScript Compilation**: `tsc --noEmit` passes with **0 Errors**.
* **Unit/Integration Tests**: **25/25 Test Suites Passed, 244/244 Tests Passed**.
* **ESLint Linting**: **0 Errors**, 48 style/unused variable warnings.
* **Security & Auth Guard Baseline**: RBAC permission guards (`requireAuth`), department/institution scoping (`department-scope.ts`), and session validation are deeply integrated.

However, a comprehensive technical assessment reveals critical domain model gaps, biometrics provisioning gaps, mobile security vulnerabilities, and scaling limitations that must be addressed prior to an enterprise release:
1. **Missing Academic Data Model**: Core entities (`students`, `guardians`, `class_sections`, `academic_years`) are missing from database schemas.
2. **Biometrics Provisioning Gap**: Face enrollment stores base64 avatar images without extracting 512-d FaceNet vector embeddings or providing a server-side biometric check-in endpoint.
3. **Mobile Security Risks**: TLS certificate validation bypass (`badCertificateCallback`) enabled in debug builds, top-level memory token leak in GoRouter (`_cachedToken`), and hardcoded Google OAuth client ID.
4. **Realtime & Rate Limiting Scaling Blockers**: Server-Sent Events (SSE) hub and rate limiter rely on Node `globalThis` in-memory maps, blocking horizontal multi-node cluster deployment without Redis Pub/Sub.

---

## Overall Repository Health

* **Monorepo Architecture**: Clean separation between shared authorization packages (`packages/auth`), database access layer (`packages/db`), API route handlers (`src/app/api`), UI presentation shell (`src/app/(shell)`), and native mobile app (`thaibahive_mobile_app`).
* **Code Standard Compliance**: Strict adherence to Next.js 16 App Router standards, Zod validation schemas, and Drizzle query patterns.
* **Primary Deficit**: Lack of student/guardian schema foundation and lingering single-node state assumptions.

---

## Incomplete Features

1. **Student & Guardian Core**: Database schemas (`students`, `guardians`, `class_sections`, `academic_years`) are absent from `packages/db/schema.ts` and `schema.pg.ts`.
2. **Biometric Verification Engine**: `POST /api/staff/[id]/enroll-face` stores photo URLs without vector embedding indexing; `POST /api/attendance/biometric` endpoint does not exist.
3. **NFC Admin Enrollment UI**: Backend assignment/lookup routes exist (`/api/admin/nfc/*`), but frontend `staff/[id]/edit/page.tsx` uses a static string input without tap-to-pair interaction.
4. **Passkey / WebAuthn**: Zero implementation across backend tables, API routes, and settings UI.
5. **Marketplace Permissions**: `/api/marketplace/install` and `uninstall` endpoints mistakenly mandate `"attendance:read"` permission string instead of marketplace scopes.
6. **Mobile App Navigation Stubs**: Mobile `/announcements/:id` renders placeholder `ComingSoonScreen`; mobile `/events/:id` re-routes to list view instead of detail view.

---

## Missing Production Functionality

1. **Redis Pub/Sub Realtime Engine**: Current SSE hub relies on Node `globalThis` memory, causing event fragmentation across clustered server instances.
2. **Distributed Rate Limiting**: In-memory rate limiter cannot enforce IP/User limits across load-balanced application servers.
3. **Mandatory Email Verification Flow**: Public signup (`POST /api/auth/signup`) instantly issues active JWT sessions without verifying email ownership.
4. **PostgreSQL Production Connection Pooling**: Missing explicit PgBouncer / Supabase connection pooler initialization parameters in `@thaiba/db`.
5. **Automated Database Backup & Recovery**: No automated backup triggers for production PostgreSQL database instances.

---

## Bugs

1. **Mobile TLS Certificate Bypass in Debug Mode**: `badCertificateCallback = (cert, host, port) => true;` in mobile `api_client.dart`, `webview_handoff_screen.dart`, and `background_presence_service.dart` bypasses SSL validation when running debug builds.
2. **Top-Level Mobile Memory Token Storage**: `_cachedToken` in `lib/app/router.dart` is stored as a top-level global string variable. Clearing secure storage out-of-band fails to invalidate memory cache until app restart.
3. **Marketplace Endpoint Guard Mismatch**: `/api/marketplace/install` and `/uninstall` require permission `"attendance:read"` instead of marketplace scopes.
4. **Hardcoded Build Version Strings**: `/api/system/update/route.ts` contains fallback version constants (`1.0.0+14`) directly in source code.
5. **Unused Imports & Style Warnings**: 48 active ESLint warnings (unused imports like `CardHeader`, `Skeleton`, `Clock`).

---

## Security

1. **Mobile TLS Bypass Risk**: TLS certificate validation disabled in debug builds creates MITM vulnerability during staging/internal testing.
2. **Unverified Email Registration**: Instant JWT issuance on signup allows arbitrary email registration without OTP/link verification.
3. **Hardcoded Google OAuth Client ID**: Mobile `lib/core/constants.dart` hardcodes the Google Client ID string instead of injecting via `--dart-define`.
4. **In-Memory Rate Limiting Bypasses**: Rate limits can be bypassed in multi-node environments since each node tracks IP counters independently.
5. **File Upload Stream Buffering**: `/api/upload/route.ts` buffers complete file buffers in RAM before delegating to storage providers.

---

## Performance

1. **PostgreSQL Proxy Reflection Overhead**: `wrapPgDb` / `wrapBuilder` proxy reflection layer in `packages/db/index.ts` introduces runtime method interception overhead when bridging LibSQL/SQLite chain methods to PostgreSQL query results.
2. **Unindexed Database Columns**: Missing single-column and composite indexes on high-frequency query keys (`staff_id`, `department_id`, `institution_id`, `date`).
3. **Dashboard N+1 Query Aggregations**: Report list and dashboard summary routes loop over staff IDs to fetch individual attendance records rather than using SQL `GROUP BY` or `JOIN` queries.
4. **CSV Export Memory Buffering**: `/api/export/route.ts` buffers entire data tables in RAM before formatting and sending response streams.

---

## Scalability

1. **Single-Node SSE Architecture**: In-memory connection map prevents horizontal scaling across multiple container replicas.
2. **High-Concurrency SQLite Lock Contention**: SQLite write-lock contention during peak campus morning check-in periods.
3. **Unpartitioned Log Tables**: `activityLogs` and `auditLog` tables lack date-range partitioning strategy for long-term data growth.

---

## UI/UX

1. **Non-Standard Form Controls**: Vehicles and canteen modules use raw HTML inputs/buttons instead of `@/components/ui/` design primitives.
2. **Hardcoded Inline Colors**: Color badge indicators use raw Tailwind utility classes (`bg-green-500`) instead of `<Badge variant="...">` primitives.
3. **Spinner Overlays**: Mixed usage of generic text ("Loading...") or raw CSS pulse divs instead of structured `<Skeleton>` loading states.
4. **Modal Overlays**: Custom `fixed inset-0 z-50` overlay implementations in legacy components instead of standard Radix-based `<Dialog>` modal shells.

---

## Technical Debt

1. **Dual Schema File Duplication**: Maintaining two separate ORM files (`packages/db/schema.ts` and `packages/db/schema.pg.ts`) introduces schema drift risk during migrations.
2. **Untyped `any` Usages**: 130+ occurrences of `any` types in export handlers, API route parameters, and test mocks.
3. **Obsolete Repository Artifacts**: 6 obsolete binary APK build files (`ThaibaHive_V1.0.0_3.apk` through `8.apk`) in project root, bloating repository size (>200MB).

---

## Testing

1. **Low Mobile Test Coverage**: Mobile app (`thaibahive_mobile_app/test/`) contains only 6 test files (~5% coverage), lacking automated tests for Riverpod providers, GoRouter auth guard, and offline sync handlers.
2. **Missing Endpoint Tests**: `/api/system/update` lacks Jest test coverage for `SYSTEM_UPDATE_SECRET` authorization checks.
3. **Realtime Broadcast Integration Tests**: Lacks simulated network drop & reconnect verification for Server-Sent Events.

---

## DevEx

1. **Lacks Unified Seeding Script**: `pnpm seed` should populate both local SQLite (`dev.db`) and PostgreSQL staging DBs simultaneously.
2. **Missing Schema Parity CI Gate**: Lacks automated CI script to compare AST definitions of `schema.ts` and `schema.pg.ts`.
3. **Missing Flutter CI Pipeline**: GitHub Actions lacks automated Flutter static analysis (`flutter analyze`) and test execution jobs.

---

## Top 100 Recommended Engineering Tasks

```
+---------------------------------------------------------------------------------------------------+
| PRIORITY LEGEND                                                                                   |
| Critical : Security vulnerabilities, core data integrity, missing core architecture dependencies |
| High     : Key feature gaps, performance bottlenecks, production readiness requirements          |
| Medium   : Technical debt, UI/UX standardization, test coverage extensions                        |
| Low      : Cleanliness, DX enhancements, non-blocking documentation/style refactors                 |
+---------------------------------------------------------------------------------------------------+
```

### Domain 1: Data Model & Academic Core (Tasks 1–10)
1. **Implement Students & Guardians Database Schema** | Priority: Critical | Effort: 2 Days | Affected: `packages/db/schema.ts`, `schema.pg.ts` | Impact: Core student entity management | Dept: None | Changes Arch: No
2. **Implement Class Sections & Academic Years Schema** | Priority: Critical | Effort: 1.5 Days | Affected: `packages/db/schema.ts`, `schema.pg.ts` | Impact: Roster grade/section mapping | Dept: Task 1 | Changes Arch: No
3. **Build Students & Guardians API Management Endpoints** | Priority: High | Effort: 2 Days | Affected: `src/app/api/students/route.ts` | Impact: Student CRUD operations | Dept: Tasks 1, 2 | Changes Arch: No
4. **Add Student Institution & Section Junction Tables** | Priority: High | Effort: 1 Day | Affected: `packages/db/schema.ts` | Impact: Multi-campus transfers | Dept: Task 1 | Changes Arch: No
5. **Build Student Admission & Roster Import Wizard Backend** | Priority: High | Effort: 2 Days | Affected: `src/app/api/students/bulk-import/route.ts` | Impact: Bulk roster CSV upload | Dept: Tasks 3, 4 | Changes Arch: No
6. **Add Schema Parity Verification Script for CI** | Priority: High | Effort: 1 Day | Affected: `scripts/check-schema-parity.ts` | Impact: Prevents SQLite/PG drift | Dept: None | Changes Arch: No
7. **Add Database Foreign Key Indexing Suite** | Priority: High | Effort: 1 Day | Affected: `packages/db/schema.ts` | Impact: Faster join queries | Dept: None | Changes Arch: No
8. **Enforce Soft Delete Pattern Across All Master Entities** | Priority: Medium | Effort: 1.5 Days | Affected: `packages/db/schema.ts` | Impact: Audit history protection | Dept: None | Changes Arch: No
9. **Implement Universal Entity Timeline Event Emitter** | Priority: Medium | Effort: 2 Days | Affected: `src/lib/api/activity-log.ts` | Impact: Complete entity audit trail | Dept: None | Changes Arch: No
10. **Add Seed Generator for Academic Test Data** | Priority: Medium | Effort: 1 Day | Affected: `packages/db/seed.ts` | Impact: Realistic dev datasets | Dept: Tasks 1, 2 | Changes Arch: No

### Domain 2: Biometrics & Hardware Identity Integration (Tasks 11–20)
11. **Implement 512-d FaceNet Vector Embedding Storage** | Priority: Critical | Effort: 2 Days | Affected: `packages/db/schema.ts`, `enroll-face/route.ts` | Impact: Vector face recognition | Dept: None | Changes Arch: No
12. **Create Server-Side Biometric Check-In Endpoint** | Priority: Critical | Effort: 2 Days | Affected: `src/app/api/attendance/biometric/route.ts` | Impact: Kiosk biometric check-in | Dept: Task 11 | Changes Arch: No
13. **Build Tap-to-Pair NFC Tag Enrollment Modal Component** | Priority: High | Effort: 1.5 Days | Affected: `src/components/attendance/nfc-pairing-modal.tsx` | Impact: Instant NFC physical pairing | Dept: None | Changes Arch: No
14. **Add Student NFC Tag & QR Code Fields to Schema** | Priority: High | Effort: 1 Day | Affected: `packages/db/schema.ts` | Impact: Student entry gate badges | Dept: Task 1 | Changes Arch: No
15. **Build NFC Card Lifecycle Management UI** | Priority: Medium | Effort: 1.5 Days | Affected: `src/app/(shell)/admin/nfc/cards/page.tsx` | Impact: NFC revocation/reissue UI | Dept: Task 13 | Changes Arch: No
16. **Integrate Mobile Camera QR/NFC Scanner Verification** | Priority: High | Effort: 2 Days | Affected: `thaibahive_mobile_app/lib/features/attendance/nfc_scan_screen.dart` | Impact: Cryptographic QR validation | Dept: None | Changes Arch: No
17. **Implement Passkey / WebAuthn Database Credentials Table** | Priority: Medium | Effort: 1 Day | Affected: `packages/db/schema.ts` | Impact: FIDO2 credential schema | Dept: None | Changes Arch: No
18. **Implement WebAuthn Registration & Verification API Routes** | Priority: Medium | Effort: 2 Days | Affected: `src/app/api/auth/webauthn/` | Impact: Passkey authentication | Dept: Task 17 | Changes Arch: No
19. **Add Passkey Management UI to User Settings** | Priority: Medium | Effort: 1 Day | Affected: `src/app/(shell)/settings/page.tsx` | Impact: User TouchID/FaceID setup | Dept: Task 18 | Changes Arch: No
20. **Implement Biometric Enrollment Status Dashboard Widget** | Priority: Low | Effort: 1 Day | Affected: `src/app/(shell)/admin/page.tsx` | Impact: Biometric coverage metrics | Dept: Tasks 11, 13 | Changes Arch: No

### Domain 3: Auth, Security & RBAC Hardening (Tasks 21–30)
21. **Fix Marketplace Install/Uninstall Permission Scope Bug** | Priority: Critical | Effort: 0.5 Days | Affected: `src/app/api/marketplace/install/route.ts` | Impact: Corrects RBAC bypass | Dept: None | Changes Arch: No
22. **Implement Mandatory Email OTP Verification on Signup** | Priority: Critical | Effort: 2 Days | Affected: `src/app/api/auth/signup/route.ts` | Impact: Prevents fake accounts | Dept: None | Changes Arch: No
23. **Add Pre-Flight Environment Secret Guard** | Priority: High | Effort: 0.5 Days | Affected: `src/lib/env.ts` | Impact: Fails on weak JWT secret | Dept: None | Changes Arch: No
24. **Implement Strict Content Security Policy (CSP) Headers** | Priority: High | Effort: 1 Day | Affected: `next.config.ts` | Impact: Prevents XSS script execution | Dept: None | Changes Arch: No
25. **Add Dynamic Institution Scoping Guard on All Batch APIs** | Priority: High | Effort: 1.5 Days | Affected: `src/lib/auth/department-scope.ts` | Impact: Enforces tenant isolation | Dept: None | Changes Arch: No
26. **Implement Token Revocation List (Blacklist) Sync** | Priority: High | Effort: 1.5 Days | Affected: `packages/auth/session.ts` | Impact: Instant user logout sync | Dept: None | Changes Arch: No
27. **Audit System Update Endpoint Security Authorization** | Priority: High | Effort: 1 Day | Affected: `src/app/api/system/update/route.ts` | Impact: Protects OTA update URLs | Dept: None | Changes Arch: No
28. **Implement CSRF Token Validation for State-Changing Requests** | Priority: Medium | Effort: 1.5 Days | Affected: `src/middleware.ts` | Impact: Prevents CSRF on session cookies | Dept: None | Changes Arch: No
29. **Add Automated Audit Log Entry on Sensitive Data Access** | Priority: Medium | Effort: 1 Day | Affected: `src/app/api/export/route.ts` | Impact: Compliance audit trail | Dept: None | Changes Arch: No
30. **Implement Rate Limit Tiering by User Role** | Priority: Medium | Effort: 1 Day | Affected: `src/lib/api/rate-limit.ts` | Impact: Higher check-in quotas | Dept: None | Changes Arch: No

### Domain 4: API Reliability, Error Handling & Validation (Tasks 31–40)
31. **Standardize All API Response Structures** | Priority: High | Effort: 2 Days | Affected: `src/lib/api/response.ts` | Impact: Predictable API responses | Dept: None | Changes Arch: No
32. **Add Zod Payload Validation to All POST/PUT/PATCH Routes** | Priority: High | Effort: 2.5 Days | Affected: `src/lib/validation/schemas.ts` | Impact: Field-level validation errors | Dept: None | Changes Arch: No
33. **Implement Strict DELETE 404 Existence Check Guard** | Priority: High | Effort: 1.5 Days | Affected: `src/app/api/**/*.ts` | Impact: Returns 404 on missing entity | Dept: None | Changes Arch: No
34. **Fix Navigation Exception in API Client Jest Unit Tests** | Priority: Medium | Effort: 0.5 Days | Affected: `src/lib/api/client.ts` | Impact: Clean test runner logs | Dept: None | Changes Arch: No
35. **Add Centralized Async Error Boundary for Next.js Shell** | Priority: High | Effort: 1 Day | Affected: `src/app/(shell)/error.tsx` | Impact: Graceful page crash recovery | Dept: None | Changes Arch: No
36. **Implement Stream File Upload Validation Guard** | Priority: High | Effort: 1.5 Days | Affected: `src/app/api/upload/route.ts` | Impact: Prevents memory exhaustion DoS | Dept: None | Changes Arch: No
37. **Add `ensureArray` Defense Guard across All List Handlers** | Priority: Medium | Effort: 1.5 Days | Affected: `src/lib/utils.ts` | Impact: Eliminates `.map()` crashes | Dept: None | Changes Arch: No
38. **Implement API Versioning Header Interceptor** | Priority: Medium | Effort: 1 Day | Affected: `src/middleware.ts` | Impact: Backwards mobile compatibility | Dept: None | Changes Arch: No
39. **Add Request Correlation ID Header to All Logs** | Priority: Medium | Effort: 1 Day | Affected: `src/middleware.ts` | Impact: End-to-end request tracing | Dept: None | Changes Arch: No
40. **Build OpenAPI 3.1 Spec Auto-Generator Task** | Priority: Low | Effort: 1.5 Days | Affected: `scripts/generate-openapi.ts` | Impact: Auto-updated API docs | Dept: Task 32 | Changes Arch: No

### Domain 5: Web Presentation, UI/UX & Design System Compliance (Tasks 41–50)
41. **Replace Raw Form Inputs with `@/components/ui/` Primitives** | Priority: High | Effort: 2 Days | Affected: `src/app/(shell)/vehicles/_components/modals.tsx` | Impact: Standardized form UI | Dept: None | Changes Arch: No
42. **Replace Raw Status Badges with `<Badge>` Design Component** | Priority: Medium | Effort: 1.5 Days | Affected: `src/app/(shell)/**/*.tsx` | Impact: Consistent status badges | Dept: None | Changes Arch: No
43. **Replace Text/Div Loading States with `<Skeleton>` Loaders** | Priority: High | Effort: 2 Days | Affected: `src/app/(shell)/**/page.tsx` | Impact: Shimmer loading transitions | Dept: None | Changes Arch: No
44. **Standardize Modal Windows using Radix `<Dialog>` Primitive** | Priority: Medium | Effort: 2 Days | Affected: `src/components/**/*.tsx` | Impact: Accessible modal focus trap | Dept: None | Changes Arch: No
45. **Implement Dark Mode Contrast Fixes for WCAG 2.1 AA** | Priority: Medium | Effort: 1.5 Days | Affected: `src/app/globals.css` | Impact: Legible text in dark mode | Dept: None | Changes Arch: No
46. **Add Keyboard Navigation & Visible Focus Rings to UI Controls** | Priority: Medium | Effort: 1.5 Days | Affected: `src/components/ui/*.tsx` | Impact: Keyboard accessibility | Dept: None | Changes Arch: No
47. **Fix Icon-Only Button Accessible Labels** | Priority: Medium | Effort: 1 Day | Affected: `src/components/shell/SidebarNav.tsx` | Impact: Screen reader compatibility | Dept: None | Changes Arch: No
48. **Clean Up 48 ESLint Warnings & Unused Imports** | Priority: Low | Effort: 1 Day | Affected: `src/app/(shell)/**/*.tsx` | Impact: Zero-warning build output | Dept: None | Changes Arch: No
49. **Optimize Command Palette (Cmd+K) Lazy Loading** | Priority: Low | Effort: 1 Day | Affected: `src/components/shell/CommandPalette.tsx` | Impact: Reduced initial bundle size | Dept: None | Changes Arch: No
50. **Add Responsive Table Horizontal Scroll Wrappers** | Priority: Medium | Effort: 1 Day | Affected: `src/components/ui/table.tsx` | Impact: Smooth mobile web tables | Dept: None | Changes Arch: No

### Domain 6: Mobile Application (Flutter) Resilience & Features (Tasks 51–60)
51. **Remove Mobile Debug TLS Certificate Validation Bypass** | Priority: Critical | Effort: 0.5 Days | Affected: `thaibahive_mobile_app/lib/core/network/api_client.dart` | Impact: Secure SSL on all builds | Dept: None | Changes Arch: No
52. **Fix Top-Level Memory Token Storage Leak in GoRouter** | Priority: High | Effort: 1 Day | Affected: `thaibahive_mobile_app/lib/app/router.dart` | Impact: Immediate logout enforcement | Dept: None | Changes Arch: No
53. **Inject Google OAuth Client ID via `--dart-define`** | Priority: High | Effort: 0.5 Days | Affected: `thaibahive_mobile_app/lib/core/constants.dart` | Impact: Secure config injection | Dept: None | Changes Arch: No
54. **Implement Complete Screen Navigation for Announcements & Events** | Priority: Medium | Effort: 1.5 Days | Affected: `thaibahive_mobile_app/lib/app/router.dart` | Impact: Complete mobile detail views | Dept: None | Changes Arch: No
55. **Add Background Geofence Location Validation** | Priority: High | Effort: 2 Days | Affected: `thaibahive_mobile_app/lib/features/attendance/nfc_check_in.dart` | Impact: Prevents remote check-in fraud | Dept: None | Changes Arch: No
56. **Implement Pull-to-Refresh on All Mobile Feature Screens** | Priority: Medium | Effort: 1.5 Days | Affected: `thaibahive_mobile_app/lib/features/**/*.dart` | Impact: Manual data swipe refresh | Dept: None | Changes Arch: No
57. **Add Automated Riverpod State Provider Unit Tests** | Priority: High | Effort: 2 Days | Affected: `thaibahive_mobile_app/test/providers_test.dart` | Impact: Mobile state test coverage | Dept: None | Changes Arch: No
58. **Add GoRouter Deep Link Auth Guard Unit Tests** | Priority: Medium | Effort: 1 Day | Affected: `thaibahive_mobile_app/test/router_test.dart` | Impact: Secure deep-link navigation | Dept: None | Changes Arch: No
59. **Implement FCM Push Notification Foreground Display Handler** | Priority: Medium | Effort: 1 Day | Affected: `thaibahive_mobile_app/lib/core/services/fcm_service.dart` | Impact: Foreground in-app alerts | Dept: None | Changes Arch: No
60. **Add Cryptographically Secure ID Generator for Offline Queue Events** | Priority: Low | Effort: 0.5 Days | Affected: `thaibahive_mobile_app/lib/core/services/offline_queue.dart` | Impact: Collision-free offline queue | Dept: None | Changes Arch: No

### Domain 7: Performance, Caching & Database Indexing (Tasks 61–70)
61. **Add SQL Composite Indexing for Attendance Queries** | Priority: High | Effort: 1 Day | Affected: `packages/db/schema.ts` | Impact: Fast attendance reports | Dept: None | Changes Arch: No
62. **Optimize Dashboard N+1 Query Aggregations** | Priority: High | Effort: 1.5 Days | Affected: `src/app/api/dashboard/route.ts` | Impact: 80% lower dashboard latency | Dept: None | Changes Arch: No
63. **Implement Streaming CSV Export Generator** | Priority: High | Effort: 1.5 Days | Affected: `src/app/api/export/route.ts` | Impact: Crash-free large CSV exports | Dept: None | Changes Arch: No
64. **Configure PostgreSQL PgBouncer Connection Pooling** | Priority: High | Effort: 1 Day | Affected: `packages/db/index.ts` | Impact: Prevents DB pool exhaustion | Dept: None | Changes Arch: No
65. **Implement HTTP Cache-Control Header Policy for Static Assets** | Priority: Medium | Effort: 0.5 Days | Affected: `src/app/api/upload/files/[...path]/route.ts` | Impact: Lower bandwidth usage | Dept: None | Changes Arch: No
66. **Optimize Next.js Package Bundle Splitting** | Priority: Medium | Effort: 1 Day | Affected: `next.config.ts` | Impact: Reduced JS bundle size | Dept: None | Changes Arch: No
67. **Implement In-Memory LRU Cache for User Permissions** | Priority: Medium | Effort: 1 Day | Affected: `packages/auth/roles.ts` | Impact: Reduced RBAC CPU load | Dept: None | Changes Arch: No
68. **Add Database Query Execution Time Telemetry** | Priority: Low | Effort: 1 Day | Affected: `packages/db/index.ts` | Impact: Slow query identification | Dept: None | Changes Arch: No
69. **Implement Stale-While-Revalidate Caching for System Configs** | Priority: Medium | Effort: 1 Day | Affected: `src/app/api/system/update/route.ts` | Impact: Sub-50ms update checks | Dept: None | Changes Arch: No
70. **Add Database Table Size Monitoring Alert** | Priority: Low | Effort: 0.5 Days | Affected: `scripts/db-health-check.ts` | Impact: Disk space exhaustion warning | Dept: None | Changes Arch: No

### Domain 8: Realtime Engine & Infrastructure Scaling (Tasks 71–80)
71. **Prepare Redis Pub/Sub Adapter for SSE Hub** | Priority: High | Effort: 2 Days | Affected: `src/lib/api/realtime.ts` | Impact: Multi-server SSE scaling | Dept: None | Changes Arch: No
72. **Implement Distributed Redis Rate Limiting Driver** | Priority: High | Effort: 1.5 Days | Affected: `src/lib/api/rate-limit.ts` | Impact: Global request quotas | Dept: Task 71 | Changes Arch: No
73. **Add SSE Heartbeat Ping & Stale Connection Cleanup** | Priority: Medium | Effort: 1 Day | Affected: `src/lib/api/realtime.ts` | Impact: Memory leak prevention | Dept: None | Changes Arch: No
74. **Implement Graceful Server Shutdown Handler** | Priority: Medium | Effort: 1 Day | Affected: `src/app/api/system/shutdown/route.ts` | Impact: Zero dropped deployment requests | Dept: None | Changes Arch: No
75. **Add Docker Multi-Stage Production Build File** | Priority: High | Effort: 1 Day | Affected: `Dockerfile` | Impact: Hardened deployment container | Dept: None | Changes Arch: No
76. **Build Docker Compose Cluster Setup for Local Staging** | Priority: Medium | Effort: 1 Day | Affected: `docker-compose.yml` | Impact: Production-matching dev cluster | Dept: Task 75 | Changes Arch: No
77. **Add Automated SSL/TLS Security Header Validator** | Priority: Low | Effort: 0.5 Days | Affected: `validate-security-headers.js` | Impact: Guaranteed A+ security score | Dept: None | Changes Arch: No
78. **Implement Health Check & Readiness Endpoints** | Priority: High | Effort: 0.5 Days | Affected: `src/app/api/health/route.ts` | Impact: Load balancer probe support | Dept: None | Changes Arch: No
79. **Implement Dead Letter Queue (DLQ) for Failed Push Notifications** | Priority: Medium | Effort: 1.5 Days | Affected: `src/lib/sendPush.ts` | Impact: Reliable notification retry | Dept: None | Changes Arch: No
80. **Add Automated Database Migration Runner Script** | Priority: High | Effort: 1 Day | Affected: `scripts/migrate.ts` | Impact: Zero-manual SQL deployments | Dept: None | Changes Arch: No

### Domain 9: Testing, QA & Automated Verification (Tasks 81–90)
81. **Expand E2E Playwright Suite for Multi-Institution Isolation** | Priority: High | Effort: 2 Days | Affected: `e2e/tenant-isolation.spec.ts` | Impact: Verified multi-tenant safety | Dept: None | Changes Arch: No
82. **Add Playwright E2E Tests for Student & Guardian Workflows** | Priority: High | Effort: 2 Days | Affected: `e2e/students.spec.ts` | Impact: End-to-end student test suite | Dept: Tasks 1, 3 | Changes Arch: No
83. **Add E2E Tests for NFC Tag Assignment & Attendance Check-In** | Priority: High | Effort: 1.5 Days | Affected: `e2e/nfc-attendance.spec.ts` | Impact: Hardware scan verification | Dept: Task 13 | Changes Arch: No
84. **Add Unit Tests for System Update API Route** | Priority: Medium | Effort: 1 Day | Affected: `src/lib/__tests__/system-update.test.ts` | Impact: OTA update security testing | Dept: Task 27 | Changes Arch: No
85. **Add Unit Tests for Marketplace Install/Uninstall Guards** | Priority: Medium | Effort: 1 Day | Affected: `src/lib/__tests__/marketplace.test.ts` | Impact: Marketplace permission testing | Dept: Task 21 | Changes Arch: No
86. **Add Playwright Visual Regression Screenshots for Shell UI** | Priority: Low | Effort: 1.5 Days | Affected: `e2e/screenshots/` | Impact: Visual regression prevention | Dept: None | Changes Arch: No
87. **Configure Automated Jest Code Coverage Report Generation** | Priority: Medium | Effort: 0.5 Days | Affected: `jest.config.js` | Impact: CI code coverage metrics | Dept: None | Changes Arch: No
88. **Add Load & Stress Testing Script with K6** | Priority: Medium | Effort: 1.5 Days | Affected: `scripts/stress-test-k6.js` | Impact: Verified 1,000-user capacity | Dept: None | Changes Arch: No
89. **Implement Automated Link Checker for UI Navigation** | Priority: Low | Effort: 0.5 Days | Affected: `e2e/navigation.spec.ts` | Impact: Zero 404 router link errors | Dept: None | Changes Arch: No
90. **Add E2E Tests for Realtime SSE Notification Display** | Priority: Medium | Effort: 1.5 Days | Affected: `e2e/realtime-sse.spec.ts` | Impact: Confirms live toast delivery | Dept: None | Changes Arch: No

### Domain 10: DevEx, Code Quality & Build/Deployment Pipeline (Tasks 91–100)
91. **Remove Obsolete Binary APK Build Files from Root Directory** | Priority: Critical | Effort: 0.5 Days | Affected: Root folder (`ThaibaHive_V1.0.0_*.apk`) | Impact: Frees 200MB+ repo bloat | Dept: None | Changes Arch: No
92. **Add GitHub Actions CI/CD Quality Pipeline Workflow** | Priority: High | Effort: 1 Day | Affected: `.github/workflows/ci.yml` | Impact: Automated PR quality gate | Dept: None | Changes Arch: No
93. **Replace All 130+ Untyped `any` Usage with Explicit Types** | Priority: Medium | Effort: 2 Days | Affected: `src/app/api/export/route.ts` | Impact: Strict TypeScript safety | Dept: None | Changes Arch: No
94. **Create Single-Command Unified Seeding Script** | Priority: Medium | Effort: 1 Day | Affected: `package.json`, `seed.ts` | Impact: Single-command environment reset | Dept: None | Changes Arch: No
95. **Clean Up Obsolete File Backups in Source Tree** | Priority: Low | Effort: 0.2 Days | Affected: `src/app/favicon_original.ico.bak` | Impact: Clean source repository | Dept: None | Changes Arch: No
96. **Configure Automated Husky Git Commit Pre-Hooks** | Priority: Low | Effort: 0.5 Days | Affected: `.husky/pre-commit` | Impact: Pre-commit syntax checks | Dept: None | Changes Arch: No
97. **Add Developer Setup & Architecture Quick-Start Guide** | Priority: Low | Effort: 0.5 Days | Affected: `README.md` | Impact: Sub-10min developer onboarding | Dept: None | Changes Arch: No
98. **Add Automated Environment Variable Example Generator** | Priority: Low | Effort: 0.5 Days | Affected: `scripts/sync-env-example.ts` | Impact: Auto-synced `.env.example` | Dept: None | Changes Arch: No
99. **Add Automated Flutter Build Script for Android/iOS Releases** | Priority: Medium | Effort: 1 Day | Affected: `thaibahive_mobile_app/release_app.py` | Impact: One-click mobile builds | Dept: None | Changes Arch: No
100. **Implement Final Production Readiness Audit Sign-Off Checklist** | Priority: High | Effort: 0.5 Days | Affected: `.ai/AI_CHECKLIST.md` | Impact: Final release sign-off gate | Dept: Tasks 1–99 | Changes Arch: No

---
*Report generated and saved to `.ai/reviews/antigravity/engineering_assessment.md`.*
