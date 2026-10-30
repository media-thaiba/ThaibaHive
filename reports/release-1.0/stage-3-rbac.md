# Stage 3: 5-Tier RBAC & Tenant Boundary Deep Enforcement — Evidence Report

**Release:** ThaibaHive v1.0 Trial  
**Baseline SHA:** `de35bbc5c8651e3c0bd4a592216cb8aa137a5daa`  
**Date:** Mon Oct 26 2026  
**Environment:** Windows, Node v20.19.6, pnpm 12.9.1, SQLite/LibSQL (`file:./dev.db`)  
**Evidence dir:** `reports/release-1.0/` + `reports/local/`

---

## Role Matrix Verification (packages/auth/roles.ts)

All 16 roles from `VALID_STAFF_ROLES` are mapped with correct ranks:

| Tier | Roles | Rank | Notes |
|------|-------|------|-------|
| T1 | `super_admin` | 100 | Wildcard `*` permission |
| T2 | `regional_admin` | 90 | Institution/regional management |
| T3 | `principal`, `institutional_head` | 70 | Institution-level |
| T4 | `hod`, `coordinator` | 65 | Department-level |
| T5 | `admin` | 60 | Broad management |
| T6 | `accounts`, `purchase`, `regional_auditor` | 50 | Specialized |
| T7 | `inspector`, `academic_coordinator`, `exam_coordinator` | 45 | Read-heavy / coordination |
| T8 | `teacher`, `staff` | 40 | Read-only + own data |
| System | `system` | **1000** | Non-human, machine-only |

- `system` role (rank 1000) outranks `super_admin` — verified machine-only, excluded from human role pickers.
- Tier-1 wildcard `*` is only on `super_admin`; no role below it has `*`.

---

## Stage 3.1 Tenant Boundary Enforcement

| # | Check | Command | Outcome | Evidence |
|---|-------|---------|---------|----------|
| 3.1.1 | Tenant isolation scan (IDOR / unscoped scans / unscoped mutations / inserts missing institutionId) | `pnpm security:tenants` | ✅ PASSED | 1,843 files scanned; 0 critical leaks, 0 high risks, 0 warnings; 2 allowlisted debt entries tracked. Status: 100% TENANT ISOLATED. Report: `reports/local/tenant-isolation-report.json`. |
| 3.1.2 | AST route guard scanner (100% shielded methods) | `pnpm security:ast-shield` | ✅ PASSED | 713 routes inspected, 1,068 exported methods, 1,068 shielded (100%), 0 unshielded, 0 permission errors. |
| 3.1.3 | requireAuth wrapper coverage (0 unwrapped handlers) | `pnpm security:requireauth` | ❌ FAILED | 1 route handler without permission parameter: `src/app/api/attendance/sync/route.ts` [POST]. |

### 3.1 Verdict
**1 genuine defect (gate 13):** `src/app/api/attendance/sync/route.ts` [POST] calls `requireAuth(handler)` without a permission string. It should be `requireAuth(handler, "attendance:read")` to match `check-in/route.ts` and `check-out/route.ts`. All other routes are wrapped. This is a surgical one-line fix.

---

## Stage 3.2 Canonical Permissions Snapshot

| # | Check | Command | Outcome | Evidence |
|---|-------|---------|---------|----------|
| 3.2.1 | Permissions snapshot (12 canonical permission tests) | `pnpm test:permissions-snapshot` | ✅ PASSED | 12/12 tests passed (0.697s). Canonical permission set unchanged — no unintended drift. |

### 3.2 Verdict
Canonical permission set is stable. Any diff would be a deliberate, reviewed change.

---

## Stage 3.3 RBAC E2E Specs (Playwright)

