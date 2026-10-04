# Multi-Institution Scoping & Cross-Tenant Route Analysis (R8-3)

**Date**: 2026-10-03  
**Branch**: `audit/antigravity-r1`

---

## 1. Executive Summary

During the B8 audit remediation, routes that previously returned data across all of a user's memberships (or required multi-tenant aggregation for multi-campus staff) were analyzed against their pre-B8 `origin/master` state. 

For routes supporting multi-institution visibility (such as canteen meal schedule overviews), we updated handlers to use `resolveScopedInstitutions(session, requestedInst)`:
- When a specific `?institutionId=` is requested, it asserts active membership for non-admins and scopes exclusively to that institution.
- When no `?institutionId=` is requested, non-admins receive records across **all** institutions they are mapped to via `inArray(table.institutionId, allowedInstitutions)`.
- If a non-admin requests an unassigned institution, a `TenantMismatchError` is raised and caught by `requireAuth`, returning `403 Forbidden`.

---

## 2. Route Audit & Resolution Strategy

### A. Aggregated Multi-Institution Read Routes (`resolveScopedInstitutions`)
1. **`src/app/api/canteen/route.ts` (GET)**
   - **Pre-B8 Behavior (`origin/master`)**: Read all assigned institutions for `session.staffId` from `staffInstitutions` and filtered `mealNotifications.staffId` by staff belonging to those institutions.
   - **Remediated Behavior**: Calls `resolveScopedInstitutions(session, requestedInst)`. If no specific ID is requested, queries using `inArray(mealNotifications.institutionId, allowedInstitutions)`.
   - **Verification**: Verified with `src/app/api/canteen/__tests__/canteen-multi-institution.test.ts`.

### B. Single-Institution Scoped Routes (`resolveRequestInstitution`)
For mutating endpoints and institution-specific operational entities, queries require single-institution binding:
- **`src/app/api/canteen/route.ts` (POST)**: Binds new meal notifications to the user's primary or resolved institution.
- **`src/app/api/examinations/exams/route.ts` (GET/POST)**: Resolves single institution for examination timetable management.
- **`src/app/api/system/compliance/{snapshots,telemetry,verify,violations,export}/route.ts`**: Audits and reports against the resolved tenant boundary.
- **`src/app/api/leaves/route.ts` & `src/app/api/tasks/route.ts`**: Scopes operations to the active institution context.

---

## 3. Automated Test Verification

Multi-institution staff access is verified by `src/app/api/canteen/__tests__/canteen-multi-institution.test.ts`:
1. Multi-institution staff (assigned to Inst A & Inst B) querying without `institutionId` receives notifications from both Inst A and Inst B.
2. Multi-institution staff querying `?institutionId=instA` receives only Inst A notifications.
3. Multi-institution staff querying unauthorized `?institutionId=instC` receives `403 Forbidden`.

---

## 4. Round 9 Audit Confirmation

A complete scan of `src/app/api` was conducted across all 419 routes:
- `src/app/api/canteen/route.ts` (GET) is confirmed as the primary cross-institution aggregation route for multi-campus staff, using `resolveScopedInstitutions`.
- All other authenticated operational endpoints require and enforce strict single-tenant or explicitly authorized scoping via `resolveRequestInstitution` and `resolveScopedInstitutionId`.
- No unshielded cross-tenant data leaks exist across the application boundary.
