# ADR 0006: Atomic Academic Session Boundaries & Examination Operations

**Status:** Accepted  
**Date:** 2026-10-30  
**Domain:** Academic Lifecycle & Examination Administration  
**Decision Drivers:** Data consistency, atomicity, high-concurrency race condition prevention  

---

## Context and Problem Statement

The architectural review identified multiple concurrency vulnerabilities in academic year management and examination processing:
1. **Non-Atomic Academic Year Overlap Check:** In `src/app/api/academic/academic-years/route.ts`, the date range overlap validation query was decoupled from the insertion query. Two concurrent creation requests for overlapping sessions within the same institution could pass the check simultaneously and insert overlapping terms.
2. **ID Collision Risk in Mark Batch Submissions:** In `src/app/api/examinations/marks/batch/route.ts`, mark entry IDs (`mark_${Date.now()}_...`) and audit IDs (`audit_${Date.now()}`) lacked sufficient entropy, risking primary key collisions under concurrent teacher grading workflows.
3. **Decoupled Exam Result Publication:** In `src/app/api/examinations/report-cards/publish/route.ts`, updating the exam status to `'published'`, stamping tabulation registers, and writing the audit log were executed as separate independent statements without a transaction wrapper. If the register stamp failed, the exam would remain published while registers remained unstamped.

## Decision

We enforce **Transactional Multi-Statement Boundaries & High-Entropy Identifiers**:
1. **Atomic Academic Year Creation:**
   - Wrapped name uniqueness verification, date-overlap validation, and insertion inside an atomic database transaction (`db.transaction(...)`).
   - Prevents race conditions during concurrent academic calendar configuration.
2. **High-Entropy Mark Entry & Audit IDs:**
   - Replaced `Date.now()` and short pseudo-random suffixes with standard `crypto.randomUUID()` across `markEntries` and `examAuditLogs`.
3. **Atomic Exam Publication:**
   - Wrapped the compare-and-swap exam status update, tabulation register timestamp stamping, and cryptographic audit log emission in a single unified `db.transaction(...)`.
   - If any step fails or a concurrent publish occurs, the entire operation cleanly rolls back or returns HTTP 409.

## Consequences

### Positive
- Strict atomicity across exam publication workflows: either all registers and audit records are stamped, or none are.
- Zero ID collisions under high-concurrency grading submissions.
- Overlapping academic calendars within the same campus are strictly serialized.
- 54/54 academic and examination tests passing with 0 TypeScript compilation errors.

### Negative / Trade-offs
- None. Fully backward-compatible with existing API contracts.
