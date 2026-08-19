# Sprint-030 Retrospective: Performance Optimization, DB Index Tuning, and Load Hardening

**Sprint ID:** SPRINT-030 (PR-030)  
**Release Version:** v3.14.0  
**Verifier/Manager:** Product Engineering Manager  
**Release Verdict:** APPROVED ✅  
**Retrospective Date:** 2026-08-18  

---

## 1. Executive Summary

Sprint-030 successfully delivered **v3.14.0**, transitioning ThaibaHive from a feature-complete platform into an enterprise-performance-hardened one. Four workstreams were executed: database secondary index tuning, Next.js dynamic bundle code-splitting, k6 concurrent load stress testing, and Playwright E2E spec modernization across 24 legacy files.

All 21 contracted tasks completed. The final full-suite verification recorded **74/74 E2E checks passed (31.6s)** and **0% error rate across all k6 load scenarios at 100 VUs**. However, the sprint encountered a non-trivial post-implementation verification cycle — 5 issues required remediation before the release certificate could be issued — which is the primary focus of this retrospective.

---

## 2. Sprint Wins

### ✅ Database SEARCH TABLE Verified on All 4 Target Tables
All high-volume query patterns — `attendance_logs`, `mark_entries`, `financial_transactions`, `preference_audit_log` — switched from full `SCAN TABLE` to `SEARCH TABLE` (indexed reads). Confirmed with SQLite `EXPLAIN QUERY PLAN` before and after migration. The composite unique index on `mark_entries(examScheduleId, studentId)` additionally enforces data integrity as a side effect.

### ✅ PostgreSQL CONCURRENTLY Migrations — Zero Production Lock Risk
PostgreSQL migrations were manually patched to use `CREATE INDEX CONCURRENTLY`, ensuring the production database can receive this migration without a maintenance window or write lock. This is a disciplined production-first engineering decision.

### ✅ All 4 Dynamic Import Pages Compile Without Hydration Errors
`next/dynamic()` with `ssr: false` was applied to 7 heavy charting components across 4 dashboard routes. Build output confirmed code-split chunks for each. No layout shifts or hydration failures encountered — a historically tricky outcome with Recharts in Next.js App Router.

### ✅ k6 Load Baselines Established — p95 Well Under SLA
Platform performance under 100 concurrent virtual users:

| Endpoint | p95 Latency | SLA Threshold | Headroom |
| :--- | :--- | :--- | :--- |
| `/api/attendance/check-in` | 175ms | 500ms | 65% under |
| `/api/examinations/tabulation` | 115.7ms | 500ms | 77% under |
| `/api/accounts` | 110.6ms | 500ms | 78% under |
| `/api/analytics` | 111.5ms | 500ms | 78% under |

0% error rate across 9,571 total requests. The platform has significant headroom before the SLA threshold is breached.

### ✅ E2E Suite Execution Time: ~8 Minutes → 31.6 Seconds
Eliminating manual UI login flows from all 24 legacy specs — replacing them with cached `storageState` — reduced the total suite execution time by **~93%**. This was the single highest-value productivity improvement of the sprint for the CI/CD pipeline.

### ✅ Two Latent Production Bugs Discovered and Fixed
Two bugs uncovered during E2E hardening that were not on the sprint plan but were fixed inline:
1. **Expense Claim dropzone** — File input was unclickable due to missing `position: relative` on the containing div.
2. **Task creation pagination drift** — `router.push()` executed before the query cache invalidated, leaving the kanban board in a stale state.

---

## 3. Problems Encountered & Resolutions

### Problem 1: `mark_entries` Unique Constraint Blocked by Existing Duplicates
- **Description:** The production-equivalent schema enforces a composite unique constraint on `(exam_schedule_id, student_id)`. The local `dev.db` contained existing duplicate rows from earlier test data generation, causing the migration to fail with a constraint violation.
- **Impact:** Blocked DB-005 execution. Required unplanned scrubbing work before migration could proceed.
- **Resolution:** Wrote and executed a deterministic pre-migration scrubbing script to delete duplicate rows using `rowid NOT IN (SELECT MIN(rowid) ...)`. The script was retained in the migration artifacts for production parity.
- **Root Cause:** No data integrity check was specified in the sprint contract for `mark_entries` prior to adding the unique index. The contract assumed clean data.

