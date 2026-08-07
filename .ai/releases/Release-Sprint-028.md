# Release Manifest: Sprint-028 Infrastructure Hardening & Global Swarm Monitoring Console Improvements

**Version:** v3.12.0  
**Date:** 2026-08-07  
**Commit Range:** SPRINT-028-COMPLETED  
**Staging Status:** Verified (100% tests passed, build successful)

---

## Sprint Summary

Sprint-028 focused on **Infrastructure Hardening and Global Swarm Monitoring Console Improvements**. It implemented a complete secure backend API surface for reporting job management, integrated interactive UI monitoring dashboards with real-time status polling, introduced connection-resilient SSE streams with auto-reconnection and fallback database polling, and expanded telemetry aggregation services to support database queue metric reporting.

---

## Changed Files

The following files were created or modified during the execution of Sprint-028:

### API / Server-Side Services
- `src/lib/validation/schemas.ts` (Modified) — Added validation schemas for job querying, triggering, and pausing/cancelling status changes.
- `src/lib/services/report-queue.ts` (Modified) — Exposed `processQueue()` and added EventBus metrics and event emissions on queue state transitions.
- `src/lib/services/workspace-aggregation.ts` (Modified) — Created the `getQueueTelemetryMetrics` database query metric rollup calculation with a 5-second sliding window caching mechanism.
- `src/lib/observability/playback-state.ts` (Modified) — Refactored client state to retrieve playback timeline events via fetch API instead of directly importing server db modules.

### API Routes / Endpoints
- `src/app/api/admin/scheduled-jobs/route.ts` (Modified) — GET endpoint for scheduled jobs query and POST endpoint to trigger manual report jobs. Writes to `preference_audit_log` on manual trigger. Gated to `super_admin`.
- `src/app/api/admin/scheduled-jobs/[id]/route.ts` (Modified) — PATCH endpoint to transition job statuses (pause, resume, cancel). Emits cancellation warning events to EventBus. Gated to `super_admin`.
- `src/app/api/admin/swarm/queue-telemetry/route.ts` (Created) — GET endpoint returning historical queue performance averages and failure metrics. Gated for `super_admin`.
- `src/app/api/admin/swarm/playback/route.ts` (Created) — GET endpoint querying playback events within ranges. Gated for `super_admin`.
- `src/app/api/admin/audit-logs/route.ts` (Created) — GET endpoint querying user preference change logs. Gated for `super_admin`.

### Frontend Components & Pages
- `src/components/admin/jobs/jobs-list-panel.tsx` (Created) — List table showing queued/processing jobs and execution runtimes with dynamic filter controls.
- `src/components/admin/jobs/jobs-actions-panel.tsx` (Modified) — Form dialogs to trigger report tasks and confirmation buttons to pause/resume/cancel tasks. Swapped all raw HTML inputs (`<input type="radio">` and `<textarea>`) to custom UI primitives.
- `src/app/(shell)/admin/scheduled-jobs/page.tsx` (Modified) — Dashboard page. Fully gated to the `super_admin` role with fallback authorization alerts.
- `src/app/(shell)/admin/swarm-intelligence/page.tsx` (Modified) — Integrated the "Queue & Worker Telemetry" tab, displaying stream status badges with exponential backoff auto-reconnect logic and fallback polling.
- `src/components/swarm/swarm-telemetry-charts.tsx` (Modified) — Chart dashboards displaying AreaCharts, worker concurrency utilization gauge, and active pipeline topology links with glowing state indicators.
- `src/app/(shell)/admin/audit-logs/page.tsx` (Modified) — Audit log query list viewer. Fully gated to the `super_admin` role.

### Documentation & Decisions (DoD Governance)
- `docs/sprint-028-operations-guide.md` (Created) — Operations guide detailing scheduled jobs, telemetry schemas, and preference logs.
- `.ai/08_DECISION_LOG.md` (Modified) — Appended ADR-015 and ADR-016.
- `.ai/adr/ADR-015.md` (Created) — Decision log for Scheduled Job Management APIs.
- `.ai/adr/ADR-016.md` (Created) — Decision log for Swarm Queue Telemetry & Observability.
- `.ai/DECISIONS.md` (Modified) — Appended ADR-015 and ADR-016.
- `.ai/FEATURES.md` (Modified) — Registered SPRINT-028 features.
- `.ai/CHANGELOG.md` (Modified) — Added changelog section for version `3.12.0`.
- `.ai/PROJECT_STATUS.md` (Modified) — Updated status to complete and released for version `3.12.0`.

---

## API Surface

### 1. Scheduled Jobs List & Trigger
- **GET** `/api/admin/scheduled-jobs?page=X&limit=Y&status=S&type=T&institutionId=I`
  - Returns paginated scheduled jobs list.
- **POST** `/api/admin/scheduled-jobs`
  - Payload: `{ type: "attendance" | "finance" | "academics", format: "pdf" | "excel", options: Record<string, any>, institutionId: string }`
  - Submits manual report compilation. Writes trigger action into `preference_audit_log`.

### 2. Scheduled Job Control
- **PATCH** `/api/admin/scheduled-jobs/[id]`
  - Payload: `{ status: "paused" | "cancelled" | "queued" }`
  - Updates worker task execution state. Emits warning cancellation event to EventBus on cancel.

### 3. Queue Performance Averages
- **GET** `/api/admin/swarm/queue-telemetry`
  - Returns: `{ avgProcessingTime: number, completionSuccessRate: number, failedJobsTotal: number }`

---

## Test Verification

All automated Jest test suites were run and passed successfully.

### Test Run Output Summary
```
Test Suites: 202 passed, 202 total
Tests:       873 passed, 873 total
Snapshots:   0 total
Time:        43.079 s
```

---

## Build Status

The Next.js production build compiler successfully generated statically pre-rendered assets:
```
pnpm build
...
Command exited with code 0.
```
