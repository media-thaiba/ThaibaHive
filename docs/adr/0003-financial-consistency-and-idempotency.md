# ADR 0003: Financial Consistency, Idempotency & Database-First State Management

**Status:** Accepted  
**Date:** 2026-10-30  
**Domain:** Finance, Payment Processing & General Ledger  
**Decision Drivers:** Serverless stateless runtime, horizontal multi-worker scaling, double-credit prevention, auditability  

---

## Context and Problem Statement

An architectural review of the financial subsystem revealed several critical race conditions and anti-patterns:
1. **Dual-write memory-first pattern in `FeeDbStore`:** Payments and allocations were written to process-local Maps first, followed by Drizzle database writes in non-atomic catch blocks. In serverless instances or multi-worker deployments, memory was desynced or empty on cold start, causing duplicate payment applications and double crediting.
2. **Process-local webhook deduplication:** `WebhookProcessor.processedKeys` was a transient in-memory `Set<string>`. On process restart or scaling, redelivered gateway webhooks were re-processed.
3. **Collision risks in checkout identifiers:** `PAY-${Date.now()}` and 6-digit `receiptNumber` slices were vulnerable to collisions under millisecond concurrency, while `recordPayment` used `onConflictDoUpdate`, silently overwriting existing payment rows.
4. **False-positive statement reconciliation:** Reconciliation used loose `.includes()` substring matching against bank statement lines, risking misattribution (e.g., `PAY-123` matching `PAY-1234`). Furthermore, reconciliation status was not written back to payment records.
5. **GL journal collisions & counter register untracked totals:** GL journal entry IDs used timestamp prefixes without sufficient entropy, and counter shift closures hardcoded payment counts to 0.

## Decision

We adopt a strict **Database-First Consistency Model** across all financial flows:
1. **DB-First State in `FeeDbStore`:**
   - Inverted write sequence: writes hit the database first inside atomic Drizzle transactions (`db.transaction(...)`).
   - Memory store acts strictly as a cache mirror.
   - `applyPaymentToAllocation` validates idempotency against the database (`feePaymentTransactions`) and locks the application marker row (`fpt_apply_${payment.id}`) before modifying balances.
2. **Persistent Webhook Deduplication:**
   - Added `webhookEvents` table across SQLite and PostgreSQL schemas (`packages/db/schema.ts` and `schema.pg.ts`) with unique constraint on `(gateway, eventId, paymentId)`.
   - `WebhookProcessor` records processed keys to the database, gracefully falling back to memory-only mode in isolated mock tests.
3. **Collision-Proof Identifiers:**
   - Replaced naive timestamp strings with `crypto.randomUUID()` entropy for payment IDs, payment numbers, receipt numbers, and GL journal entries.
   - Switched `feePayments` insertion conflict strategy to `onConflictDoNothing()` to enforce true database uniqueness constraints.
4. **Exact Reconciliation & Payment State Write-Back:**
   - Updated matching logic to use strict equality (`===`) or delimiter-separated token boundaries.
   - Added `reconciledAt` and `reconciliationBatchId` columns to `feePayments` in both SQLite and PostgreSQL schemas with verified parity.
5. **Shift Integrity:**
   - Enforced payment verification on cashier transactions and accurately tracked shift transaction counts at closure.

## Consequences

### Positive
- **Guaranteed Idempotency:** Duplicate webhooks and concurrent payment submissions fail closed or acknowledge idempotently without corrupting balances.
- **Zero Schema Parity Drift:** Verified via `scripts/db/check-schema-parity.ts` (455 tables, 0 warnings/failures).
- **Accurate Audit & General Ledger:** Ledger journal entries and reconciliation links are persistent and collision-free.

### Negative / Trade-offs
- Slight latency increase for webhook processing due to database round-trips for idempotency checks (negligible compared to gateway network times).