### Problem 2: `reviews.spec.ts` Was Not Modernized (Slipped Through Review)
- **Description:** The spec was listed in E2E-001's scope but still used manual `page.fill('#email')` login flows at the time of verification. It was not caught during implementation and was identified only by the independent verifier.
- **Impact:** Caused the initial verification to issue a partial rejection on E2E-001.
- **Resolution:** Fully rewrote the spec with `storageState` auth per role, split into parallel-safe `describe` blocks, and replaced `networkidle` with `domcontentloaded` (the reviews pages use SSE connections that prevent idle state).
- **Root Cause:** The implementation engineer marked E2E-001 as complete without confirming each of the 5 listed files individually. A file-level checklist was not enforced during task execution.

### Problem 3: `approvals.spec.ts` Purchase Flow — Persistent Flakiness
- **Description:** The 4-stage purchase approval flow (Staff → HOD → Accounts → Purchase) intermittently failed in the parallel execution environment. The original fix (`adminPage.reload()`) was insufficient — the subsequent test timeout at `hodContext.close()` indicated the HOD approval step itself was consuming the full 60s test budget.
- **Impact:** One failed spec in the independent verification run; required two remediation cycles.
- **Resolution (final):** Extended the test timeout to 120s, replaced all `networkidle` waits with `domcontentloaded` (SSE connections prevent idle), used explicit dialog-button locator waits (`toBeVisible` before clicking), added `waitForTimeout(1500)` commit guards between stages, and navigated between stages using `goto` rather than `reload`.
- **Root Cause:** Multi-stage stateful flows involving multiple browser contexts and sequential DB writes exceed the default 60s Playwright test timeout. The contract did not specify a timeout budget for the most complex E2E test in the suite.

### Problem 4: DB-006 Tests Were Incorrectly Scoped
- **Description:** The initial DB-006 implementation asserted that columns existed on tables using `getTableColumns()`, rather than verifying that index declarations existed in schema metadata. This means the tests would pass even if all indexes were removed from the schema.
- **Impact:** Tests passed but provided no protective value — a false safety signal.
- **Resolution:** Rewrote all 8 tests to use `getTableConfig().indexes.map(i => i.config.name)` from `drizzle-orm/sqlite-core`, asserting each index by its declared name. This ensures the tests will fail if an index is accidentally removed.
- **Root Cause:** The sprint contract's acceptance criteria stated "Asserts indexed columns are properly declared in the schema metadata" — which is ambiguous between checking column presence and checking index metadata. The engineer defaulted to the simpler column-check implementation.

### Problem 5: Execution Log and Release Document Incomplete at First Submission
- **Description:** The initial `Sprint-030-Execution-Log.md` had E2E and OPS tasks marked as `[ ] Pending` and a `*TBD*` placeholder in the detailed logs section. `Release-Sprint-030.md` was missing entirely.
- **Impact:** Governance documents were incomplete at the time of verification, causing the certification to be deferred.
- **Resolution:** Both documents were fully rewritten with complete task evidence, blocker resolution logs, metrics tables, and migration instructions.
- **Root Cause:** The implementation engineer generated the execution log early in the sprint and did not return to update it after E2E/OPS tasks were completed. No "documentation gate" was enforced before submitting for verification.

---

## 4. Lessons Learned

| # | Lesson | Category | Apply From |
| :--- | :--- | :--- | :--- |
| **L-001** | **File-level E2E checklists are mandatory.** Marking a group task (e.g. "Modernize 5 specs") complete must require confirming each individual file. | Process | Sprint-031 |
| **L-002** | **SSE/WebSocket pages cannot use `networkidle`.** Any page with a persistent connection will block `networkidle` indefinitely. Use `domcontentloaded` + explicit element wait instead. | Engineering | Immediately |
| **L-003** | **Multi-context multi-stage tests need explicit timeouts.** Any test spanning 3+ sequential browser contexts and DB writes should declare `test.setTimeout(120000)` at minimum. | Engineering | Immediately |
| **L-004** | **Pre-migration data audits must be scripted for unique constraints.** Before any migration adding a unique index, a verification query (count of duplicates) must run in the pre-migration step. | Engineering | Sprint-031 |
| **L-005** | **Index unit tests must verify schema metadata, not column presence.** The correct assertion for Drizzle indexes is `getTableConfig().indexes` — not `getTableColumns()`. | Testing | Immediately |
| **L-006** | **Governance documents must be updated as a gate, not an afterthought.** Execution logs and release docs should be updated task-by-task during execution, not written in bulk at the end. | Process | Sprint-031 |
| **L-007** | **`waitForTimeout()` as a commit guard is a code smell.** Hardcoded sleeps are brittle. The correct fix is to wait for a deterministic UI signal (dialog detached, row count changed, toast appeared). Revisit in Sprint-031. | Engineering | Sprint-031 |

