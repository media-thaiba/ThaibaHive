# Stage 2 Task Specification: Multi-Tenant RBAC, Scope Isolation & Privilege Escalation Guards (`stage2-multi-tenant-rbac-task.md`)

## 1. Objective & Scope
Stage 1 hardened session lifecycle, step-up authentication, and session termination. **Stage 2** establishes strict **Multi-Tenant Scope Isolation, Subordinate Role/Staff Mutation Guards, Department/Institution Query Enforcers, and AST/Route Boundary Verification** across ThaibaHive's dual-dialect stack (LibSQL/SQLite dev & PostgreSQL/`wrapPgDb` prod).

---

## 2. Core Architectural Invariants

### Invariant A: 5-Tier Tenant & Organizational Scope Hierarchy
Every authenticated session and staff action operates within a deterministic scope tier. Unknown or unmapped roles MUST fail closed (`rank = -1`, scope denied).

1. **Tier 1 — Global Scope (`super_admin`, rank 100)**:
   - Unrestricted access across all institutions, regions, and departments.
   - May switch active tenant context via explicit request parameter/header (`x-institution-id` / `institutionId`).
   - Only role permitted to create/promote another `super_admin` or `regional_admin`, or mutate system-level configuration.
2. **Tier 2 — Regional Cluster Scope (`regional_admin`, rank 90)**:
   - Scoped to an assigned list/set of permitted institutions (`allowedInstitutionIds` / regional cluster assignment).
   - Cannot access or mutate data for institutions outside their assigned region.
   - If a `regional_admin` has an empty or null institution cluster assignment, fail closed (`403 Forbidden`).
3. **Tier 3 — Institution / Campus Scope (`principal` / `institutional_head` [rank 70], `admin` [rank 60], `accounts` [rank 50], `purchase` [rank 50])**:
   - Strictly pinned to `session.institutionId`.
   - Any attempt to pass a foreign `institutionId` in query params, JSON body, or headers MUST either be rejected with `403 Forbidden: Cross-tenant access denied` or strictly overridden/validated by `resolveRequestInstitution()`.
   - If `session.institutionId` is `null` or empty for a Tier 3–5 user, fail closed (`403 Forbidden`).
4. **Tier 4 — Department Scope (`hod` / `coordinator`, rank 65)**:
   - Strictly pinned to `session.institutionId` AND scoped to their assigned `departmentId` (or managed department set) for departmental mutations/staff management.
   - Cannot mutate staff, tasks, or departmental records belonging to another department within the same institution.
5. **Tier 5 — Individual Staff Scope (`staff`, rank 40)**:
   - Pinned to `session.institutionId` and `session.staffId` (self-only or explicitly assigned resources).
6. **Protected System Tier (`system`)**:
   - Immutable by standard admin routes; cannot be assigned to human users via API or demoted/deleted.

---

### Invariant B: Privilege Escalation & Staff Mutation Guards
All routes and service functions that create staff, update `staff.role`, change `staff.institutionId`, change `staff.departmentId`, or toggle `staff.isActive` / `tokenVersion` MUST enforce:

1. **Strict Subordinate Ceiling (`targetNewRank < callerRank` & `targetCurrentRank < callerRank`)**:
   - Non-`super_admin` callers can NEVER assign a role with `rank >= callerRank`.
   - Non-`super_admin` callers can NEVER modify, deactivate, or change the role/institution of an existing staff member whose current `rank >= callerRank`.
   - Example: A `principal` (`70`) can create/manage `hod` (`65`), `admin` (`60`), `accounts` (`50`), `purchase` (`50`), and `staff` (`40`), but CANNOT promote anyone to `principal` (`70`), `regional_admin` (`90`), or `super_admin` (`100`), nor modify another `principal`.
2. **Self-Mutation Lock**:
   - A caller cannot mutate their own `role`, `institutionId`, or `isActive` status to escalate privileges or bypass administrative lockouts.
3. **Cross-Tenant Reassignment Prevention**:
   - A caller cannot assign or transfer a staff member to an `institutionId` that the caller does not have administrative authority over.
   - Changing a staff member's `role`, `institutionId`, or `isActive = false` MUST atomically increment `staff.tokenVersion` (and/or revoke active `user_sessions` rows in the same transaction) so stale JWTs with old role/tenant claims are immediately invalidated.
