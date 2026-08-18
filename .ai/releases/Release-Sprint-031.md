# Release Notes: Sprint-031 — Cross-Browser E2E Hardening, CI Load Test Integration & Data Integrity Guardrails

**Release Version:** v3.15.0  
**Sprint ID:** SPRINT-031  
**Release Date:** 2026-08-18  
**Status:** ✅ RELEASED  
**Previous Version:** v3.14.0  

---

## Release Summary

Sprint-031 transitions ThaibaHive from v3.14.0 to **v3.15.0**, delivering enterprise-grade quality assurance automation, cross-browser test coverage, CI performance regression gating, database migration data-scrubbing hooks, and bundle size observability.

All 18 implementation tasks have been completed and verified.

---

## Files Changed & Created

### CI/CD Automation & GitHub Actions
| File | Change |
| :--- | :--- |
| [`.github/workflows/ci.yml`](file:///D:/ThaibaHive/.github/workflows/ci.yml) | Added cross-browser matrix (`[chromium, firefox, webkit]`) for E2E tests with 30-min timeout, per-browser artifact reports, and added automated `load-tests` CI job with k6 installation and server warmup. |

### E2E Test Suite Hardening (`waitForTimeout` Elimination)
| File | Change |
| :--- | :--- |
| [`e2e/approvals.spec.ts`](file:///D:/ThaibaHive/e2e/approvals.spec.ts) | Replaced 2 `waitForTimeout(1500)` calls with deterministic `expect(dialogBtn).not.toBeAttached()` assertions. |
| [`e2e/attendance-workflow.spec.ts`](file:///D:/ThaibaHive/e2e/attendance-workflow.spec.ts) | Replaced `waitForTimeout(1000)` with auto-retrying row visibility assertion. |
| [`e2e/auth.spec.ts`](file:///D:/ThaibaHive/e2e/auth.spec.ts) | Removed unnecessary pre-submit `waitForTimeout(100)` sleeps. |
| [`e2e/global-setup.ts`](file:///D:/ThaibaHive/e2e/global-setup.ts) | Removed `waitForTimeout(200)` in favor of `Promise.all` with `page.waitForURL`. |
| [`e2e/helpers/auth-helper.ts`](file:///D:/ThaibaHive/e2e/helpers/auth-helper.ts) | Removed `waitForTimeout(200)` in favor of `Promise.all` with `page.waitForURL`. |

### Pre-Migration Data Guardrails
| File | Change |
| :--- | :--- |
| [`scripts/pre-migration/mark-entries-dedup.sql`](file:///D:/ThaibaHive/scripts/pre-migration/mark-entries-dedup.sql) | **NEW** — Idempotent SQL queries for deduplicating `mark_entries` on `(exam_schedule_id, student_id)`. |
| [`scripts/pre-migration/mark-entries-dedup.ts`](file:///D:/ThaibaHive/scripts/pre-migration/mark-entries-dedup.ts) | **NEW** — Programmatic TypeScript deduplication runner using Drizzle ORM. |
| [`scripts/pre-migration/README.md`](file:///D:/ThaibaHive/scripts/pre-migration/README.md) | **NEW** — Pre-migration scrubbing runbook for SQLite and PostgreSQL. |
| [`src/lib/__tests__/pre-migration-dedup.test.ts`](file:///D:/ThaibaHive/src/lib/__tests__/pre-migration-dedup.test.ts) | **NEW** — Unit tests asserting duplicate detection, latest-record retention, and idempotency. |

### Load Testing Scripts & Documentation
| File | Change |
| :--- | :--- |
| [`load-tests/attendance-checkin.js`](file:///D:/ThaibaHive/load-tests/attendance-checkin.js) | Dynamic `__ENV.VUS` and `__ENV.DURATION` scenario configuration. |
| [`load-tests/bi-analytics.js`](file:///D:/ThaibaHive/load-tests/bi-analytics.js) | Dynamic `__ENV.VUS` and `__ENV.DURATION` scenario configuration. |
| [`load-tests/exam-tabulation.js`](file:///D:/ThaibaHive/load-tests/exam-tabulation.js) | Dynamic `__ENV.VUS` and `__ENV.DURATION` scenario configuration. |
| [`load-tests/finance-ledger.js`](file:///D:/ThaibaHive/load-tests/finance-ledger.js) | Dynamic `__ENV.VUS` and `__ENV.DURATION` scenario configuration. |
| [`load-tests/README.md`](file:///D:/ThaibaHive/load-tests/README.md) | Updated guide with CI execution and threshold definitions. |

### Bundle Observability & Budgets
| File | Change |
| :--- | :--- |
| [`package.json`](file:///D:/ThaibaHive/package.json) | Added `build:analyze`, `test:load`, and `premigrate` npm scripts. |
| [`bundle-analysis/baseline-v3.15.0.json`](file:///D:/ThaibaHive/bundle-analysis/baseline-v3.15.0.json) | **NEW** — Baseline bundle measurements for the 4 dynamic-import pages. |
| [`BUNDLE_BUDGETS.md`](file:///D:/ThaibaHive/BUNDLE_BUDGETS.md) | **NEW** — Size budget definitions (+10% threshold) and remediation protocol. |

---

## APIs & Endpoints Verified

All existing API route handlers tested and verified under concurrent load testing (8,631 total requests, 0 errors, p95 < 215ms):
- `POST /api/attendance/check-in`
- `GET /api/examinations/tabulation`
- `GET /api/accounts`
- `GET /api/analytics`

---

## Database Migrations & Data Guardrails

- **Schema Changes:** None (relational schema intact).
- **Pre-Migration Hook:** Added `pnpm premigrate` (`scripts/pre-migration/mark-entries-dedup.ts`) to clean legacy duplicate rows safely and idempotently prior to applying strict constraints.

---

## Verification & Test Results

- **TypeScript Compilation (`pnpm typecheck`):** ✅ 0 errors
- **Code Linting (`pnpm lint`):** ✅ 0 errors, 0 warnings
- **Unit & Integration Tests (`pnpm test`):** ✅ 203 / 203 suites passing (878 / 878 tests, 100% pass rate)
- **E2E Zero-Sleep Audit:** ✅ `grep -rn "waitForTimeout" e2e/` returned 0 matches
- **Load Test Benchmarks (`pnpm test:load`):** ✅ 8,631 total requests, 0.00% error rate, p95 latencies between 111ms and 211ms (60–78% under 500ms SLA)

---

## Release Notes

1. **Enterprise CI/CD Automation:** Playwright E2E tests are now executed in parallel across Chromium, Firefox, and WebKit in GitHub Actions, with automated report artifact retention.
2. **Deterministic E2E Tests:** Eliminated all brittle `waitForTimeout()` calls from the E2E suite, replacing them with deterministic DOM state and auto-retrying assertions.
3. **Automated CI Load Testing:** k6 performance gates now run in CI to catch throughput or latency regressions before code reaches production.
4. **Data Integrity Assurance:** Versioned pre-migration deduplication scripts and runbooks prevent migration failures on dirty databases.
5. **Bundle Size Observability:** Established baseline measurements and +10% regression budgets for all code-split client dashboards.