| # | Spec | Command | Outcome | Evidence |
|---|------|---------|---------|----------|
| 3.3.1 | `rbac-deep-gating.spec.ts` | `pnpm playwright test e2e/rbac-deep-gating.spec.ts` | ❌ ENV ISSUE | Tests fail with `LEGACY_SESSION_EXPIRED` — server-side `verifySession` rejects JWTs because seeded staff `tokenVersion` in DB doesn't match the `tokenVersion: 0` in globally-generated tokens (global-setup does not update staff `tokenVersion`). Not an RBAC code defect. |
| 3.3.2 | `rbac-validation.spec.ts` | `pnpm playwright test e2e/rbac-validation.spec.ts` | ❌ ENV ISSUE | Same `LEGACY_SESSION_EXPIRED` root cause. 3 failed / 1 passed in chromium run. |
| 3.3.3 | `route-boundaries.spec.ts` | `pnpm playwright test e2e/route-boundaries.spec.ts` | ❌ ENV ISSUE | Same root cause. |
| 3.3.4 | `scanners.spec.ts` | `pnpm playwright test e2e/scanners.spec.ts` | ❌ ENV ISSUE | Same root cause. |
| 3.3.5 | `identity/` specs | `pnpm playwright test e2e/identity/` | ❌ ENV ISSUE | Same root cause (`Identity Security Radar` not visible due to expired session). |

### E2E Environment Diagnosis (confirmed)
- `packages/auth/session.ts:291`: `verifySession` returns `null` when `(row.tokenVersion ?? 0) !== session.tokenVersion`.
- Global-setup (`e2e/global-setup.ts`) seeds staff users without updating `tokenVersion`, but signs JWTs with `tokenVersion: 0`.
- If staff rows were previously created with a non-zero `tokenVersion`, the new tokens are rejected as `LEGACY_SESSION_EXPIRED`.
- **This is a test-data seed issue, not an RBAC defect.** The static scanners (which don't depend on sessions) confirm 100% route shielding and tenant isolation.

### E2E Coverage Gap
The E2E specs only exercise 7 of 16 roles: `super_admin`, `admin`, `principal`, `hod`, `staff`, `accounts`, `purchase`. Missing coverage for: `regional_admin`, `regional_auditor`, `coordinator`, `institutional_head`, `academic_coordinator`, `exam_coordinator`, `teacher`, `inspector`, `system`.

No dedicated cross-tenant negative boundary E2E specs (e.g., staff from Institution A accessing Institution B's `/leaves/[id]`) were found in the `e2e/` directory — the static `security:tenants` scan covers this statically (100% isolated), but there is no dynamic E2E proof.

---

## Cross-Tenant Negative Boundary Tests

| Check | Outcome | Evidence |
|-------|---------|----------|
| Static tenant isolation (`security:tenants`) | ✅ PASSED | 1,843 files, 0 violations, 100% isolated. |
| Dynamic E2E cross-tenant negative tests | ⚠️ NOT PRESENT | No E2E specs found for cross-tenant `[id]` PATCH/DELETE (leaves, canteen, bookings, help-desk, media, fleet). Covered statically only. |

---

## Stage 3 Consolidated Findings

| # | Severity | Finding | Gate | Action |
|---|----------|---------|------|--------|
| S3-1 | Medium | `src/app/api/attendance/sync/route.ts` [POST] missing `requireAuth` permission param | 13 | Add `"attendance:read"` as second arg (surgical one-line fix) |
| S3-2 | Low | E2E RBAC specs fail due to `LEGACY_SESSION_EXPIRED` (stale staff `tokenVersion` in seed data) | 3.3 | Refresh staff `tokenVersion` in global-setup or clear/re-seed test DB |
| S3-3 | Low | E2E covers only 7/16 roles; no cross-tenant negative E2E specs | 3.3 | Gap noted; static scan provides coverage |

### Artifacts Produced
- `reports/local/tenant-isolation-report.json`
- This report: `reports/release-1.0/stage-3-rbac.md`

---

## Readiness for Stage 4

Stage 3 executed with captured evidence. **1 genuine defect (S3-1)** requires a surgical fix to `attendance/sync/route.ts`. E2E RBAC tests cannot pass until the session seed issue (S3-2) is resolved — this is test infrastructure, not application code. All static RBAC/tenant checks pass.

Proceed to **Stage 4: App UI/UX & Mobile Polish** when ready.
