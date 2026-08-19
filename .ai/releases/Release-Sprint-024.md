# Release Notes: Sprint-024 (v3.8.0)

**Release Version:** v3.8.0  
**Focus:** Mobile Network-Aware Bandwidth Auto-Tuning (MNAT)  

## Key Enhancements

### 1. Mobile Adaptive Sync Engine
- Automatically scales sync batch size and backoff timings based on bandwidth estimation and connection latency.
- Implements battery-aware Gzip compression level throttling to protect CPU cycles and battery capacity when battery < 20%.
- Integrates a 2-hour circuit breaker lock-out inside client fetch loop if 3 consecutive handshake failures occur.

### 2. Swarm Intelligence Console Integration
- Visualizes sync success rate, average latency, and compression savings in real-time.
- Enables live configuration updates of WIFI, CELLULAR, and DEFAULT environment thresholds directly from the admin dashboard.
- Standardizes telemetry logs on the server side correlating client active parameters back to observability streams.

---

## Changed Files

### Mobile Client (Flutter)
- `thaibahive_mobile_app/lib/core/sync/adaptive_sync_decision_engine.dart` (New Engine)
- `thaibahive_mobile_app/lib/core/sync/policy_manager.dart` (New Cache Box)
- `thaibahive_mobile_app/lib/core/sync/policy_provider.dart` (New Riverpod Provider)
- `thaibahive_mobile_app/lib/core/sync/offline_sync_queue.dart` (Batch Slicing)
- `thaibahive_mobile_app/lib/core/sync/background_sync_isolate.dart` (Isolate Integration)
- `thaibahive_mobile_app/lib/core/sync/background_task_manager.dart` (Battery Resolution)
- `thaibahive_mobile_app/test/core/sync/adaptive_sync_test.dart` (New Tests)

### Next.js API & Web Console
- `packages/db/schema.ts` / `schema.pg.ts` (Tuning Policies Schema)
- `src/lib/validation/schemas.ts` (Zod Schema Validators)
- `src/app/api/admin/sync-policies/route.ts` (REST Endpoint)
- `src/app/api/mobile/v1/sync/policies/route.ts` (Handshake Endpoint)
- `src/app/api/mobile/v1/sync/push/route.ts` (Telemetry Ingestion)
- `src/components/swarm/MobileSyncDashboard.tsx` (Dashboard Management Forms)
- `src/app/api/admin/sync-policies/__tests__/sync-policies.test.ts` (Jest Test Suite)
- `e2e/swarm-policies-dashboard.spec.ts` (Playwright E2E Spec)
- `scripts/reset-sync-policies.ts` (Database Seeds Reset CLI Utility)

---

## Database Migrations
- SQLite: `drizzle/0018_cool_cobalt_man.sql`
- Postgres: `drizzle/postgres/0004_short_ink.sql`
- Added the `sync_tuning_policies` table containing policy configurations.

---

## Verification Summary
- **Unit & Integration**: Jest tests verify endpoint auth enforcements, Zod validations, and event logging. All 195 Jest suites pass.
- **E2E**: Playwright spec verifies dashboard tab selectors and update triggers.
