# ADR 0002: Decommissioning In-Memory Revocation Store in Favor of Database-Backed Session Lifecycle

**Status:** Accepted  
**Date:** 2026-10-30  
**Domain:** Identity, Authentication & Staff Lifecycle  
**Decision Drivers:** Serverless stateless runtime, multi-instance concurrency, zero-trust token invalidation  

---

## Context and Problem Statement

A security and architecture audit revealed that `RevocationStore` and `revocation-mesh.ts` maintained process-local in-memory bloom filters and maps for session invalidation. However:
1. `packages/auth/session.ts:verifySession()` does not consult `RevocationStore`. It evaluates `staff.isActive`, `staff.tokenVersion`, and `userSessions.status` directly via a database join.
2. In-memory revocation data is wiped upon serverless function cold starts and container restarts.
3. Multiple write paths (`/api/auth/revoke`, SOAR lockdown action, `/api/auth/login`) wrote only to the in-memory store or swallowed DB token bump errors with bare `catch {}` blocks.

## Decision

We adopt **Path A: Full Decommissioning of In-Memory Revocation Stores**.
1. Decommission and remove `src/lib/identity/revocation-store.ts` and `src/lib/identity/revocation-mesh.ts`.
2. Migrate all revocation operations to the proven, database-backed atomic transaction pattern established in `src/app/api/staff/[id]/route.ts`:
   - Increment `staff.tokenVersion` fatally.
   - Update `userSessions.status = "terminated"` and set `logoutAt = Date.now()`.
   - Record immutable audit logs inside the same transaction.
3. Wrap all sensitive session invalidations (`/api/auth/revoke`, `/api/auth/me` password change, `/api/marketplace/uninstall`, SOAR identity lockdown) in atomic database transactions.
4. Move onboarding and offboarding checklist assignments inside transactional boundaries.

## Consequences

### Positive
- Single source of truth: Authentication decisions and session revocations rely exclusively on the database.
- Zero distributed sync overhead: Eliminates in-memory mesh propagation and bloom-filter drift across serverless instances.
- Zero schema changes: Leverages existing, tested columns (`staff.tokenVersion`, `userSessions.status`).
- Strong auditability: Every revocation is committed to database audit logs within the same transaction.

### Negative / Trade-offs
- Requires updating existing unit and integration tests that mocked the in-memory `RevocationStore`.
