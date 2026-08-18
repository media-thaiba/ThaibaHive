# Release Certificate: Sprint-031 — Cross-Browser E2E Hardening, CI Load Test Integration & Data Integrity Guardrails

**Sprint ID:** SPRINT-031 (PR-031)
**Release Version:** v3.15.0
**Certification Date:** 2026-08-18
**Verifier:** Verification Engineer (Independent Verification & Bug Fix Audit)
**Overall Verdict:** **REJECTED** ⚠️ *(both prior blockers resolved, but certification criteria CB-002 and OPS-001 remain unmet)*

---

## 1. Executive Summary

Sprint-031 targets cross-browser E2E hardening (CB), waitForTimeout elimination (WT), CI load-test integration (LT), pre-migration data integrity (PM), and bundle-analysis observability (BA) for **ThaibaHive v3.15.0**.

This is the second independent verification pass. The two previous blockers have been remediated and independently verified live:

1. **BA-001/BA-002/BA-003 — Bundle Analysis (previously blocked):** RESOLVED. `pnpm build:analyze` now executes `npx next build --webpack` and produces `.next/analyze/client.html` (1608.7 KB), `nodejs.html` (3586.6 KB), `edge.html` (293.6 KB). Baseline `bundle-analysis/baseline-v3.15.0.json` (v3.15.0, 4 routes, 8 dynamic imports) and `BUNDLE_BUDGETS.md` (+10% thresholds 196.2/203.8/179.2/189.0 KB) are present.
2. **LT-002/LT-003 — k6 CI Load Test Integration (previously blocked):** RESOLVED. Dynamic JWT generation was verified against the live seed database (admin `34c45253-9416-4512-9fb6-179e257e346b`), and all four k6 payloads were verified against the running server: check-in → `400` "Already checked in today." (accepted by k6 check), `/api/examinations/tabulation?examId=exam_100` → `200`, `/api/analytics?type=usage&institutionId=inst_campus_main` → `200`, `/api/accounts` → `200`.

**However, the release is NOT certifiable in its current state.** Independent verification found:

- **CB-002 NOT satisfied:** `presence-sync.spec.ts` — an explicit CB-002 target file — still fails deterministically on WebKit (`button:has-text('Update')` not found, line 60) with no WebKit skip guard, and its working-tree changes (32+/51-) are **uncommitted**.
- **OPS-001 NOT satisfied:** Full E2E suite is **217 passed / 5 failed** (2 deterministic: `examination-lifecycle` on Chromium strict-mode, `presence-sync` on WebKit; 3 parallel-flakes that pass in isolation). Unit suite is **202/203** — an untracked `login-rate-limit.test.ts` fails under both the current and pre-fix rate-limit code (not a regression from `61573d4`).
- **Scope creep:** Fix commit `61573d4` adds 5 NEW API routes, rewrites the login page (±587 lines), and modifies `auth-guard.ts`/`rate-limit.ts` beyond the "infrastructure/tooling only" scope.
- **Build-order hazard:** `.next/standalone/packages/{db,auth}/package.json` (created by `next build --webpack`) breaks 24 jest suites with duplicate `@thaiba/db` modules until the directories are deleted.

---

## 2. Task-by-Task Verification

### Group 1 — Cross-Browser E2E Hardening (CB)

| Task | Description | Verdict |
|---|---|---|
| CB-001 | Firefox + WebKit smoke: approval-request, attendance-workflow, auth | **VERIFIED** |
| CB-002 | Fix browser-specific failures in `presence-sync.spec.ts` + cross-browser smoke | **NOT VERIFIED** |
| CB-003 | CI matrix runs all 3 browsers | **VERIFIED** |

**CB-001 — VERIFIED.** The 7 sprint-committed E2E targets (approvals ×3, attendance-workflow ×1, auth ×3) pass 7/7 on Chromium. `attendance-workflow.spec.ts` passes in isolation on both Firefox and WebKit.

**CB-002 — NOT VERIFIED.** `e2e/presence-sync.spec.ts` is explicitly listed in CB-002's file set, yet fails deterministically on WebKit: `button:has-text('Update')` not found at line 60, reproducible in isolation, with no `test.skip(browserName === 'webkit')` guard. The spec's working-tree modifications (32 insertions / 51 deletions) are **not committed** to any sprint commit (`e4a1e5d` only touched approvals, attendance-workflow, auth, global-setup, auth-helper). The committed baseline (`8879a14`) also contains no WebKit guard.

**CB-003 — VERIFIED.** `.github/workflows/ci.yml` matrix `browser: [chromium, firefox, webkit]` with `pnpm exec playwright test --project=${{ matrix.browser }}` and per-browser `playwright-report-${{ matrix.browser }}` artifact upload.

### Group 2 — waitForTimeout Elimination (WT)

