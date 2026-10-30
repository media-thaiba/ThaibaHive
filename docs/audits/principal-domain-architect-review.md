# Principal Domain Architect Review — Multi-Campus Enterprise EdTech/ERP Codebase

**Scope:** Business logic correctness, data consistency, and workflow edge cases across five domains.

---

## 1. Financial / Fee Payment Race Conditions

### 1.1 `FeeDbStore.recordPayment` — Write-Through to Memory-Only Idempotency Marker

**File:** `src/db/fee-store.ts:389-454`

`recordPayment` writes the payment to the in-memory Map **first** (line 390), then attempts the Drizzle insert (line 399). The idempotency check in `applyPaymentToAllocation` (line 501) reads **only** from `this.memoryStore.paymentTransactions`:

```ts
const alreadyApplied = Array.from(this.memoryStore.paymentTransactions.values()).some(
  (tx) => tx.paymentId === payment.id
);
```

**Defect:** In a serverless/Next.js deployment, each request may run in a fresh worker instance. The `memoryStore` Map is empty on cold start. A redelivered webhook or counter duplicate will pass the idempotency check and double-credit the student's balance. The `onConflictDoNothing()` on the Drizzle insert (line 445) only protects the transaction ledger row — it does **not** prevent the in-memory allocation waterfall from re-running because the marker was never written to memory in the prior instance.

**Proposed fix:** Move the idempotency check to a database-level query against `feePaymentTransactions` (e.g., `SELECT ... WHERE paymentId = ?`), not the in-memory Map. The marker insert at line 575 must be the **first** operation in the transaction, before any allocation updates.

### 1.2 `WebhookProcessor.processedKeys` — In-Memory Set Lost on Restart

**File:** `src/lib/operations/finance/gateways/webhook-processor.ts:22, 89-101`

```ts
private processedKeys: Set<string> = new Set();
```

**Defect:** The deduplication set is process-local. On server restart or horizontal scale-out, every pending webhook is reprocessed. Combined with 1.1, this creates a double-credit window.

**Proposed fix:** Persist `processedKeys` to the `feeAuditLogs` or a dedicated `webhook_events` table with a unique constraint on `(gateway, eventId, paymentId)`. Use `ON CONFLICT DO NOTHING` and check the insert's `rowsAffected`.

### 1.3 `checkout/route.ts` — Payment Number Collisions

**File:** `src/app/api/finance/fees/checkout/route.ts`

```ts
paymentNumber = `PAY-${Date.now()}`;
receiptNumber = `RCPT-${Date.now().toString().slice(-6)}`;
```

**Defect:** `Date.now()` has ~1ms granularity. Concurrent requests in the same millisecond produce identical `paymentNumber` values. The 6-digit `receiptNumber` slice has a 1-in-a-million collision per call, but across thousands of payments per day it is statistically inevitable. Neither is unique-constrained at the DB level (the store uses `onConflictDoUpdate`, silently overwriting).

**Proposed fix:** Use `crypto.randomUUID()` or a distributed sequence (e.g., `PAY-<timestamp>-<randomUUID-v4-truncated>`). Add a DB-level `UNIQUE` constraint on `feePayments.paymentNumber` and `feeReceipts.receiptNumber`.

### 1.4 `checkout/route.ts` — Status Set to `initiated` Before Gateway Confirmation

**File:** `src/app/api/finance/fees/checkout/route.ts`

The payment is recorded with `paymentStatus: 'initiated'` **before** the gateway order is confirmed. If the gateway call fails or times out after the DB row is written, the system has an orphaned `initiated` payment that no webhook will ever resolve to `completed`. There is no reconciliation job to sweep stale `initiated` records.

**Proposed fix:** Record the payment only after gateway order creation succeeds, or add a TTL-based sweep job that cancels `initiated` payments older than N minutes.

---

## 2. Academic Lifecycle Transitions

### 2.1 `academic-years/route.ts` — Overlap Check Is Not Atomic

**File:** `src/app/api/academic/academic-years/route.ts:84-107`

