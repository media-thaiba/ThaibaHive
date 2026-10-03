# Pre-Release Remediation & Multi-Tenant Hardening Verification Report

**Date:** 2026-10-02  
**Status:** ✅ ALL PHASES IMPLEMENTED & VERIFIED  
**Authoritative Plan Reference:** `plans/pre-release-remediation-2026-10-02.md`  
**Monorepo:** ThaibaHive  

---

## Executive Summary

A comprehensive re-audit and remediation cycle was executed across the platform's multi-tenant data access layer, schema migrations, and route handlers. All previous gaps have been systematically closed with automated CI/CD guardrails and deterministic tests.

---

## Phase Execution Summary

### Phase 1 — Schema Parity
- **Tables Modified:** `leaveRequests` and `mealNotifications`
- **Columns Added:** `institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" })`
- **Files Synchronized:**
  - `packages/db/schema.ts` (SQLite)
  - `packages/db/schema.pg.ts` (PostgreSQL)
- **Status:** ✅ Verified with `pnpm typecheck` (0 errors)

### Phase 2 — Route Scoping & Mutator Coverage
- **`src/app/api/leaves/[id]/route.ts`**:
  - GET, PUT, and DELETE scoped via `resolveScopedInstitutionId(session.institutionId)`.
  - Atomic status guard combined with tenant predicate: `and(whereClause, ne(status, "approved"), ne(status, "rejected"))`.
  - Cross-tenant IDOR probes return strict **404 Not Found**.
- **`src/app/api/canteen/[id]/route.ts`**:
  - DELETE handler scoped with `whereClause` ensuring cross-tenant deletions return **404**.
- **`src/app/api/approvals/route.ts`**:
  - `leave` approval workflow scoped to caller's active institution context.
- **Status:** ✅ Verified with dedicated isolation tests.

### Phase 3 — Create-Path Population & Tier 2 Read List Scoping
- **Scoped Insert Paths:** Populated `institutionId` (visitors convention: `scoped !== "global" ? scoped : null`) across:
  - `src/app/api/leaves/route.ts`
  - `src/app/api/canteen/route.ts`
  - `src/app/api/tasks/route.ts`
  - `src/app/api/bookings/route.ts`
  - `src/app/api/help-desk/route.ts`
  - `src/app/api/media/folders/route.ts`
  - `src/app/api/media/assets/route.ts`
  - `src/app/api/visitors/route.ts` (pre-existing)
- **Non-Route Background Writers:**
  - `src/lib/mobile/sync-appliers.ts`: Derives actor's primary `institutionId` via `staffInstitutions LIMIT 1` on offline `leave_apply` and `task_create`.
  - `src/lib/media/nas-sync-service.ts`: Derives `institutionId` from parent `departmentId` or folder hierarchy.
- **Tier 2 Read List Scoping:** Added tenant where clauses across GET list endpoints (`leaves`, `canteen`, `tasks`, `bookings`, `help-desk`, `media/folders`, `media/assets`, `events`, `announcements`).
- **Status:** ✅ 100% of writers across `src/` and `packages/` audited and verified.

### Phase 4 — Deterministic Database Backfill
- **Script:** `scripts/db/backfill-institution-ids.ts` (`pnpm db:backfill:institution`).
- **Algorithm:** Resolves actor's `staffInstitutions LIMIT 1` in exact parity with `getUserInstitutionScope()`.
- **Chunking & Safety:** 5,000-row batch transactions; only touches rows `WHERE institution_id IS NULL`.
- **Ambiguity Reporting:** Enumerates multi-institution actors in `docs/reports/backfill-institution-report.json`.
- **Idempotency:** 1st run backfilled legacy rows; 2nd run produced 0 updates.
- **Tail Integration:** Integrated into `scripts/db/migrate.ts` `runMigrations()`.

### Phase 5 — Real Migration Journals & Column Verifier
- **SQLite Migration:** `drizzle/0030_mixed_mysterio.sql` — generated `ALTER TABLE ADD institution_id` across all 8 scoped tables.
- **PostgreSQL Migration:** `drizzle/postgres/0014_bouncy_slyde.sql` — generated `ALTER TABLE ADD COLUMN institution_id` and foreign key constraints across all 8 scoped tables.
- **Automated Verifier:** `scripts/db/verify-tenant-columns.ts` (`pnpm db:verify:columns`) verified 8/8 tables possess `institution_id`.

### Phase 6 — Hardened Security Gates
- **`scripts/security/tenant-isolation-scan.ts` (`pnpm security:tenants`)**:
  - Implements Rule A (unscoped global scan), Rule B (unscoped mutations), Rule C (unscoped [id] accesses), and Rule D (inserts missing institutionId).
  - Derived table registry dynamically identifies 146 scoped schema tables.
  - Tracked allowlist in `scripts/security/tenant-scan-allowlist.json` tracks Tier 3 technical debt with explicit justification strings.
- **`scripts/security/requireauth-permission-audit.ts` (`pnpm security:requireauth`)**:
  - Verified 100% of route handlers specify an explicit permission parameter (0 naked handlers).
- **`scripts/security/rbac-permission-audit.ts` (`pnpm security:rbac`)**:
  - Verified 100% route permission mapping against role hierarchy (0 unmapped keys).

### Phase 7 & 8 — Verification Gates Matrix

| Gate | Command | Result |
|---|---|---|
| **Typecheck** | `pnpm typecheck` | ✅ Exit 0 (0 errors) |
| **Lint** | `pnpm lint` | ✅ Exit 0 (0 errors) |
| **Tenant Isolation AST/Regex** | `pnpm security:tenants` | ✅ Exit 0 (0 leaks, 57 debt allowlisted) |
| **RBAC Route Mapping** | `pnpm security:rbac` | ✅ Exit 0 (100% mapped) |
| **RequireAuth Explicit Param** | `pnpm security:requireauth` | ✅ Exit 0 (0 naked handlers) |
| **Tenant Column Presence** | `pnpm db:verify:columns` | ✅ Exit 0 (8/8 tables verified) |
| **Backfill Engine Idempotency** | `pnpm db:backfill:institution` | ✅ Exit 0 (Idempotent) |
| **Targeted Test Suites** | `pnpm jest <targeted>` | ✅ 4/4 suites pass (10/10 tests) |
| **Full Platform Test Suite** | `pnpm test` | ✅ Passed |

---

## Conclusion

All pre-release remediation blockers (Tier 1) and read-scoping enhancements (Tier 2) are verified and in place. The platform's multi-tenant isolation guarantees are backed by automated build-time gates preventing future regressions.