| Task | Description | Verdict |
|---|---|---|
| WT-001 | Audit all specs | **VERIFIED** |
| WT-002 | Replace with deterministic waits | **VERIFIED** |
| WT-003 | Verify no regressions in approvals | **VERIFIED** |
| WT-004 | Verify no regressions in attendance-workflow | **VERIFIED** |
| WT-005 | Zero-tolerance + regression | **VERIFIED** |

**VERIFIED (all).** `waitForTimeout` has **0 matches** across `e2e/` (confirmed via both `git grep` and filesystem grep). Committed targets pass on Chromium; attendance-workflow passes in isolation on Firefox/WebKit.

### Group 3 — CI Load Test Integration (LT)

| Task | Description | Verdict |
|---|---|---|
| LT-001 | Design k6 scenarios + thresholds | **VERIFIED** |
| LT-002 | Implement k6 CI job with dynamic JWT + correct payloads | **VERIFIED** |
| LT-003 | Validate k6 CI run + artifact upload | **PARTIALLY VERIFIED** |

**LT-002 — VERIFIED.** All four k6 scripts (`attendance-checkin.js`, `exam-tabulation.js`, `finance-ledger.js`, `bi-analytics.js`) contain scenarios with `p(95)<500ms` and `failed_requests<5%` thresholds. Payload correctness was verified **live**: the dynamic JWT (signed with local `AUTH_JWT_SECRET`, claims staffId/email/role/employeeId/name/tokenVersion) authenticated all requests. The old hardcoded token returns `401` because `verifySession` now requires email/employeeId/name claims. CI token generation (query `SELECT id,email,role FROM staff WHERE role='super_admin' LIMIT 1`, CI secret fallback, claims employeeId `EMP001`/name `Test Admin`/tokenVersion 0) was executed equivalently against `dev.db` and minted a valid token.

**LT-003 — PARTIALLY VERIFIED.** The k6 binary is not installed locally, so the actual `k6 run` cannot be executed here. Verification is therefore by: (a) CI config review — `setup-k6`, seed (`pnpm db:seed` → `seed()` → `seedAcademic()` providing admin `34c45253-…`, `inst_campus_main`, `exam_100`), server start, 4× `k6 run --summary-export` gated on thresholds, `upload-artifact@v4`; (b) live payload simulation against the running server; (c) the complementary Node benchmark `pnpm test:load`, which passed **4/4 with 0% error** (LT-001 1525 reqs p95 228.10ms, LT-002 2339 p95 124.17ms, LT-003 2448 p95 116.61ms, LT-004 2621 p95 108.93ms).

### Group 4 — Pre-Migration Data Integrity (PM)

| Task | Description | Verdict |
|---|---|---|
| PM-001 | Dedup script | **VERIFIED** |
| PM-002 | Pre-migration guard + unit test | **VERIFIED** |
| PM-003 | Runbook | **VERIFIED** |

**VERIFIED (all).** `scripts/pre-migration/mark-entries-dedup.{ts,sql}` + `README.md` present. `pnpm premigrate` = `tsx scripts/pre-migration/mark-entries-dedup.ts`. `src/lib/__tests__/pre-migration-dedup.test.ts` runs against a real in-memory LibSQL database via Drizzle: **2/2 passing** (uniqueness + latest-timestamp retention + clean-db idempotency).

### Group 5 — Bundle Analyzer (BA)

| Task | Description | Verdict |
|---|---|---|
| BA-001 | build:analyze produces webpack reports | **VERIFIED** |
| BA-002 | Bundle baseline committed | **VERIFIED** |
| BA-003 | Bundle budgets enforced | **VERIFIED** |

**VERIFIED (all).** `pnpm build:analyze` (webpack runner) succeeded: `client.html` 1608.7 KB, `nodejs.html` 3586.6 KB, `edge.html` 293.6 KB. Baseline JSON has 4 routes (`/admin/executive/analytics`, `/admin/swarm-intelligence`, `/examinations/tabulation`, `/workspace/[role]/analytics`), 8 dynamic imports, version 3.15.0. `BUNDLE_BUDGETS.md` at repo root defines +10% thresholds.

### Group 6 — Release Operations (OPS-001)

| Criterion | Result |
|---|---|
| `pnpm lint` | ✅ 0 errors |
| `pnpm typecheck` | ✅ passes (tsc --noEmit) |
| `pnpm test` | ⚠️ **202/203** (877/878) — untracked `login-rate-limit.test.ts` fails |
| E2E Chromium/Firefox/WebKit all pass | ⚠️ **217/222** — 5 failures (2 deterministic) |

**NOT SATISFIED.** The full E2E suite and full unit suite do not pass.

---

## 3. Verification Method & Evidence

All claims were independently re-executed — not taken from implementation notes:

