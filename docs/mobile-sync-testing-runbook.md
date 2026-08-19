# Mobile Sync CI Testing & Troubleshooting Runbook

**Document ID:** RUNBOOK-MOB-001  
**Sprint Reference:** SPRINT-033 (v3.17.0)  
**Technical Debt Reference:** TD-007 (Resolved)  
**Target Audience:** Mobile Engineers, Platform Engineers, QA Automation  

---

## 1. Architecture Overview

ThaibaHive Mobile Companion uses an **offline-first local database and outbox sync architecture**:
- **Local Persistence:** Encrypted Hive box (`encrypted_outbox_queue_v1`) via `LocalDbAdapter` stores pending mutations locally with priority ordering.
- **Outbox Queue Engine:** `OfflineSyncQueue` batches mutations (default max 50 items/batch) and flushes them to the backend when connectivity is active.
- **Nonce Re-Authentication:** If a sync request returns HTTP 401 Unauthorized, the mobile client intercepts the error, exchanges a single-use nonce via `/api/auth/mobile-handoff/nonce`, updates `FlutterSecureStorage`, and retries the batch automatically.
- **Conflict Resolution:** `ConflictResolver` applies **Last-Write-Wins (LWW)** using high-precision ISO timestamps or client-preference fallback for offline drafts.
- **APM Telemetry Bridge:** `MobileSyncTelemetry` captures batch duration, network type (`wifi`, `cellular`, `offline`), retry counts, and conflicts, reporting them to `/api/mobile/v1/telemetry`.

---

## 2. Running Mobile Integration Tests Locally

### Prerequisites
- Flutter SDK 3.24.x installed
- Android Emulator or connected test device (optional; headless integration test runner is supported)

### Commands
```bash
cd thaibahive_mobile_app

# 1. Run full unit test suite
flutter test

# 2. Run mobile sync offline persistence E2E test
flutter test integration_test/sync_queue_persistence_test.dart

# 3. Run nonce exchange & token renewal test
flutter test integration_test/sync_auth_nonce_test.dart

# 4. Run conflict resolution integration test
flutter test integration_test/sync_conflict_resolution_test.dart

# 5. Run all integration tests
flutter test integration_test/
```

---

## 3. Mock Server & Network Fault Simulation

The mobile test harness includes `MockSyncServer` (`thaibahive_mobile_app/integration_test/mock_sync_server.dart`) and `MockSyncHttpClient`:
- **Simulate Network Outage:** `mockServer.setOnline(false)` — causes sync attempts to fail with connection timeout/unavailable.
- **Simulate High Latency:** `mockServer.setLatency(1500)` — injects 1.5s delay before response generation.
- **Simulate Auth Expiration:** `mockServer.setForcedStatusCode(401)` — forces token expiration to trigger automatic nonce renewal.
- **Simulate Partial Batch Failures:** `mockServer.setRejectedMutations({'mut_001'})` — allows asserting that only failed mutations remain in the local queue.

---

## 4. Mobile Telemetry Metrics & APM Integration

Mobile sync telemetry is reported to the backend and integrated into the APM engine:
- **API Endpoint:** `POST /api/mobile/v1/telemetry` (Authenticated)
- **Prometheus Metrics:**
  - `thaibahive_mobile_sync_total`: Total sync batches processed
  - `thaibahive_mobile_sync_errors_total`: Total failed sync batches
  - `thaibahive_mobile_sync_conflicts_total`: Total LWW conflict events
  - `thaibahive_mobile_sync_duration_seconds{quantile="0.5|0.9|0.95|0.99"}`
- **Admin Observability UI:** Real-time KPI summary rendered on `/admin/observability` showing sync success rate %, p95 sync latency, and conflict counts.

---

## 5. Diagnostic Triage Workflow

| Symptom | Probable Cause | Diagnostic & Resolution Steps |
| :--- | :--- | :--- |
| **Mutations stuck in PENDING status** | Network is unreachable or device in airplane mode | Verify device connectivity; check `NetworkStateDetector.isOnline`; trigger `offlineSyncService.syncNow()`. |
| **Sync fails with 401 Unauthorized** | Expired JWT or revoked session | Verify `/api/auth/mobile-handoff/nonce` returns HTTP 200; ensure `AUTH_JWT_SECRET` matches across backend instances. |
| **High Conflict Resolution Count** | Multiple devices editing the same record concurrently | Inspect `MobileSyncTelemetry` logs; verify server clocks are synchronized via NTP; review LWW timestamp deltas. |
| **Slow Sync Duration (>1.5s p95)** | Large payload size or degraded cellular network | Check `AdaptiveSyncDecisionEngine` compression policy; verify gzip payload compression is active on cellular links. |

---

*Operational Runbook: RUNBOOK-MOB-001 | ThaibaHive v3.17.0*