The overlap check (lines 96-98) is a separate query **before** the insert (line 109). Two concurrent POSTs can both pass the check and both insert. SQLite's default isolation level means the second insert succeeds unless a trigger or unique constraint fires — and there is none on `(institutionId, startDate, endDate)`.

**Proposed fix:** Add a `CHECK` constraint or a trigger that validates no overlapping ranges exist, or use `BEGIN IMMEDIATE` transaction with a `SELECT ... FOR UPDATE`-equivalent lock on the institution's academic year rows.

### 2.2 `marks/batch/route.ts` — `id: mark_${Date.now()}_...` Collision

**File:** `src/app/api/examinations/marks/batch/route.ts:135`

```ts
id: `mark_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
```

The `Date.now()` prefix is not unique across concurrent batch submissions. The random suffix is only 5 chars (base-36 ≈ 60 million possibilities). With 10+ concurrent teachers submitting batches, collisions are plausible. The audit log at line 156 uses `id: audit_${Date.now()}` — even worse, no random component at all.

**Proposed fix:** Use `crypto.randomUUID()` for all generated IDs. Add a `UNIQUE` constraint on `markEntries.id`.

### 2.3 `marks/batch/route.ts` — Audit Log Outside the Transaction? No, It's Inside, But…

**File:** `src/app/api/examinations/marks/batch/route.ts:99-167`

The audit log is correctly inside the transaction (line 155). However, if the transaction fails mid-loop (e.g., line 118 throws for an approved mark), the entire transaction rolls back — including the audit log. This is correct behavior. **No defect here.** ✅

### 2.4 `report-cards/publish/route.ts` — Atomic Status Flip Is Correct

**File:** `src/app/api/examinations/report-cards/publish/route.ts:56-67`

The `UPDATE ... WHERE status = ?` with `returning()` is a well-known atomic compare-and-swap pattern. If two admins hit publish concurrently, only one succeeds (line 62-67 returns 409 for the loser). **This is a textbook correct pattern.** ✅

### 2.5 `report-cards/publish/route.ts` — Tabulation Register Stamp Is Not Atomic With the Exam Status Flip

**File:** `src/app/api/examinations/report-cards/publish/route.ts:56-73`

The exam status flip (line 56-60) and the tabulation register stamp (line 70-73) are **separate statements, not in a transaction**. If the second statement fails (e.g., a trigger error), the exam is marked `published` but the registers are not stamped. There is no compensating transaction.

**Proposed fix:** Wrap both statements (and the audit log) in `db.transaction(...)`.

---

## 3. Attendance / Biometric Sync Conflicts

### 3.1 `rebuildAttendanceDayProjection` — Not Transactional, Read-Then-Write Race

**File:** `src/lib/attendance/sync-engine.ts:74-292`

The function reads all events (line 81-90), computes projections, then upserts `attendanceDays` (line 166) and `attendanceLogs` (line 243). Two concurrent sync batches for the same staff/date can interleave: Batch A reads events, Batch B reads events + inserts a new event, Batch A writes projection (missing B's event), Batch B writes projection (correct). The final state is correct **only if B writes last**. If the order is A→B→A, the projection is stale.

**Proposed fix:** Wrap the entire read-compute-write in a transaction with a `SELECT ... FOR UPDATE` lock on the `attendanceDays` row for `(staffId, localDate)`. Alternatively, make the projection a **trigger-based** materialized view (on `attendanceEvents` INSERT) rather than an application-level rebuild.

### 3.2 `firstIn` / `lastOut` Computed From All Events Including Mocked/Clock-Skew Punches

**File:** `src/lib/attendance/sync-engine.ts:94-98`

```ts
const inEvents = events.filter((e) => e.kind === "in");
const outEvents = events.filter((e) => e.kind === "out");
const firstIn = inEvents.length > 0 ? inEvents[0].effectiveAt : null;
const lastOut = outEvents.length > 0 ? outEvents[outEvents.length - 1].effectiveAt : null;
```

**Defect:** Events with flags `mock_location`, `clock_skew`, or `geofence_violation` are **included** in `firstIn`/`lastOut`. A mocked punch at 06:00 AM will set `firstIn` to 06:00 even if the real first punch was 09:00. The `needsReview` flag is set (line 136-139), but the **projection itself is polluted** — downstream consumers (payroll, attendance percentage) use the polluted values.

**Proposed fix:** Filter out flagged events from the `firstIn`/`lastOut` computation, or add a separate `trustedFirstIn`/`trustedLastOut` field that excludes flagged events.

### 3.3 `processAttendanceSyncBatch` — Idempotency Check Is Correct

**File:** `src/lib/attendance/sync-engine.ts:349-368`

The `clientEventId` uniqueness check uses a DB query with a `UNIQUE` constraint fallback (line 432). **This is a correct pattern.** ✅

---

## 4. Multi-Campus Resource Scheduling Clashes

### 4.1 `allocateHostelBed` — SQLite Path Has No Capacity Lock

**File:** `src/lib/hostel/bed-allocation-service.ts:150-259`

The Postgres path (line 45-147) uses `SELECT ... FOR UPDATE` on `hostel_rooms` (line 106) to serialize concurrent allocations and prevent capacity races. **The SQLite path (line 150-259) does NOT.** It uses `BEGIN IMMEDIATE` (line 154) which provides write-write serialization but **does not lock the room row**. The capacity check at line 220-234 is a plain `SELECT count(*)`. Two concurrent allocations can both read `active_count = capacity - 1`, both pass the check, and both insert — overcapacity.

**Proposed fix:** In the SQLite path, after `BEGIN IMMEDIATE`, do a `SELECT ... FOR UPDATE` equivalent. SQLite doesn't support row locks, but `BEGIN IMMEDIATE` acquires a write lock on the entire database, which serializes the check-and-insert. The issue is that the check at line 220 happens **after** the transaction starts but the lock is database-wide, so it should be safe… unless the `client.execute("BEGIN IMMEDIATE")` at line 154 silently fails (line 156-158 catches and ignores the error), falling back to autocommit mode where the race is live.

**The catch block at line 156-158 is the defect:**
```ts
try {
  await client.execute("BEGIN IMMEDIATE;");
  ownsSqliteTx = true;
} catch {
  // Already inside an active transaction
}
```
If `BEGIN IMMEDIATE` fails for any reason other than "already in transaction" (e.g., database is locked), the error is silently swallowed and `ownsSqliteTx` remains `false`. The subsequent `ROLLBACK`/`COMMIT` calls at lines 232/247 are guarded by `ownsSqliteTx`, so they are skipped — but the allocation insert at line 237 still runs in autocommit mode. **The capacity race is live.**

### 4.2 `allocateHostelBed` — No Overlap Check With Existing Allocations by Date Range

**File:** `src/lib/hostel/bed-allocation-service.ts`

The function checks that the room is not at capacity (line 118/231) and that the bed is not in maintenance (line 69/179). It does **not** check whether the student already has an active allocation in the **same academic year** (a student cannot occupy two beds). It also does not check whether the allocation's date range overlaps with an existing allocation on the same bed (a bed cannot have two overlapping allocations).

**Proposed fix:** Add a query: `SELECT ... FROM hostel_bed_allocations WHERE student_id = ? AND academic_year_id = ? AND vacated_at IS NULL` before inserting.

---

## 5. Staff Onboarding / Offboarding & Permission Drift

### 5.1 `autoAssignOnboardingChecklists` — Fire-and-Forget With Bare Catch

**File:** `src/lib/onboarding/auto-assign.ts:61-82`

```ts
export async function autoAssignOnboardingChecklists(...) {
  try {
    await assignChecklistsFromTemplates(...);
  } catch (err) {
    console.error("[autoAssignOnboardingChecklists] Failed:", err);
  }
}
```

Called from `src/app/api/staff/route.ts:331`:
```ts
autoAssignOnboardingChecklists(safeStaff.id, session.staffId);
```

**Defects:**
1. **Fire-and-forget** — the `await` is missing. If the caller returns before the checklists are assigned, a user refreshing the UI sees "no checklists" until the background task completes.
2. **Bare catch** — any failure (DB connection loss, constraint violation) is logged and swallowed. The staff member is created but has no onboarding checklist. There is no retry, no DLQ, no alert.
3. **Outside the transaction** — the checklists are assigned **after** the staff insert commits (line 331 is after the `db.transaction` block at line 245-318). If the checklist assignment fails, the staff member exists in a dangling state.

**Proposed fix:** Move `autoAssignOnboardingChecklists` **inside** the transaction at line 245-318. If it must be async, await it and return an error response if it fails.

### 5.2 Offboarding — No `tokenVersion` Bump, No Session Invalidation

**File:** `src/lib/onboarding/auto-assign.ts:73-82` (offboarding) and `src/app/api/auth/revoke/route.ts`

The offboarding flow:
1. `autoAssignOffboardingChecklists` is called — assigns checklists only. **Does not revoke access.**
2. The `revoke/route.ts` handler increments `tokenVersion` (wrapped in a bare catch — non-fatal) and broadcasts a `session_invalidated` SSE event (fire-and-forget).

**Defect:** If the `tokenVersion` increment fails (caught silently), the staff member's existing sessions remain valid. The SSE broadcast is also fire-and-forget — if the client is offline, they re-authenticate with the old `tokenVersion` and gain access.

**Proposed fix:** Make the `tokenVersion` increment **fatal** — if it fails, the offboarding transaction must roll back. Use a database trigger or a `SELECT ... FOR UPDATE` on the staff row to serialize revocation.

### 5.3 `marketplace/uninstall/route.ts` — Permission Re-Check Not Forced

**File:** `src/app/api/marketplace/uninstall/route.ts`

Sets `userAppAssignments.status = "revoked"` but does **not** trigger a permission re-evaluation. If the staff member has a cached session, their in-memory permission set still includes the uninstalled app's scopes.

**Proposed fix:** After uninstall, broadcast a `permissions_changed` event (like `session_invalidated`) and bump the staff's `tokenVersion`.

---

## 6. Cross-Cutting Findings

### 6.1 `FeeDbStore` — Dual Write Pattern (Memory + DB) Without Atomicity Guarantee

**File:** `src/db/fee-store.ts` (throughout)

Every method writes to the in-memory Map **first**, then attempts the Drizzle write in a `try/catch` (`handlePersistenceError`). If the DB write fails, the in-memory state diverges from the database. On the next server restart, `ensureHydrated` (line 98) re-reads from the DB, overwriting the in-memory state — but any **uncommitted in-memory changes** from the failed-write window are lost.

**This is a classic dual-write anti-pattern.** The in-memory Map should be a **read-through cache**, not a write-through primary. All writes must go to the DB first, then invalidate/update the cache.

### 6.2 `CounterRegisterEngine` — Shift Totals Not Linked to Payment Ledger

**File:** `src/lib/operations/finance/counter/counter-register-engine.ts:64-96`

`recordShiftTransaction` increments `systemCashTotal`/`systemPosTotal`/`systemChequeTotal` on the shift row but does **not** verify that a corresponding `feePayment` row exists with the same amount and method. A cashier can manually call this endpoint with fabricated amounts, inflating shift totals without any corresponding payment.

**Proposed fix:** `recordShiftTransaction` should accept a `paymentId` and verify the payment exists, is `completed`, belongs to the same institution, and has not already been counted against this shift.

### 6.3 `closeShift` — `paymentCount` Hardcoded to 0

**File:** `src/lib/operations/finance/counter/counter-register-engine.ts:168`

```ts
paymentCount: 0,
```

The shift summary always reports 0 payments regardless of how many transactions were recorded. This is a cosmetic bug with serious implications: a shift closure audit trail cannot verify the number of transactions processed.

**Proposed fix:** Track a `transactionCount` field on the shift row, increment it in `recordShiftTransaction`, and return it in `closeShift`.

### 6.4 `reconciliation-engine.ts` — Substring Matching Causes False Matches

**File:** `src/lib/operations/finance/reconciliation/reconciliation-engine.ts:64-68`

```ts
if (
  (p.transactionReference && line.referenceNumber.includes(p.transactionReference)) ||
  line.referenceNumber.includes(p.paymentNumber) ||
  ...
)
```

`line.referenceNumber.includes(p.paymentNumber)` is a **substring** match, not an equality match. A bank statement line with reference `PAY-1234` will match a payment with number `PAY-123` (because `"PAY-1234".includes("PAY-123")` is `true`). This causes **false-positive reconciliation** — a payment is marked as reconciled against the wrong bank line.

**Proposed fix:** Use exact equality (`===`) or a regex with word boundaries. If substring matching is intentional (e.g., bank references truncate long payment numbers), use a configurable prefix-length match with a minimum length threshold.

### 6.5 `reconciliation-engine.ts` — No Write-Back of Reconciliation Status

**File:** `src/lib/operations/finance/reconciliation/reconciliation-engine.ts:132`

The engine creates a `feeReconciliationBatch` row but does **not** update the matched `feePayments` with a `reconciliationStatus` or `reconciledAt` timestamp. Re-running the engine re-matches everything from scratch, producing duplicate batches.

**Proposed fix:** After matching, `UPDATE feePayments SET reconciledAt = ?, reconciliationBatchId = ? WHERE id IN (...)`. Add a guard in `reconcileStatement` to skip already-reconciled payments unless a `force: true` flag is passed.

### 6.6 `fee-gl-engine.ts` — Journal Entry IDs Use `Date.now()` Collisions

**File:** `src/lib/operations/finance/gl/fee-gl-engine.ts:42, 66, 97, 115, 143, 176, 193`

Every GL journal entry ID is `gl_${Date.now()}_...`. Concurrent journal generation produces colliding IDs. If these are inserted into a table with a primary key on `id`, the second insert silently overwrites the first (or throws a constraint error).

**Proposed fix:** Use `crypto.randomUUID()` for GL entry IDs.

---

## Summary of Severity Ratings

| # | Finding | Domain | Severity |
|---|---------|--------|----------|
| 1.1 | Idempotency marker read from in-memory Map only | Financial | **Critical** |
| 1.2 | `processedKeys` Set lost on restart | Financial | **Critical** |
| 1.3 | `paymentNumber`/`receiptNumber` collision risk | Financial | **High** |
| 1.4 | `initiated` status orphaned on gateway failure | Financial | **High** |
| 2.1 | Academic year overlap check not atomic | Academic | **High** |
| 2.2 | `markEntries.id` collision in batch route | Academic | **High** |
| 2.5 | Tabulation stamp not atomic with exam status flip | Academic | **Medium** |
| 3.1 | `rebuildAttendanceDayProjection` not transactional | Attendance | **High** |
| 3.2 | Mocked/clock-skew punches pollute `firstIn`/`lastOut` | Attendance | **Medium** |
| 4.1 | SQLite path silently falls back to autocommit on `BEGIN IMMEDIATE` failure | Scheduling | **Critical** |
| 4.2 | No duplicate-bed-allocation check for same student/year | Scheduling | **Medium** |
| 5.1 | Onboarding checklists fire-and-forget, outside transaction | Staff | **High** |
| 5.2 | Offboarding doesn't atomically revoke sessions | Staff | **Critical** |
| 5.3 | Marketplace uninstall doesn't force permission re-check | Staff | **Medium** |
| 6.1 | Dual-write anti-pattern in `FeeDbStore` | Financial | **Critical** |
| 6.2 | `recordShiftTransaction` doesn't verify payment exists | Financial | **High** |
| 6.3 | `paymentCount` hardcoded to 0 in `closeShift` | Financial | **Low** |
| 6.4 | Substring matching in reconciliation causes false positives | Financial | **High** |
| 6.5 | No write-back of reconciliation status to payments | Financial | **Medium** |
| 6.6 | GL journal entry ID collisions | Financial | **Medium** |