---

## 5. Sprint Metrics

| Metric | Contracted Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| **Total Tasks** | 21 | 21 | ✅ 100% |
| **E2E Specs Modernized** | 24 | 24 | ✅ 100% |
| **E2E Checks Passing (Chromium)** | All 28 suites | 74/74 checks | ✅ Exceeded (+2 from reviews) |
| **E2E Suite Duration** | < 2 min | 31.6s | ✅ Exceeded |
| **k6 p95 Latency** | < 500ms (all endpoints) | Max 175ms | ✅ 65–78% under threshold |
| **k6 Error Rate** | < 5% | 0% | ✅ Exceeded |
| **k6 VUs** | 100+ | 100 | ✅ Met |
| **Total k6 Requests** | — | 9,571 | — |
| **DB Indexes Added** | 8 | 8 | ✅ Met |
| **EXPLAIN plans confirmed** | 4 tables | 4 tables | ✅ Met |
| **TypeScript Errors** | 0 | 0 | ✅ Met |
| **Verification Cycles** | 1 (ideal) | 2 (initial rejection + re-verify) | ⚠️ 1 rework cycle |
| **Issues Flagged by Verifier** | 0 (ideal) | 5 | ⚠️ Process gap |
| **Issues Resolved Before Certificate** | N/A | 5/5 | ✅ All cleared |

---

## 6. Reusable Assets Created

### Load Testing Scripts (k6)
Four production-ready k6 scripts in `load-tests/` are now part of the permanent test harness:

