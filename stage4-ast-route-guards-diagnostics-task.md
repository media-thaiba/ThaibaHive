# Stage 4 Task Specification: Static AST Route Guard & Tenant Boundary Scanner, Permission Coverage Verifier & Diagnostic Health Suite (`stage4-ast-route-guards-diagnostics-task.md`)

## 1. Objective & Scope
Building directly upon the hardened session lifecycle (Stage 1), 5-tier multi-tenant RBAC (Stage 2), and tamper-evident cryptographic audit ledger (Stage 3), **Stage 4** introduces a zero-defect static security analysis engine and enterprise diagnostic health subsystem:
1. **Static TypeScript AST Route Guard & Shield Scanner**: Analyzes all route files under `src/app/api/**/route.ts` using the TypeScript Compiler API. Guarantees 100% of exported HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) are wrapped in approved security decorators (`requireAuth`, `withDPoP`, `verifyWebhookHmac`) with zero unauthorized naked handlers.
2. **Strict RBAC Permission AST Verifier**: Inspects every permission string literal passed to `requireAuth(handler, "permission:key")`. Asserts that every declared permission is registered in `ROLE_PERMISSIONS` in `packages/auth/roles.ts`, rejecting unmapped permissions or syntax typos at build/test time.
3. **Tenant Boundary AST Enforcement**: Verifies that every mutation route (`POST`, `PUT`, `PATCH`, `DELETE`) operating on institution-scoped data calls `resolveScopedInstitutionId` or validates the session's institution scope, preventing cross-tenant leakage or parameter tampering.
4. **Step-Up Authentication AST Guard**: Confirms that high-risk administrative operations (audit export, staff credential reset, session revocation) enforce action step-up tokens.
5. **Enterprise System Health Diagnostics Endpoint (`GET /api/admin/diagnostics/health`)**: Real-time diagnostic endpoint guarded by RBAC (`system:diagnostics:read`), reporting database latency, dialect (`sqlite` / `postgres`), immutability trigger status, active session count, cryptographic audit sequence head, and clock skew.
6. **Dual-Dialect Parity**: Complete compatibility across SQLite/LibSQL and PostgreSQL (`wrapPgDb` / `PGlite`).

---

## 2. Core Security & Architectural Invariants

### Invariant A: Fail-Closed AST Route Shielding
- Every exported HTTP handler in `src/app/api/**/route.ts` MUST be wrapped by a recognized security shield unless explicitly exempted by a strict, non-wildcard exemption allowlist.
- Exempt routes (e.g. `/api/auth/login`, Webhook HMAC verification) must be enumerated with explicit rationale and validated against unauthorized expansion.

### Invariant B: Zero-Unmapped-Permission Policy
- Any permission string passed to `requireAuth(..., "...")` that is not present in `ALL_VALID_PERMISSIONS` in `packages/auth/roles.ts` is considered a critical security defect that fails CI/CD.

### Invariant C: Tenant Isolation on State-Changing Routes
- All state-changing route handlers (`POST`, `PATCH`, `PUT`, `DELETE`) on multi-tenant entities MUST invoke tenant scoping logic (`resolveScopedInstitutionId`) to validate that the caller has authority over the target tenant.

### Invariant D: Live System Health & Immutability Verification
- The health diagnostics route `/api/admin/diagnostics/health` must probe database connection responsiveness, verify the existence of Stage 3 immutability triggers (`trg_audit_logs_no_update`, `trg_audit_logs_no_delete`), check active session counts, and return the latest cryptographic hash-chain head.

---

## 3. Verification Criteria (C4.1 – C4.10)

- **C4.1: AST Route Guard Scanner**: 100% of exported route handlers in `src/app/api/**/route.ts` are inspected. Any unshielded handler in non-exempt routes flags as a failure with file, line, and column.
- **C4.2: Zero-Unmapped-Permission AST Enforcement**: Extracts all permission arguments from `requireAuth` calls and asserts membership in `packages/auth/roles.ts`.
- **C4.3: Mutation Route Tenant Scoping Audit**: Audits `POST`, `PUT`, `PATCH`, `DELETE` handlers against multi-tenant schemas to verify `resolveScopedInstitutionId` resolution.
- **C4.4: High-Risk Step-Up Authentication AST Guard**: Asserts sensitive administrative routes (`export`, `reset-sso`, `revoke`) verify and consume step-up tokens.
- **C4.5: Explicit Strict Exemption Matrix**: All exemptions are locked in a formal matrix with strict regex / path matching.
- **C4.6: Enterprise Diagnostics Health API (`/api/admin/diagnostics/health`)**: Implements `GET /api/admin/diagnostics/health` guarded by `system:diagnostics:read`, returning DB connectivity, trigger health, session counts, and audit head status.
- **C4.7: Automated CLI Scanner (`pnpm security:ast-shield`)**: CLI entry point with `--strict` and `--json` exit code enforcement.
- **C4.8: Automated Jest Test Battery (`stage4-ast-route-guards.test.ts`)**: Automated test suite executing AST inspection across all platform routes.
- **C4.9: Diagnostic Health API Test Battery (`stage4-diagnostics-health.test.ts`)**: Unit and integration tests for `/api/admin/diagnostics/health` asserting authentication, permission blocks, and response structure.
- **C4.10: PostgreSQL / PGlite Dual-Dialect Parity**: Validates health endpoint and trigger inspection on PostgreSQL (`wrapPgDb` / `PGlite`).
