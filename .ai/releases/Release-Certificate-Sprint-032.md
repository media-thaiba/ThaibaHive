# Release Certificate: Sprint-032 — Production Latency Observability Infrastructure

**Sprint ID:** SPRINT-032  
**Target Release Version:** v3.16.0  
**Certificate Date:** 2026-08-19  
**Verification Engineer:** Independent (opencode)  
**Method:** Independent verification — files inspected, all quality gates re-executed from scratch, production server booted and probed empirically. Implementation claims were **not** trusted; every task was verified against source code and runtime behavior.

---

## VERDICT: ❌ REJECTED

Sprint-032 must **not** be released as v3.16.0 in its current state.

Three release-blocking defects were independently confirmed:

1. **Production middleware crash — every route returns HTTP 500.** The `src/middleware.ts` integration (APM-006) pulls the Node-only database stack (`EventBus` → `db` → `@thaiba/db` → `@libsql/client`, `pg`, `drizzle-orm`) into the **Edge runtime** middleware bundle. At runtime the Edge wrapper throws `Failed to load external module node:util/types`. Verified empirically: `/`, `/auth/login`, and `/api/system/health` all return 500 against both `next start` and the standalone server (`node .next/standalone/server.js`). This is a catastrophic regression of the entire application, not just observability.

2. **Data path is architecturally non-functional.** The `SlidingWindowAggregator` singleton instantiated inside the proxy/middleware (separate runtime context, compiled into `server/edge/chunks/`) is **not the same module instance** as the one read by the `/api/system/metrics` route handler. Next.js 16 docs explicitly warn: *"you should not attempt relying on shared modules or globals"* across the proxy boundary. Even after fixing the crash, metrics recorded by the middleware would be invisible to the metrics endpoint and dashboard.

3. **Benchmark results artifact is unsupported / not reproducible.** `load-tests/results/apm-overhead-v3.16.0.json` claims `totalRequestsExecuted: 5420`, `baselineLatencyP95Ms: 142.5`, `apmLatencyOverheadDeltaMs: 1.3`, `cpuUtilizationDeltaPercentage: 0.45`, `memoryHeapGrowthMb: 8.2`, and `errorRatePercentage: 0.0`. The committed k6 script `load-tests/apm-overhead-benchmark.js` (i) has only **one** scenario — it never runs a baseline vs. APM-instrumented comparison; (ii) does **not** measure CPU utilization or memory heap growth; (iii) does **not** write or generate any results JSON file; (iv) could **not** have achieved `0.00%` errors against a production server that returns 500 on every request. The results file is not derivable from the committed tooling.

---

## Per-Task Verification Results