4. **Step-Up Authentication Requirement for High-Risk Role Mutations**:
   - Promoting a user to any administrative role (`rank >= 60`) or mutating `staff.role` / `staff.institutionId` requires a valid, unconsumed step-up token (`action: "staff:role:change"` or `"staff:mutate"`), consumed atomically inside the DB transaction (`step_up_used` table) alongside `cryptoAuditWriter.log()`.

---

### Invariant C: Tenant Isolation Helpers (`resolveScopedInstitutionId` & `resolveRequestInstitution`)
Provide centralized, type-safe guard functions in `@thaiba/auth` / `src/lib/auth/tenant-scope.ts`:

1. **`resolveScopedInstitutionId(session, requestedInstitutionId?, options?)`**:
   - For `super_admin`: returns `requestedInstitutionId ?? session.institutionId` (or allows global `null` only if `options.allowGlobal === true`).
   - For `regional_admin`: verifies the target `institutionId` (`requestedInstitutionId || session.institutionId`) is inside the caller's permitted regional institution set; otherwise throws/returns `TenantScopeError` (HTTP `403`).
   - For all other roles (`principal`, `hod`, `admin`, `accounts`, `purchase`, `staff`):
     - Requires `session.institutionId` to be non-null/non-empty (fails closed with `403` if missing).
     - If `requestedInstitutionId` is provided and `requestedInstitutionId !== session.institutionId`, fails closed with `403 Forbidden: Cross-tenant access denied` (no silent spoofing).
     - Returns `session.institutionId`.
2. **`resolveDepartmentScope(session, requestedDepartmentId?)`**:
   - Enforces institution match first, and for `hod`/`coordinator` enforces that departmental mutations are restricted to their assigned `departmentId`.

---

## 3. Verification Matrix (C2.1 – C2.10)

All tests must be implemented in `packages/auth/__tests__/stage2-multi-tenant-rbac.test.ts` and verified on both **LibSQL/SQLite** and **PostgreSQL (`@electric-sql/pglite` + `wrapPgDb`)**:

- **C2.1 (Tenant Scope Resolution — Tier 3/4/5 Pinning)**: A scoped caller (`principal`, `admin`, `hod`, `staff`) in `inst_A` requesting or mutating resources with `institutionId: "inst_B"` (via query, header, or body) is rejected with `403`. If `requestedInstitutionId` is omitted, it safely resolves to `"inst_A"`.
- **C2.2 (Fail-Closed Null Tenant)**: A non-`super_admin` session with `institutionId: null` or `""` attempting any tenant-scoped operation fails closed with `403`.
- **C2.3 (Regional Admin Cluster Boundary)**: A `regional_admin` assigned to `["inst_A", "inst_B"]` succeeds on `"inst_A"` and `"inst_B"`, but receives `403` when targeting `"inst_C"` or when their allowed cluster list is empty.
- **C2.4 (Super Admin Explicit Context Switching)**: A `super_admin` can target `"inst_A"`, `"inst_B"`, or global scope when `allowGlobal: true` is specified.
- **C2.5 (Role Escalation Ceiling — Target New Rank)**: A `principal` (`70`) or `admin` (`60`) attempting to create a user or update a subordinate's role to an equal or higher rank (`principal`, `regional_admin`, `super_admin`, or `system`) is rejected with `403`.
- **C2.6 (Peer/Superior Protection — Target Current Rank)**: An `admin` (`60`) attempting to modify, demote, or deactivate another `admin` (`60`), `hod` (`65`), or `principal` (`70`) is rejected with `403`.
- **C2.7 (Self-Role / Self-Tenant Mutation Block)**: Any staff member attempting to mutate their own `role` or `institutionId` via staff management endpoints is rejected with `403`.
- **C2.8 (HOD Department Isolation)**: An `hod` (`65`) in `inst_A` / `dept_media` can manage `staff` (`40`) in `inst_A` / `dept_media`, but receives `403` when attempting to manage `staff` in `inst_A` / `dept_finance` or in `inst_B`.
- **C2.9 (Atomic Session & `tokenVersion` Revocation on Role/Tenant Change)**: When a subordinate staff member's `role`, `institutionId`, or `isActive = false` is updated within a transaction, their `staff.tokenVersion` increments and active `user_sessions` are terminated atomically so existing JWTs fail subsequent `verifySession()` calls.
- **C2.10 (Transactional Step-Up & Replay Protection on Role Mutation + PGlite Parity)**: Role mutation requires a valid step-up token, records a `cryptoAuditWriter` entry inside the same transaction, rejects replayed `step_up_used.jti` tokens with `403`, and passes 100% on both LibSQL and PostgreSQL (`PGlite` via `wrapPgDb`).
