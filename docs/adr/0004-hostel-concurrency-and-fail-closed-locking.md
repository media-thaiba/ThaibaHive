# ADR 0004: Hostel Concurrency & Fail-Closed Transaction Guarantees

**Status:** Accepted  
**Date:** 2026-10-30  
**Domain:** Multi-Campus Scheduling & Hostel Resource Allocation  
**Decision Drivers:** Data integrity, race condition elimination, multi-engine locking semantics (PostgreSQL vs. SQLite)  

---

## Context and Problem Statement

The architectural review highlighted critical concurrency hazards in hostel room and bed allocation (`src/lib/hostel/bed-allocation-service.ts`):
1. **Silent Fallback to Autocommit in SQLite:** On SQLite/LibSQL, `BEGIN IMMEDIATE` was wrapped in a bare `catch {}` block that assumed failure only occurred if already inside an active transaction. Under database locking contention (`SQLITE_BUSY` or lock timeout), this error was silently swallowed, leaving `ownsSqliteTx = false` and causing the subsequent room capacity checks and insert statements to run in **autocommit mode**, exposing bed and room capacity to concurrency races.
2. **Missing Active Overlap Checks:**
   - Active bed collision: While the database unique constraints protect against duplicate active beds, concurrent attempts would fail at the constraint level rather than being detected proactively within the transactional check boundary.
   - Student double-allocation: A student was not prevented from holding active allocations across multiple beds simultaneously in the same academic year / institution.

## Decision

We enforce **Explicit Concurrency Checks & Fail-Closed Locking**:
1. **Fail-Closed SQLite `BEGIN IMMEDIATE`:**
   - Evaluated the error thrown by `BEGIN IMMEDIATE`.
   - Only recognized nested-transaction errors (e.g. `cannot start a transaction within a transaction`) are tolerated. Real lock failures (`SQLITE_BUSY`, database locked, or timeout) fail closed immediately, returning a concurrency error.
2. **Active Bed & Student Collision Pre-Checks:**
   - **Bed Collision Guard:** Added a check for `WHERE bed_id = ? AND institution_id = ? AND vacated_at IS NULL` returning `collisionType: "bed_collision"`.
   - **Student Collision Guard:** Added a check for `WHERE student_id = ? AND academic_year_id = ? AND institution_id = ? AND vacated_at IS NULL` returning `collisionType: "student_collision"`.
3. **Entropy-Safe IDs:**
   - Replaced `Date.now()` timestamp strings with `crypto.randomUUID()` (`alloc_${crypto.randomUUID()}`).
4. **PostgreSQL & SQLite Dual-Path Parity:**
   - Mirrored the exact check ordering and locking guarantees across both engines (`FOR UPDATE` row locking on PostgreSQL, `BEGIN IMMEDIATE` on SQLite).

## Consequences

### Positive
- Room capacity and bed allocation concurrency are fully serialized and fail closed.
- Eliminates student over-allocation across academic terms.
- Clean integration with HTTP 409 mapping in `src/app/api/hostel/allocations/route.ts`.
- Zero schema migration required (relies on existing columns and constraints).

### Negative / Trade-offs
- An additional `SELECT` query per allocation attempt (negligible latency impact in transaction).