| Asset | Path | Purpose |
| :--- | :--- | :--- |
| Attendance Check-In Load Test | [`load-tests/attendance-checkin.js`](file:///D:/ThaibaHive/load-tests/attendance-checkin.js) | 100-VU concurrent check-in stress test with custom rate metric for idempotency-aware error tracking |
| Exam Tabulation Load Test | [`load-tests/exam-tabulation.js`](file:///D:/ThaibaHive/load-tests/exam-tabulation.js) | Tabulation register concurrent retrieval stress test |
| Finance Ledger Load Test | [`load-tests/finance-ledger.js`](file:///D:/ThaibaHive/load-tests/finance-ledger.js) | Concurrent ledger read/write stress test |
| BI Analytics Load Test | [`load-tests/bi-analytics.js`](file:///D:/ThaibaHive/load-tests/bi-analytics.js) | Complex aggregation query stress test |

### Schema Index Testing Pattern
The `getTableConfig().indexes.map(i => i.config.name)` pattern for asserting Drizzle schema index declarations is now established in `src/lib/__tests__/db-indexes.test.ts` and should be used as the canonical template for all future index unit tests.

### Pre-Migration Scrubbing Pattern
The SQL scrubbing pattern for removing duplicates before unique index application is documented in [`Release-Sprint-030.md`](file:///D:/ThaibaHive/.ai/releases/Release-Sprint-030.md) and should be included as a template in any future migration that adds a unique constraint on an existing table.

### Dynamic Import with Named Export Pattern
The `dynamic(() => import("./Component").then(m => m.NamedExport), { ssr: false, loading: () => <Skeleton /> })` pattern is now consistently applied across 4 dashboard routes and serves as the canonical template for all future heavy charting component imports.

### SSE-Safe E2E Navigation Convention
The convention of using `{ waitUntil: "domcontentloaded" }` on pages with Server-Sent Events or WebSocket connections (rather than `networkidle`) is now established and documented in `e2e/reviews.spec.ts` and `e2e/approvals.spec.ts`.

---

## 7. Technical Debt

### Debt Cleared This Sprint
- **24 legacy E2E specs** with manual login flows, hardcoded timeouts, and non-isolated test data — all refactored to storageState auth and structured locator waits.
- **`expense-claim-form-dialog.tsx` CSS layout bug** — file dropzone pointer interception resolved.
- **Task creation stale pagination** — race condition between cache invalidation and router push resolved.

### Remaining / Newly Discovered Debt

| ID | Description | Severity | Recommended Sprint |
| :--- | :--- | :--- | :--- |
| **TD-001** | `approvals.spec.ts` uses `waitForTimeout(1500)` commit guards between approval stages. This is a brittle sleep — should be replaced with a deterministic wait on a visible confirmation element (e.g., a success badge or the item disappearing from the pending list). | Medium | Sprint-031 |
| **TD-002** | E2E specs run only against Chromium in CI. The contract specified Firefox and WebKit cross-browser runs but these were not performed in the final verification due to environment constraints. Firefox and WebKit validation is deferred. | Medium | Sprint-031 |
| **TD-003** | Load tests run against the local standalone server. There is no CI job that automatically runs k6 scripts post-deploy. The load test baseline is a one-time manual exercise, not a continuous regression signal. | Medium | Sprint-032 |
| **TD-004** | The `mark_entries` pre-migration scrubbing script was executed manually and is not committed as a versioned migration hook. If another developer runs migrations on a fresh duplicate-laden database, they will hit the same constraint violation. | Low | Sprint-031 |
| **TD-005** | No real-time latency percentile monitoring (p50, p95, p99) exists in the running application. k6 results are captured once but there is no ongoing observability of query performance under production load. | High | Sprint-032 |
| **TD-006** | Frontend bundle sizes for the 4 dynamically split pages have not been quantitatively measured (no Lighthouse CI or `@next/bundle-analyzer` run). The improvement is qualitative — chunk separation confirmed, but actual payload delta is unknown. | Low | Sprint-031 |

---

## 8. Recommendation for Next Sprint (Sprint-031)

### Recommended Focus: Cross-Browser E2E Hardening + CI/CD Load Test Integration + Data Integrity Guardrails

Based on the technical debt inventory and the lessons from Sprint-030's verification failures, Sprint-031 should address the structural gaps that caused the 2-cycle verification loop.

#### Priority 1 — Cross-Browser E2E Validation (TD-002)
Run the full 28-suite Playwright E2E suite against Firefox and WebKit. Known issues from Sprint-029 (WebKit cookie security, Firefox SSE handling) may resurface with the new storageState-based tests. Resolve any browser-specific failures and add them to the standard CI job matrix.

**Acceptance Criteria:** All 74+ E2E checks pass on Chromium, Firefox, and WebKit locally and in CI.

#### Priority 2 — Replace `waitForTimeout` Commit Guards (TD-001)
Audit all `waitForTimeout()` calls in the E2E suite and replace each with a deterministic signal wait (element detachment, row count change, or success toast locator). This eliminates the most common source of flakiness in multi-stage flows.

**Acceptance Criteria:** Zero `waitForTimeout()` calls in `e2e/` directory.

#### Priority 3 — Commit Pre-Migration Scrubbing as a Versioned Hook (TD-004)
Add the `mark_entries` deduplication script as a committed, versioned pre-migration hook so it is reproducible by any developer or CI pipeline. Consider adding a generic "duplicate audit" step to the migration pipeline for any table receiving a unique constraint.

**Acceptance Criteria:** Pre-migration scrubbing script committed to `drizzle/` or `scripts/` and referenced in migration docs.

#### Priority 4 — k6 CI Integration (TD-003)
Add a GitHub Actions job that runs k6 load scripts against the staging server after each production deploy. Use k6 threshold assertions (`http_req_duration{p(95)}<500`) to gate deployments on performance regression.

**Acceptance Criteria:** k6 job runs on `push` to `main`, fails the CI pipeline if p95 > 500ms.

#### Priority 5 — Bundle Size Measurement (TD-006)
Integrate `@next/bundle-analyzer` or Lighthouse CI to capture a quantitative before/after delta for the 4 dynamic-import pages. Establish bundle size budgets as a CI gate to prevent future regressions.

**Acceptance Criteria:** Bundle analysis report generated on build; initial size budgets established in `package.json` or `.lighthouserc`.

---

*Authored by: Product Engineering Manager*  
*Sprint-030 — v3.14.0 — ThaibaHive*  
*Retrospective Date: 2026-08-18*