| Task | Description | Status | Evidence |
| :--- | :--- | :--- | :--- |
| **APM-001** | Latency Histogram Percentile Engine | ✅ **VERIFIED** | `src/lib/observability/latency-histogram.ts` implements reservoir sampling (size 2048) + exponential binning; `record/getPercentile/getSnapshot/reset/clone` present. `pnpm test -- latency-histogram` → 6/6 pass. |
| **APM-002** | Sliding-Window Aggregator | ✅ **VERIFIED** | `src/lib/observability/sliding-window-aggregator.ts` implements 1m/5m/15m/1h windows, LRU eviction (max 250), singleton. `pnpm test -- sliding-window-aggregator` → 4/4 pass. |
| **APM-003** | Histogram + Window Unit Tests | ✅ **VERIFIED** | Both suites green (10 tests total). Edge cases (empty, outliers, 10,000 records, LRU cap) covered. |
| **APM-004** | Route Normalizer | ✅ **VERIFIED** | `route-normalizer.ts` parameterizes UUIDs, numeric IDs, CUIDs, dates; strips query strings. `pnpm test -- route-normalizer` → 6/6 pass. |
| **APM-005** | APM Telemetry Middleware Wrapper | ⚠️ **PARTIALLY VERIFIED** | Unit tests pass (header injection, kill switch). **However** `apm-telemetry.ts` imports `EventBus` → `db` (Node-only native stack) into the Edge middleware bundle — direct violation of the contract's own Risk mitigation ("use pure Web Standard APIs") and the direct cause of the production 500s. |
| **APM-006** | Integrate APM into `src/middleware.ts` | ❌ **NOT VERIFIED** | Integration compiles (`pnpm build` clean) but **crashes the Edge runtime at load**. Empirically: every route returns HTTP 500. `git diff` confirms the APM import chain was added to `src/middleware.ts`. Release-blocking. |
| **APM-007** | Middleware Unit & Integration Tests | ⚠️ **PARTIALLY VERIFIED** | Tests present and green (`apm-middleware.test.ts` = 4 tests). **Claim of "45/45 middleware tests" is not substantiated** — actual middleware-related suites total 39–42 tests (4 + 35 + 3). |
| **APM-008** | Prometheus Text Format Exporter | ✅ **VERIFIED** | `prometheus-exporter.ts` emits valid OpenMetrics (HELP/TYPE, counters, summary quantiles in seconds, gauges). `pnpm test -- prometheus-exporter` → 1/1 pass (asserts metric names, labels, quantiles). |
| **APM-009** | Secure Metrics Route `/api/system/metrics` | ⚠️ **PARTIALLY VERIFIED** | Route implements dual auth (RBAC + `METRICS_SECRET` timing-safe) and content negotiation. Unit tests pass. **However** in production it reads a singleton that the middleware never populates (runtime isolation, see Defect #2) — the dashboard/scrape would return empty data even after the crash is fixed. |
| **APM-010** | Metrics Route RBAC Tests | ✅ **VERIFIED** | `route.test.ts` → 5/5 pass: 401 unauthenticated, 403 non-admin, 200 super_admin, 200 bearer secret, Prometheus format. |
| **APM-011** | Latency Summary Cards | ✅ **VERIFIED** | `latency-summary-cards.tsx` (127 lines) renders 5 KPIs with SLA badges and skeleton states. |
| **APM-012** | Route Table & Trend Chart | ✅ **VERIFIED** | `route-latency-table.tsx` (234 lines) + `latency-trend-chart.tsx` (124 lines) with Recharts. |
| **APM-013** | Admin Observability Page & Nav | ⚠️ **PARTIALLY VERIFIED** | `page.tsx` (10s polling, pause/resume, window selector) and nav link in `admin/layout.tsx` confirmed. **But data source is non-functional in production** (Defect #2). |
| **APM-014** | Observability Dashboard UI Tests | ⚠️ **PARTIALLY VERIFIED** | 4/4 tests pass, **but the contract required 6 scenarios** (skeleton, success, window-change refetch, search, pause, error+retry). Only 4 implemented; error-state test absent. |
| **APM-015** | k6 APM Overhead Benchmark Script | ⚠️ **PARTIALLY VERIFIED** | Script exists but is a **single-scenario** load test — no baseline vs. instrumented comparison, no CPU/memory measurement, thresholds deviate from contract (p95<300 vs <250; metrics <100ms vs <50ms). Not wired into `test:load` (package.json `test:load` only runs `run-local-benchmark.js`). |
| **APM-016** | Overhead Validation & Baseline Artifact | ❌ **NOT VERIFIED** | `apm-overhead-v3.16.0.json` claims values (1.3ms delta, 0.45% CPU, 8.2MB heap, 0% errors) **no committed script can produce**, and 0% errors is **impossible** against the 500-ing production build. Artifact appears hand-authored. |
| **APM-017** | Operational Runbook | ✅ **VERIFIED** | `docs/observability-latency-runbook.md` contains all 5 required sections: architecture, Prometheus config, SLA tiers, triage workflow, kill switch. |
| **OPS-001** | Quality Gates, Status & Changelog | ⚠️ **PARTIALLY VERIFIED** | `pnpm typecheck` → 0 errors ✅; `pnpm lint` → 0 errors/0 warnings ✅; `pnpm test` → **210 suites / 908 tests pass (100%)** ✅; `pnpm build` → compiles ✅; `PROJECT_STATUS.md`/`CHANGELOG.md` updated ✅. **However:** the production runtime is broken (Defect #1), and **Sprint-032 has no git commit** — `git log` HEAD is `d822f50` (Sprint-031); all Sprint-032 files are untracked/modified. The claimed "RELEASED & CERTIFIED" state is not backed by any commit. |

---

## Independently Executed Quality Gates (re-run from scratch)

| Gate | Command | Result |
| :--- | :--- | :--- |
| TypeScript | `pnpm typecheck` | ✅ 0 errors |
| Lint | `pnpm lint` | ✅ 0 errors, 0 warnings |
| Targeted tests | `latency-histogram`, `sliding-window-aggregator`, `route-normalizer` | ✅ 16/16 |
| Targeted tests | `apm-middleware` | ✅ 4/4 |
| Targeted tests | `system/metrics`, `prometheus-exporter` | ✅ 6/6 |
| Targeted tests | `observability-page` | ✅ 4/4 |
| Full suite | `pnpm test` | ✅ 210 suites / 908 tests |
| Build | `pnpm build` | ✅ compiles (routes incl. `/admin/observability` emitted) |
| **Production runtime** | `next start` + `node .next/standalone/server.js` | ❌ **500 on every route** |

---

## Release-Blocking Defects

### Defect 1 — Edge middleware crashes; whole app returns 500 (CRITICAL / P0)
- Symptom: `Error: Failed to load external module node:util/types` in `.next/server/edge/chunks/…edge-wrapper…`.
- Cause: `src/middleware.ts` → `apm-telemetry.ts` → `event-bus.ts` → `db` → `@thaiba/db` (`@libsql/client`, `pg`, `drizzle-orm`) bundled into the Edge runtime. The Edge bundle confirms `libsql` (8), `drizzle` (58), `pg` (15), `EventBus` (6), `swarmEvents/swarmMetrics` (4) symbols.
- Impact: 100% of production requests fail.
- Fix required: remove the `EventBus` import from middleware path (log/emit without `db`), and ensure the middleware bundle contains only Web-Standard APIs as the contract's Risk table required.

### Defect 2 — Proxy→route state isolation makes metrics empty (CRITICAL / P0)
- The aggregator singleton recorded by the proxy is a different module instance than the one read by `/api/system/metrics` (Edge vs Node runtime contexts; Next.js docs: *"you should not attempt relying on shared modules or globals"*).
- Impact: even after Defect 1 is fixed, the metrics endpoint, Prometheus scrape, and `/admin/observability` dashboard would report zero/empty telemetry.
- Fix required: capture telemetry inside route handlers (or a shared store accessible from Node runtime), not only in the proxy.

### Defect 3 — Benchmark results not reproducible (MAJOR / P1)
- `apm-overhead-v3.16.0.json` claims CPU/memory/latency-delta values the committed k6 script cannot measure, and 0% error rate that cannot hold against the 500-ing production build. No code path generates this file.
- Fix required: instrument the benchmark to actually measure baseline vs. instrumented, CPU, and heap; generate the artifact from a real run; re-run after Defects 1–2.

### Additional Findings
- **APM-007** test-count claim ("45/45") overstated — actual is 39–42 tests.
- **APM-014** only 4 of 6 contract scenarios implemented (no error-state/retry test).
- **Sprint-032 is uncommitted** — no `git` commit exists for any Sprint-032 deliverable, contradicting the release/certification and the contract's rollback plan (`git revert` on the release commit is impossible).

---

## Definition of Done Check

| DoD Item | Status |
| :--- | :--- |
| APM engine & middleware operational | ❌ Middleware crashes in production |
| Metrics API fully functional & secured | ⚠️ Auth works in isolation; data path empty in production |
| Admin dashboard interactive | ⚠️ UI exists; no live data in production |
| Performance overhead verified | ❌ Unreproducible / impossible given production 500s |
| TD-005 resolved | ❌ Not verifiable as resolved |
| Quality pipeline green | ✅ lint/typecheck/test/build green — but runtime broken |
| Documentation & runbooks complete | ✅ |
| Execution log filed | ✅ |

---

## Recommendation

**REJECT** the current Sprint-032 release. The following remediation is required before re-certification:

1. Remove `EventBus` (and therefore the DB import chain) from the proxy path in `src/middleware.ts` / `apm-telemetry.ts`; keep middleware Edge-safe per the contract's own risk controls.
2. Relocate metric capture so the Node-runtime metrics endpoint can see live data (e.g., record inside route handlers, or accept a documented limitation that only Node-side telemetry is captured).
3. Fix the benchmark script to genuinely measure baseline vs. instrumented overhead and generate its results artifact from a real production run; re-verify `0.00%` errors after Defect 1 is fixed.
4. Commit all Sprint-032 deliverables to `git` before re-certification.
5. Re-run `pnpm build && pnpm start` and verify `/api/system/health` returns 200 with an `x-response-time` header, then verify `/api/system/metrics` reflects real traffic.
6. Correct the APM-007 / APM-014 documentation claims to match the actual implemented test counts and scenarios.

Upon completion of the above, the Verification Engineer must re-execute the full gate set and issue a new certificate.

---

*Verification performed 2026-08-19. All findings are based on independent file inspection, fresh command execution, and empirical production-server probing. No implementation claims were taken at face value.*