- **Live server verification:** Standalone server on `localhost:3000` with `PLAYWRIGHT_TEST=true` + static assets. All 4 k6 payloads exercised with a minted full-claims JWT.
- **Dynamic JWT:** Signed with local `AUTH_JWT_SECRET` (`thaiba_jwt_secret_key_production_certified_2026`); verified 401 with old token, 200/400-acceptable with new token.
- **E2E:** Full suite across all 3 browser projects: **217 passed / 5 failed**. Deterministic: `examination-lifecycle` (Chromium, strict-mode violation — "Create New Exam Session" resolves to 2 elements), `presence-sync` (WebKit, Update button missing). Parallel-flakes (pass in isolation): attendance-workflow (Firefox+WebKit), attendance (Firefox).
- **Tests:** `pnpm test` → 202 passed / 1 failed / 203 suites / 878 tests. The failing `login-rate-limit.test.ts` is **untracked** (`??`) — never committed — and fails under BOTH the current `rate-limit.ts` (`NODE_ENV === "test"` / `CI === "true"` / `PLAYWRIGHT_TEST` bypass) AND the pre-fix `6cbe02e` version (`NODE_ENV !== "production"` bypass). **Not a regression from `61573d4`**, but the engineer's claimed "203/203 (878/878) passed" is not reproducible in the current working tree.
- **Build-order hazard reproduced:** after `next build --webpack`, `.next/standalone/packages/{db,auth}/package.json` duplicates cause jest haste-map failures across 24 suites; deleting the two directories restores the suite to 202/203.

---

## 4. Findings

### BLOCKER-01 — CB-002 incomplete: presence-sync still fails on WebKit
`e2e/presence-sync.spec.ts` — a named CB-002 target — fails deterministically on WebKit (Update button not found, line 60). No WebKit skip guard. Working-tree changes to the spec are uncommitted. Full-suite E2E is therefore 217/222, failing the OPS-001 "all browsers pass" criterion.

### BLOCKER-02 — Full test suite not green
- E2E: 2 deterministic failures (`examination-lifecycle` Chromium, `presence-sync` WebKit).
- Unit: 1 failure (`login-rate-limit.test.ts`, untracked, fails under old + new code). Not a regression from the fix, but the suite does not pass.

### ISSUE-01 — Scope creep in fix commit `61573d4`
Adds 5 new API routes (`academic/academic-years`, `admin/federated/audit-logs`, `admin/resilience/circuit-breaker`, `admin/resilience/dlq-retry`, `search`), rewrites `src/app/auth/login/page.tsx` (±587 lines, extracting `_components/login-header.tsx` and `_components/login-form.tsx`), and changes `auth-guard.ts`/`rate-limit.ts`/`seed.ts` — beyond "infrastructure/tooling only". These typecheck/lint/build fine but were not part of the sprint contract.

### ISSUE-02 — Build-order hazard (build:analyze → test)
`.next/standalone/packages/{db,auth}` created by the webpack build break jest (24 suites) until manually deleted. Not a code regression, but a repeatable environment hazard that can produce false red/green test signals.

### ISSUE-03 — k6 CI run not locally executable
k6 is not installed locally; LT-003 relies on config review + live payload simulation + Node benchmark (which passes 4/4). Actual GitHub Actions execution is the only unobserved link.

---

## 5. Remediation Required for Certification

1. **CB-002:** Fix `presence-sync.spec.ts` WebKit failure (deterministic wait for `Update`, or explicit `test.skip` guard) and **commit** the working-tree spec changes. Re-run the full 3-browser suite to green.
2. **OPS-001:** Resolve `examination-lifecycle.spec.ts` Chromium strict-mode locator violation; reconcile or commit/remove the untracked `login-rate-limit.test.ts` so `pnpm test` is fully green (it currently fails under both old and new rate-limit code).
3. **Scope creep:** Either rebase `61573d4` to strip the 5 new API routes + login-page rewrite, or formally expand the sprint scope with justification and re-verify.
4. **Build-order hazard:** Add a cleanup step (delete `.next/standalone/packages/{db,auth}` before jest) or document the run order constraint.

---

## 6. Conclusion

The two prior blockers — **Bundle Analysis (BA-001/002/003)** and **k6 CI Load Test Integration (LT-002/LT-003)** — are resolved and independently verified live. Data integrity (PM), waitForTimeout elimination (WT), and CI browser matrix (CB-003) are verified.

The release remains **REJECTED** because CB-002's named target (`presence-sync.spec.ts`) still fails deterministically on WebKit, the full E2E suite is 217/222, and the unit suite is 202/203 — failing the sprint's own OPS-001 acceptance criteria. Fix commit `61573d4` also exceeds scope. Certification can be granted after remediation of the items in Section 5.

**Verifier:** Verification Engineer
**Date:** 2026-08-18
**Status:** REJECTED — remediate Section 5 items and re-certify