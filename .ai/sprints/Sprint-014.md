# Implementation Contract: Sprint-014 Mobile Platform Production Hardening & Executive Dashboard Analytics Upgrade

**Sprint ID:** MOBILE-HARDENING-EXEC-ANALYTICS-014 (SIS-PARENT-014)
**Sprint Name:** Mobile Platform Production Hardening & Executive Dashboard Analytics Upgrade
**Status:** Approved Engineering Contract
**Created Date:** 2026-08-01
**Target Execution:** 2026-08-02 to 2026-08-25
**Estimated Duration:** 20–24 days (140–170 hours)
**Risk Level:** Medium-High
**Classification:** AIOS v3.0 Official Implementation Contract
**Target Release Version:** v2.6.0 (Mobile Production Hardening & Executive Analytics Milestone)

---

## Executive Summary

Sprint-014 executes **Mobile Platform Production Hardening & Executive Dashboard Analytics Upgrade**, strategically completing ThaibaHive's mobile companion from 95% to 100% production readiness while surfacing Sprint-013's powerful federated governance and resilience capabilities at executive leadership level. Building upon the federated policy synchronization, self-healing infrastructure, mobile offline engine, and executive voice intelligence layer established in Sprint-013 (v2.5.0), this sprint wires Flutter's `VoiceCopilotScreen` to live authenticated API calls, replaces mock Hive/Sqflite persistence with real local storage, establishes an automated Flutter CI pipeline, delivers a unified Executive Federated Analytics Dashboard, and eliminates pre-existing test failures and ESLint technical debt across 20 targeted implementation tasks.

### Key Business Impact

- **Flutter Voice Copilot HTTP Integration (5s SLA Response via Live API):** Replaces mock HTTP responses in `voice_copilot_screen.dart` with real authenticated calls to `/api/admin/voice/query` via `WebViewHandoffScreen` nonce exchange, enabling hands-free executive voice intelligence on mobile.
- **Real Hive/Sqflite Offline Persistence (Zero Data Loss):** Replaces mock `OfflineSyncQueue.getPendingRecords()` with real encrypted Hive/Sqflite persistence, ensuring offline data survives app restarts and network transitions.
- **Automated Flutter CI Pipeline (80% QA Time Reduction):** Establishes GitHub Actions Flutter test pipeline with `flutter test` and `flutter analyze` quality gates on every commit, preventing mobile regressions.
- **Executive Federated Analytics Dashboard (70% Faster Leadership Decisions):** Unified `/admin/executive/analytics` dashboard surfaces federated governance health, resilience KPIs, voice copilot usage, and mobile sync metrics at leadership level in under 5 seconds.
- **Pre-existing Test Failure Resolution (60% Reduction in Flakiness):** Isolates and fixes SQLITE_BUSY lock contention and Next.js request context failures across 15+ of the 26 pre-existing failing test suites.

### Strategic Alignment

- Advances product version from v2.5.0 to **v2.6.0 (Mobile Production Hardening & Executive Analytics Milestone)**.
- Completes **Mobile Companion** from 95% to 100%, unlocking App Store/Play Store deployment.
- Extends **Sprint-013 Federated Governance & Resilience APIs** to the executive analytics layer.
- Extends **Sprint-012 SSE Event Bus** (`src/lib/sse/event-bus.ts`) to broadcast real-time policy change notifications.
- Extends **Sprint-013 VoiceQueryParser** with fuzzy/phonetic matching tolerance for voice misrecognition.
- Integrates **Sprint-013 WebViewHandoffScreen** nonce exchange for mobile voice copilot authentication.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation

The Sprint-014 specification is **technically sound, architecturally incremental, and fully compliant with AIOS standards**. All implementation builds directly on established Sprint-013 production foundations:
- `VoiceCopilotScreen` in Flutter already has UI scaffolding; HTTP wiring is a targeted integration using the proven `WebViewHandoffScreen` nonce exchange pattern from Sprint-005 mobile authentication.
- `OfflineSyncQueue` and `LocalDbAdapter` in Flutter already have interfaces defined in Sprint-013; replacing mock implementations with real Hive/Sqflite adapters is a contained substitution with no API surface changes.
- The executive analytics dashboard reuses existing React component patterns (`<Skeleton>`, `<Badge>`, `<Dialog>`) and existing API routes from federated governance (`/api/admin/federated/*`) and resilience (`/api/admin/resilience/*`) endpoints.
- SSE broadcast integration uses the already-deployed `event-bus.ts` (`src/lib/sse/event-bus.ts`) from Sprint-012; connecting `PolicySyncEngine.propagatePolicy()` to it follows the existing trigger notification pattern.
- Pre-existing test failures are isolated to two known root causes (SQLITE_BUSY parallel lock contention, Next.js `AsyncLocalStorage` context leakage) with clear resolution strategies from prior sprint learnings.

### Technical Assessment & Risks Identified

1. **Flutter Nonce Exchange JWT Edge Cases**
   - *Challenge:* The `WebViewHandoffScreen` nonce exchange generates short-lived session cookies; clock skew or slow network conditions could cause nonce expiry before voice query execution.
   - *Mitigation:* Implement nonce refresh retry logic in `voice_copilot_provider.dart` with exponential backoff and user-visible retry prompt (`MHD-002`).

2. **Hive/Sqflite Schema Migration from Mock to Real Persistence**
   - *Challenge:* Replacing the mock `OfflineSyncQueue` implementation with real Hive/Sqflite persistence requires data migration logic to avoid data loss for existing development device state.
   - *Mitigation:* Implement migration scripts in `local_db_adapter.dart` with version-guarded `openBox()` / `onCreate` handlers to safely migrate or clear stale mock state (`MHD-004`).

3. **Flutter CI Pipeline iOS Simulator Complexity**
   - *Challenge:* iOS simulator setup in GitHub Actions requires macOS runners and Xcode toolchain configuration, significantly increasing CI time and cost.
   - *Mitigation:* Phase CI pipeline to run Android `flutter test` first; add iOS simulator testing in a follow-up action with `if: github.event_name == 'push' && contains(github.ref, 'release')` gating (`MHD-005`).

4. **Executive Analytics Dashboard Query Aggregation Performance**
   - *Challenge:* Aggregating federated governance metrics, resilience circuit breaker states, voice query logs, and mobile sync status into a unified dashboard may require complex JOIN queries that exceed the 5-second SLA.
   - *Mitigation:* Implement materialized aggregate API endpoints (`/api/admin/executive/analytics`) that batch-fetch from existing route handlers with parallel `Promise.all()` and Redis caching for frequently accessed executive metrics (`MHD-007`).

5. **SQLITE_BUSY Test Isolation Root Cause**
   - *Challenge:* Parallel test suites competing on the same SQLite file handle can produce transient SQLITE_BUSY failures that are hard to reproduce deterministically and require careful test sequencing.
   - *Mitigation:* Implement per-suite SQLite isolation via unique in-memory database instances (`:memory:`) or unique file-based test databases per Jest worker process (`MHD-017`).

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule** documented in `AGENTS.md`, this contract was reviewed by **Qwen** (via `chat-with-local-ollama`), **OpenCode (Local-Ollama)**, and **Claude Code** for technical verification and refinement. The following recommendations were incorporated:

1. **Nonce Refresh Retry Logic for Voice Copilot (Qwen):** Added `nonce_refresh_retry` mechanism in `voice_copilot_provider.dart` (`MHD-002`) to handle clock skew and network latency edge cases during `WebViewHandoffScreen` nonce exchange, ensuring production resilience.
2. **Hive/Sqflite Version-Guarded Migration (OpenCode / Ollama):** Recommended wrapping `LocalDbAdapter` initialization with schema version guards and migration handlers (`MHD-004`) rather than hard-resetting storage, preserving any legitimate pending offline sync data during the mock→real transition.
3. **Phased iOS CI Gating for Cost Control (Claude Code):** Proposed Android-first CI pipeline approach with iOS testing gated to release branches (`MHD-005`), preventing runaway macOS runner costs during daily development iteration.
4. **Parallel Promise.all() Executive Dashboard Fetching (Claude Code & Ollama):** Recommended batching all executive analytics API calls with `Promise.all()` in the dashboard component (`MHD-007`) rather than sequential fetches, ensuring the unified dashboard meets the < 5s SLA despite aggregating from 4+ data sources.
5. **Jest Worker-Level SQLite Isolation via `--runInBand` + In-Memory DB (Qwen & Claude Code):** Identified that SQLITE_BUSY failures arise from Jest's default worker process pool sharing a file-based SQLite database; resolving via in-memory databases per-worker completely eliminates lock contention without changing test logic (`MHD-017`).

---

## Scope & Out of Scope

### In Scope

1. **Flutter Voice Copilot HTTP Integration:**
   - Real authenticated HTTP calls from `voice_copilot_screen.dart` to `/api/admin/voice/query` via `WebViewHandoffScreen` nonce exchange.
   - Riverpod state provider for voice copilot authentication state and query lifecycle management.
   - VoiceQueryParser enhancement with fuzzy/phonetic matching tolerance for campus entity misrecognition.

2. **Flutter Offline Persistence & CI Pipeline:**
   - Real Hive/Sqflite persistence replacing mock `OfflineSyncQueue.getPendingRecords()` in `offline_sync_queue.dart`.
   - Real `LocalDbAdapter` with encrypted Hive box initialization and schema migration handlers.
   - GitHub Actions Flutter CI pipeline with automated `flutter test` and `flutter analyze` quality gates.
   - Policy Sync SSE broadcast wiring `PolicySyncEngine.propagatePolicy()` to Sprint-012 `event-bus.ts`.

3. **Executive Federated Analytics Dashboard:**
   - Unified executive analytics API endpoint aggregating federated governance, resilience, voice copilot, and mobile sync metrics.
   - Executive analytics dashboard page at `/admin/executive/analytics` with real-time refresh.
   - Executive analytics React component with federated governance health cards, resilience KPI gauges, voice copilot usage charts, and mobile sync status tiles.
   - Real-time SSE subscription for live executive metrics updates via Sprint-012 event bus.

4. **Technical Debt Resolution & Production Configuration:**
   - Resolution of 15+ pre-existing SQLITE_BUSY and Next.js context test failures via per-worker SQLite isolation.
   - Elimination of 30+ ESLint warnings across the codebase.
   - SMS Gateway production configuration in `.env.production`.
   - Redis Cluster containerized configuration for local cluster performance testing.
   - Sprint-014 test suites: executive analytics validation, mobile HTTP integration tests, CI pipeline verification tests.
   - Sprint-014 architecture guide: `docs/mobile-hardening-executive-analytics-guide.md`.

### Explicitly Out of Scope

- App Store / Play Store submission, review, or distribution pipeline setup (post-Sprint-014 activity requiring business accounts and legal certificates).
- FCM / APNs production push certificate provisioning (requires Apple Developer / Google Firebase account access).
- New mobile app features beyond voice copilot HTTP wiring and offline persistence hardening.
- Proprietary speech recognition acoustic model retraining or custom voice model fine-tuning.
- Full elimination of all 26 pre-existing test failures or all 46 ESLint warnings (targets 15+ failures and 30+ warnings; remainder deferred to post-v2.6.0 maintenance).
- Mobile Reconnection Lifecycle upgrade to persistent background isolate WebSocket (deferred to Sprint-015).
- WCAG 2.1 AA accessibility audit for executive analytics dashboard (deferred to Sprint-015).

---

## Detailed Task Breakdown

### Phase 1: Flutter Voice Copilot HTTP Integration

#### Task MHD-001: Voice Copilot Riverpod Provider & Authentication State Management (Flutter)
- **Task ID:** MHD-001
- **Description:** Create a Riverpod state provider (`VoiceCopilotProvider`) in Flutter that manages the complete lifecycle of voice copilot HTTP calls: nonce acquisition via `WebViewHandoffScreen`, JWT session cookie injection, HTTP request dispatch to `/api/admin/voice/query`, and response state management. This provider replaces the mock response currently hardcoded in `voice_copilot_screen.dart`.
- **Files:**
  - `mobile/lib/features/copilots/providers/voice_copilot_provider.dart` [NEW]
  - `mobile/lib/features/copilots/models/voice_copilot_state.dart` [NEW]
- **Dependencies:** None (foundational provider for Phase 1)
- **Acceptance Criteria:**
  - `VoiceCopilotProvider` extends `AsyncNotifier<VoiceCopilotState>` with Riverpod generator annotation.
  - `VoiceCopilotState` models: `idle`, `authenticating`, `querying`, `success(VoiceQueryResponse)`, `error(String message)`.
  - Provider calls `WebViewHandoffScreen` nonce exchange flow and injects session cookie into HTTP request headers.
  - Provider dispatches POST request to `/api/admin/voice/query` with `{ transcript, confidence }` payload.
  - Graceful error handling for nonce expiry (auto-retry once), HTTP 401 (re-authenticate), and HTTP 500 (surface error state).
- **Verification Method:** Flutter unit tests verifying state transitions: idle → authenticating → querying → success / error.
- **Estimated Complexity:** High

---

#### Task MHD-002: Voice Copilot Screen HTTP Wiring & Nonce Refresh Retry (Flutter)
- **Task ID:** MHD-002
- **Description:** Update `voice_copilot_screen.dart` to consume `VoiceCopilotProvider` (MHD-001), replacing the mock HTTP response with live authenticated API calls. Implement nonce refresh retry with exponential backoff for clock-skew or network-delay edge cases during `WebViewHandoffScreen` nonce exchange. Add loading shimmer and error recovery UI.
- **Files:**
  - `mobile/lib/features/copilots/presentation/screens/voice_copilot_screen.dart` [MODIFY]
  - `mobile/lib/core/auth/webview_handoff_screen.dart` [MODIFY — add nonce refresh retry]
- **Dependencies:** MHD-001
- **Acceptance Criteria:**
  - `VoiceCopilotScreen` displays loading shimmer while `VoiceCopilotProvider` is in `authenticating` or `querying` state.
  - On `success`: renders voice query transcript, parsed intent, intelligence answer, and voice playback button.
  - On `error`: displays `<AlertDialog>` with error message and "Retry" action that triggers provider re-authentication.
  - Nonce refresh retry: if nonce exchange fails with 401 or timeout, retry once with 500ms delay before surfacing error.
  - No mock HTTP response code remains in production code paths.
- **Verification Method:** Flutter widget tests verifying loading, success, and error UI states with mocked provider.
- **Estimated Complexity:** Medium-High

---

#### Task MHD-003: VoiceQueryParser Fuzzy & Phonetic Matching Enhancement (Web)
- **Task ID:** MHD-003
- **Description:** Enhance `src/lib/voice/voice-query-parser.ts` with Soundex and Levenshtein-based fuzzy matching for campus entity extraction (department names, institution names, staff names, course codes). This prevents voice misrecognition from failing entity resolution when spoken phonemes are close but not exact matches.
- **Files:**
  - `src/lib/voice/voice-query-parser.ts` [MODIFY]
  - `src/lib/__tests__/voice-parser.test.ts` [MODIFY — add phonetic matching test cases]
- **Dependencies:** None (enhances existing parser; MHD-001 consumes it indirectly)
- **Acceptance Criteria:**
  - Implement `soundex(str: string): string` and `levenshteinDistance(a: string, b: string): number` utility functions within the parser module.
  - Entity resolution succeeds when Levenshtein distance ≤ 2 for department/institution names up to 10 characters.
  - Entity resolution succeeds when Soundex codes match for staff names and course codes.
  - Confidence score is downgraded by 0.1 for each fuzzy match applied (exact match = 1.0, fuzzy match = 0.9 or 0.8).
  - All existing `voice-parser.test.ts` assertions continue to pass; add 6+ new phonetic/fuzzy test cases covering common misrecognitions.
- **Verification Method:** Run `pnpm test src/lib/__tests__/voice-parser.test.ts`.
- **Estimated Complexity:** Medium

---

#### Task MHD-004: Mobile Voice Copilot API Integration Test Suite
- **Task ID:** MHD-004
- **Description:** Write a dedicated test suite verifying the Flutter voice copilot HTTP integration against the live API contract. Tests cover authentication state transitions, nonce exchange success/failure, HTTP request payload structure, and response parsing. Also validates the enhanced `VoiceQueryParser` with phonetic matching against the API's entity extraction layer.
- **Files:**
  - `src/lib/__tests__/mobile-voice-integration.test.ts` [NEW]
- **Dependencies:** MHD-001, MHD-002, MHD-003
- **Acceptance Criteria:**
  - Test: authenticated POST to `/api/admin/voice/query` with valid transcript returns structured intelligence response.
  - Test: unauthenticated POST to `/api/admin/voice/query` returns HTTP 401.
  - Test: `VoiceQueryParser` resolves phonetically similar entity names with reduced confidence score.
  - Test: nonce exchange mock returns valid session cookie that is injected into voice query HTTP headers.
  - All assertions pass with 100% pass rate. Zero flaky tests.
- **Verification Method:** Run `pnpm test src/lib/__tests__/mobile-voice-integration.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 2: Mobile Offline Persistence & CI Pipeline

#### Task MHD-005: Real Hive Box Initialization & Encrypted Local DB Adapter (Flutter)
- **Task ID:** MHD-005
- **Description:** Replace the mock implementation in `mobile/lib/core/sync/local_db_adapter.dart` with real Hive v2.2+ encrypted box initialization. Implement schema version guards with migration handlers to safely transition from the mock-state SQLite/Hive dev environment to real production-grade encrypted storage, including `HiveAesCipher` key generation stored via `FlutterSecureStorage`.
- **Files:**
  - `mobile/lib/core/sync/local_db_adapter.dart` [MODIFY — replace mock with real Hive]
  - `mobile/lib/core/sync/hive_migration_handler.dart` [NEW]
- **Dependencies:** None (foundational persistence layer)
- **Acceptance Criteria:**
  - `LocalDbAdapter.init()` opens encrypted Hive boxes using `HiveAesCipher` with a key retrieved from / stored in `FlutterSecureStorage`.
  - Schema version key `hive_schema_version` tracked in a dedicated non-encrypted Hive box; version mismatches trigger `HiveMigrationHandler`.
  - `HiveMigrationHandler` safely migrates or clears stale v0 (mock) data before opening production boxes.
  - All Hive box operations (`put`, `get`, `delete`, `values`) tested with an in-memory Hive mock adapter in Flutter unit tests.
  - Zero plaintext sensitive data written to unencrypted Hive boxes.
- **Verification Method:** Flutter unit tests verifying encrypted box open, key persistence, and migration handler execution.
- **Estimated Complexity:** High

---

#### Task MHD-006: Real OfflineSyncQueue Persistence with Hive/Sqflite Backend (Flutter)
- **Task ID:** MHD-006
- **Description:** Replace the mock `getPendingRecords()` and related methods in `mobile/lib/core/sync/offline_sync_queue.dart` with real Hive-backed FIFO queue operations. Implement CRUD operations for `SyncRecord` entries (enqueue, dequeue, getAll, markSynced, markFailed, getByPriority) using the real `LocalDbAdapter` initialized in MHD-005.
- **Files:**
  - `mobile/lib/core/sync/offline_sync_queue.dart` [MODIFY — replace mock with real Hive ops]
  - `mobile/lib/core/sync/sync_record.dart` [MODIFY — ensure Hive TypeAdapter registered]
- **Dependencies:** MHD-005
- **Acceptance Criteria:**
  - `OfflineSyncQueue.enqueue(SyncRecord)` persists to real Hive box with `autoIncrement` key.
  - `OfflineSyncQueue.getPendingRecords()` returns real persisted records sorted by `priority DESC, timestamp ASC`.
  - `OfflineSyncQueue.markSynced(id)` and `markFailed(id, error)` update persisted record status fields.
  - `SyncRecord` Hive TypeAdapter (`SyncRecordAdapter`) registered in `LocalDbAdapter.init()` before box operations.
  - Data survives simulated app restart in unit test (close and reopen Hive box, verify records persist).
- **Verification Method:** Flutter unit tests verifying enqueue persistence, priority ordering, and data survival across box close/reopen cycles.
- **Estimated Complexity:** Medium-High

---

#### Task MHD-007: GitHub Actions Flutter CI Pipeline (Android + Optional iOS)
- **Task ID:** MHD-007
- **Description:** Create a GitHub Actions workflow for automated Flutter quality gates on every push and pull request. The pipeline runs `flutter test`, `flutter analyze`, and `flutter build apk --debug` on Ubuntu (Android-only) runners. iOS testing is gated to `release/*` branches on macOS runners to control CI cost.
- **Files:**
  - `.github/workflows/flutter-ci.yml` [NEW]
- **Dependencies:** MHD-005, MHD-006 (pipeline should pass after persistence mocks are replaced)
- **Acceptance Criteria:**
  - Workflow triggers on `push` to `main`, `develop`, `feature/*` branches and on `pull_request` targeting `main` or `develop`.
  - Steps: `actions/checkout`, `subosito/flutter-action@v2` (Flutter 3.24+), `flutter pub get`, `flutter analyze`, `flutter test --coverage`, `flutter build apk --debug`.
  - `flutter analyze` must exit with code 0 (zero warnings/errors) for the workflow to pass.
  - `flutter test` must exit with code 0 (all tests passing) for the workflow to pass.
  - iOS job: separate job with `runs-on: macos-latest`, gated with `if: startsWith(github.ref, 'refs/heads/release/')`.
  - Coverage report uploaded as workflow artifact.
- **Verification Method:** Push to a feature branch and verify all CI workflow steps complete with green status. Inspect `flutter analyze` and `flutter test` exit codes in workflow logs.
- **Estimated Complexity:** Medium

---

#### Task MHD-008: Policy Sync Engine SSE Broadcast Integration
- **Task ID:** MHD-008
- **Description:** Wire `PolicySyncEngine.propagatePolicy()` in `src/lib/federated/policy-sync-engine.ts` to broadcast real-time policy change events via the Sprint-012 SSE `event-bus.ts` (`src/lib/sse/event-bus.ts`). Policy propagation events should be published as `{ type: 'POLICY_PROPAGATED', payload: { policyId, institutionIds, version, status } }` events to all subscribed SSE clients.
- **Files:**
  - `src/lib/federated/policy-sync-engine.ts` [MODIFY — add SSE broadcast call]
  - `src/lib/sse/event-bus.ts` [MODIFY — register POLICY_PROPAGATED event type]
  - `src/lib/__tests__/policy-sync.test.ts` [MODIFY — add SSE broadcast assertion]
- **Dependencies:** None (integrates two existing systems; no new MHD dependencies)
- **Acceptance Criteria:**
  - After successful `propagatePolicy()` execution, `eventBus.publish('POLICY_PROPAGATED', payload)` is called with the policy ID, affected institution IDs, SHA-256 version hash, and propagation status.
  - SSE clients subscribed to `POLICY_PROPAGATED` events receive the broadcast within 500ms of policy propagation.
  - Broadcast failure (e.g., no SSE clients connected) does not throw or cause `propagatePolicy()` to fail.
  - Existing `policy-sync.test.ts` assertions pass; add SSE publish assertion using `jest.spyOn(eventBus, 'publish')`.
- **Verification Method:** Run `pnpm test src/lib/__tests__/policy-sync.test.ts`. Verify SSE publish spy is called with correct event payload.
- **Estimated Complexity:** Low-Medium

---

### Phase 3: Executive Federated Analytics Dashboard

#### Task MHD-009: Executive Analytics Aggregation API Endpoint
- **Task ID:** MHD-009
- **Description:** Implement a dedicated executive analytics API route handler at `/api/admin/executive/analytics` that aggregates data from federated governance, self-healing resilience, voice copilot usage, and mobile offline sync APIs using `Promise.all()` parallel fetching. Returns a unified JSON payload for the executive dashboard component.
- **Files:**
  - `src/app/api/admin/executive/analytics/route.ts` [NEW]
  - `src/lib/__tests__/executive-analytics.test.ts` [NEW]
- **Dependencies:** MHD-003 (VoiceQueryParser for voice log aggregation)
- **Acceptance Criteria:**
  - Secure endpoint with `requireAuth(handler, "super_admin")` (executive analytics is `super_admin`-only).
  - Fetches in parallel: federated policy counts by status from `federated_policies`, active circuit breaker count from `circuit_breaker_states`, DLQ queue depth from `dlq_retry_queue`, voice query count (last 24h) from `voice_query_logs`, and pending mobile sync records from `offline_sync_outbox`.
  - Returns structured JSON: `{ governance: { totalPolicies, activePolicies, conflictCount, lastPropagatedAt }, resilience: { circuitBreakers: { open, closed, halfOpen }, dlqDepth, indexRecommendationsCount }, voiceCopilot: { queriesToday, avgResponseMs }, mobileSyncHealth: { pendingRecords, lastSyncAt } }`.
  - Response time < 5 seconds for typical production dataset sizes.
  - Returns `{ error: string }` with HTTP 500 on database failure.
- **Verification Method:** Run `pnpm test src/lib/__tests__/executive-analytics.test.ts`. Verify response shape, RBAC enforcement, and parallel fetch structure.
- **Estimated Complexity:** Medium

---

#### Task MHD-010: Executive Analytics React Components (Governance, Resilience, Voice, Mobile)
- **Task ID:** MHD-010
- **Description:** Build a set of reusable React components for the executive analytics dashboard: `GovernanceHealthCard`, `ResilienceKpiGauge`, `VoiceCopilotUsagePanel`, and `MobileSyncStatusTile`. Each component accepts pre-fetched analytics data as props and renders with Skeleton loading states and error boundaries.
- **Files:**
  - `src/components/admin/executive-governance-health-card.tsx` [NEW]
  - `src/components/admin/executive-resilience-kpi-gauge.tsx` [NEW]
  - `src/components/admin/executive-voice-copilot-panel.tsx` [NEW]
  - `src/components/admin/executive-mobile-sync-tile.tsx` [NEW]
- **Dependencies:** MHD-009
- **Acceptance Criteria:**
  - `GovernanceHealthCard`: displays total/active/conflict policy counts with `<Badge variant="success|destructive|warning">` status indicators and last-propagated timestamp.
  - `ResilienceKpiGauge`: displays circuit breaker states (CLOSED/OPEN/HALF_OPEN) as colored status indicators, DLQ depth as a numeric badge, and active index recommendations count.
  - `VoiceCopilotUsagePanel`: displays voice queries in last 24h as numeric stat and average response time in ms with a trend indicator.
  - `MobileSyncStatusTile`: displays pending offline sync record count with `<Badge variant="warning">` if > 0, last sync timestamp, and sync health status.
  - All components render `<Skeleton>` loading states when `data` prop is undefined/null.
  - All components use UI components from `src/components/ui/` — no raw HTML `<div>` cards.
- **Verification Method:** Render each component in isolation with mock data and verify visual output; verify Skeleton renders with undefined data.
- **Estimated Complexity:** Medium-High

---

#### Task MHD-011: Executive Federated Analytics Dashboard Page & Real-Time SSE Refresh
- **Task ID:** MHD-011
- **Description:** Assemble the unified executive analytics dashboard page at `src/app/(shell)/admin/executive/analytics/page.tsx` using the four components from MHD-010. Implement polling-based data refresh (30-second interval) and SSE subscription for `POLICY_PROPAGATED` events to trigger live governance metric updates.
- **Files:**
  - `src/app/(shell)/admin/executive/analytics/page.tsx` [NEW]
  - `src/components/admin/executive-analytics-dashboard.tsx` [NEW]
- **Dependencies:** MHD-009, MHD-010, MHD-008
- **Acceptance Criteria:**
  - Page is accessible at `/admin/executive/analytics` and protected by shell layout auth guard.
  - On mount: fetches `/api/admin/executive/analytics` and renders all four analytics component sections.
  - 30-second auto-refresh: `useEffect` with `setInterval(fetchAnalytics, 30000)` updates dashboard without full page reload.
  - SSE subscription: subscribes to `POLICY_PROPAGATED` events and triggers immediate `fetchAnalytics()` call on receipt.
  - Uses `<Skeleton>` during initial load and on refresh.
  - All `useEffect` fetch calls include `.catch()` handler displaying `<Alert variant="destructive">` on error.
  - Page title: "Executive Intelligence Dashboard" with last-updated timestamp displayed in header.
- **Verification Method:** Navigate to `/admin/executive/analytics` in browser with dev server running. Verify data loads, Skeleton transitions to data, and auto-refresh works. Check console for zero uncaught errors.
- **Estimated Complexity:** High

---

#### Task MHD-012: Executive Analytics Validation Schema & RBAC Permission Extension
- **Task ID:** MHD-012
- **Description:** Add Zod validation schema for executive analytics API query parameters and extend the RBAC permission matrix in `@thaiba/auth` with an `executive:analytics` permission for `super_admin`. Add permission to the role definitions and document usage in the permissions registry.
- **Files:**
  - `src/lib/validation/schemas.ts` [MODIFY — add `executiveAnalyticsQuerySchema`]
  - `packages/auth/roles.ts` [MODIFY — add `executive:analytics` permission to `super_admin`]
  - `.ai/permissions.md` [MODIFY — document `executive:analytics` permission]
- **Dependencies:** MHD-009
- **Acceptance Criteria:**
  - `executiveAnalyticsQuerySchema` validates optional `{ from?: ISO8601Date, to?: ISO8601Date, institutionId?: string }` query parameters.
  - `executive:analytics` permission added to `super_admin` role's permission array in `packages/auth/roles.ts`.
  - `/api/admin/executive/analytics` route uses `requireAuth(handler, "executive:analytics")`.
  - `.ai/permissions.md` updated with new permission entry, description, and authorized roles.
  - `pnpm check-types` passes after role extension.
- **Verification Method:** Run `pnpm check-types`. Verify `executive:analytics` appears in RBAC permission matrix. Test unauthenticated and non-`super_admin` requests are rejected with HTTP 403.
- **Estimated Complexity:** Low-Medium

---

#### Task MHD-013: Executive Analytics Dashboard Navigation Entry
- **Task ID:** MHD-013
- **Description:** Add a navigation entry for the Executive Intelligence Dashboard to the authenticated shell sidebar (`src/app/(shell)/layout.tsx` or equivalent navigation configuration). The entry should be visible only to `super_admin` users and positioned in the "Admin Intelligence" section.
- **Files:**
  - `src/app/(shell)/layout.tsx` [MODIFY — add executive analytics nav entry]
  - `src/components/layout/sidebar-nav.tsx` [MODIFY — if navigation config is centralized here]
- **Dependencies:** MHD-011, MHD-012
- **Acceptance Criteria:**
  - Navigation entry "Executive Analytics" with appropriate icon (e.g., `BarChart3` from `lucide-react`) appears in the sidebar for `super_admin` users.
  - Navigation entry is conditionally rendered using `useRoleCheck` or equivalent RBAC hook — hidden for non-`super_admin` roles.
  - Clicking the entry navigates to `/admin/executive/analytics`.
  - Active state highlighted when path matches `/admin/executive/analytics`.
- **Verification Method:** Log in as `super_admin` and verify nav entry appears. Log in as `admin` or `staff` and verify nav entry is hidden.
- **Estimated Complexity:** Low

---

### Phase 4: Technical Debt Resolution & Production Configuration

#### Task MHD-014: Pre-existing SQLITE_BUSY Test Failure Resolution (Jest Isolation)
- **Task ID:** MHD-014
- **Description:** Resolve the SQLITE_BUSY lock contention failures in the 26 pre-existing failing test suites by implementing per-Jest-worker SQLite isolation. Migrate failing test suites from shared file-based SQLite databases to in-memory (`:memory:`) Drizzle database instances using `better-sqlite3` in-memory mode, scoped per test worker.
- **Files:**
  - `jest.config.ts` [MODIFY — add `--runInBand` for SQLite-heavy suites or configure worker isolation]
  - `src/lib/db/test-db.ts` [NEW — in-memory test database factory]
  - Multiple failing test files [MODIFY — update DB imports to use `testDb()` factory]
- **Dependencies:** None (standalone technical debt task)
- **Acceptance Criteria:**
  - Create `src/lib/db/test-db.ts` exporting `createTestDb(): BetterSQLite3Database` that returns a fresh in-memory Drizzle database for each test suite.
  - At minimum 15 of the 26 pre-existing failing test suites are updated to use `createTestDb()` and pass consistently.
  - No flaky SQLITE_BUSY failures in CI after isolation changes.
  - Total passing test count increases by ≥ 15 suites.
  - `pnpm test` reports ≥ 134 passing suites (119 previously passing + 15 recovered).
- **Verification Method:** Run `pnpm test` three consecutive times and verify no SQLITE_BUSY failures appear in any run.
- **Estimated Complexity:** High

---

#### Task MHD-015: Next.js AsyncLocalStorage Context Test Failure Resolution
- **Task ID:** MHD-015
- **Description:** Resolve the Next.js `AsyncLocalStorage` / request context test failures by properly mocking Next.js server context in affected test suites. Implement a reusable `mockNextRequest()` test helper that properly initializes `AsyncLocalStorage` context for unit tests that invoke Next.js API route handlers.
- **Files:**
  - `src/lib/__tests__/helpers/mock-next-request.ts` [NEW — reusable request mock helper]
  - Multiple failing test files [MODIFY — use `mockNextRequest()` helper]
- **Dependencies:** None (standalone technical debt task)
- **Acceptance Criteria:**
  - `mockNextRequest(method, path, body?, headers?)` helper returns a properly initialized `NextRequest` with `AsyncLocalStorage` context set.
  - Affected test suites that test API route handlers are updated to use `mockNextRequest()` and pass consistently.
  - All remaining Next.js context test failures from the 26 pre-existing failures not addressed in MHD-014 are resolved.
  - Total passing test count after MHD-014 + MHD-015 = ≥ 140 suites (all 144 suites, minus any genuinely unresolvable).
- **Verification Method:** Run `pnpm test` and inspect output for zero Next.js context errors.
- **Estimated Complexity:** Medium

---

#### Task MHD-016: ESLint Warning Cleanup Pass (30+ Warnings)
- **Task ID:** MHD-016
- **Description:** Execute a systematic ESLint warning cleanup pass targeting at least 30 of the 46 pre-existing ESLint warnings. Prioritize warnings from `react-hooks/exhaustive-deps` (missing useEffect dependencies), `@typescript-eslint/no-explicit-any` (untyped any usage), and `@typescript-eslint/no-unused-vars` (dead variable declarations) as these categories represent the highest-impact maintenance debt.
- **Files:**
  - Multiple source files across `src/app/`, `src/components/`, `src/lib/` [MODIFY]
- **Dependencies:** None (standalone cleanup task)
- **Acceptance Criteria:**
  - ESLint warning count reduced from 46 to ≤ 16 (≥ 30 warnings eliminated).
  - No new ESLint errors introduced (error count remains at 0).
  - All `react-hooks/exhaustive-deps` warnings addressed by adding missing dependencies or using `useCallback`/`useMemo` correctly.
  - All `@typescript-eslint/no-explicit-any` warnings replaced with proper TypeScript types or documented `// eslint-disable-next-line` with justification comment.
  - `pnpm lint` exits with code 0 for errors.
- **Verification Method:** Run `pnpm lint` and count warning lines in output. Must show ≤ 16 warnings.
- **Estimated Complexity:** Medium

---

#### Task MHD-017: SMS Gateway Production Configuration & Redis Cluster Containerized Setup
- **Task ID:** MHD-017
- **Description:** Configure production SMS gateway credentials template in `.env.production.example` (with placeholder values) and document the configuration process. Create a `docker-compose.redis-cluster.yml` file for local Redis Cluster performance testing with 6-node cluster (3 masters + 3 replicas) to replace the in-memory `InMemoryStateAdapter` during local cluster performance benchmarking.
- **Files:**
  - `.env.production.example` [MODIFY — add SMS gateway credential placeholders]
  - `docker-compose.redis-cluster.yml` [NEW — 6-node Redis Cluster for local testing]
  - `docs/production-configuration-guide.md` [NEW — SMS and Redis Cluster setup documentation]
- **Dependencies:** None (standalone configuration task)
- **Acceptance Criteria:**
  - `.env.production.example` includes `SMS_GATEWAY_API_URL`, `SMS_GATEWAY_API_KEY`, `SMS_GATEWAY_SENDER_ID` with descriptive comments and placeholder values.
  - `docker-compose.redis-cluster.yml` defines 6 Redis 7.x services with cluster-enabled configuration, cluster-announce-ip, and cluster-bus-port settings.
  - Docker Compose file includes a `redis-cluster-init` service that runs `redis-cli --cluster create` to initialize the cluster topology on first startup.
  - `docs/production-configuration-guide.md` provides step-by-step instructions for both SMS gateway credential configuration and Redis Cluster local setup.
  - `docker-compose up -f docker-compose.redis-cluster.yml` successfully initializes and passes `redis-cli CLUSTER INFO` health check.
- **Verification Method:** Run `docker-compose -f docker-compose.redis-cluster.yml up -d` and verify cluster forms with `redis-cli -h localhost -p 7001 CLUSTER INFO | grep cluster_state:ok`.
- **Estimated Complexity:** Low-Medium

---

### Phase 5: Sprint-014 Test Suites, Architecture Documentation & Release Preparation

#### Task MHD-018: Executive Analytics & Production Hardening Test Suite
- **Task ID:** MHD-018
- **Description:** Create a comprehensive test suite covering executive analytics API validation, RBAC enforcement for the `executive:analytics` permission, Policy Sync SSE broadcast integration, and SMS gateway/Redis configuration validation. Validates all Sprint-014 acceptance criteria through automated tests.
- **Files:**
  - `src/lib/__tests__/executive-analytics-validation.test.ts` [NEW]
  - `src/lib/__tests__/production-hardening.test.ts` [NEW]
- **Dependencies:** MHD-008, MHD-009, MHD-012
- **Acceptance Criteria:**
  - `executive-analytics-validation.test.ts`: Tests `executiveAnalyticsQuerySchema` with valid/invalid inputs; tests `/api/admin/executive/analytics` response shape; tests RBAC (super_admin permitted, admin/staff rejected with 403).
  - `production-hardening.test.ts`: Tests `PolicySyncEngine.propagatePolicy()` calls `eventBus.publish('POLICY_PROPAGATED', ...)` with correct payload; tests SSE event format validation; tests Redis Cluster configuration parsing from environment variables.
  - Both suites achieve 100% pass rate.
  - Zero flaky tests.
- **Verification Method:** Run `pnpm test src/lib/__tests__/executive-analytics-validation.test.ts src/lib/__tests__/production-hardening.test.ts`.
- **Estimated Complexity:** Medium

---

#### Task MHD-019: Sprint-014 Security Verification & Mobile Integration Audit
- **Task ID:** MHD-019
- **Description:** Create a security-focused test suite that verifies: (1) voice copilot HTTP integration uses authenticated nonce exchange and cannot be called without valid JWT, (2) executive analytics dashboard enforces `super_admin`-only access, (3) real Hive offline persistence encrypts sensitive data at rest, and (4) SSE policy broadcast does not leak cross-tenant policy content to unauthorized subscribers.
- **Files:**
  - `src/lib/__tests__/mobile-hardening-security-audits.test.ts` [NEW]
- **Dependencies:** MHD-001, MHD-008, MHD-009, MHD-012
- **Acceptance Criteria:**
  - Test: voice copilot API `/api/admin/voice/query` rejects unauthenticated requests with HTTP 401.
  - Test: executive analytics API `/api/admin/executive/analytics` rejects `admin`, `principal`, `hod`, and `staff` roles with HTTP 403.
  - Test: SSE `POLICY_PROPAGATED` event payload does not include raw policy body content (only metadata: policyId, status, version hash).
  - Test: Hive `LocalDbAdapter` opens boxes with `HiveAesCipher`; verify cipher key is not stored in plaintext in any accessible location.
  - All 4 security invariants verified and passing.
- **Verification Method:** Run `pnpm test src/lib/__tests__/mobile-hardening-security-audits.test.ts` and verify 100% pass rate across all security assertions.
- **Estimated Complexity:** Medium-High

---

#### Task MHD-020: Sprint-014 Architecture Guide, AIOS Documentation Update & Execution Log
- **Task ID:** MHD-020
- **Description:** Write the technical architecture guide documenting Sprint-014 changes: Flutter voice copilot HTTP wiring patterns, Hive/Sqflite real persistence architecture, Flutter CI pipeline structure, executive analytics dashboard data flow, SSE policy broadcast integration, and technical debt resolution strategies. Update `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` to reflect v2.6.0 completion. Save the Sprint-014 Execution Log.
- **Files:**
  - `docs/mobile-hardening-executive-analytics-guide.md` [NEW]
  - `.ai/FEATURES.md` [MODIFY — add Sprint-014 features]
  - `.ai/CHANGELOG.md` [MODIFY — add v2.6.0 entry]
  - `.ai/PROJECT_STATUS.md` [MODIFY — update to v2.6.0 / Sprint-014 complete]
  - `.ai/execution/Sprint-014-Execution-Log.md` [NEW]
- **Dependencies:** MHD-001 through MHD-019
- **Acceptance Criteria:**
  - `docs/mobile-hardening-executive-analytics-guide.md` covers: voice copilot HTTP integration architecture, Hive encryption key management, Flutter CI pipeline YAML structure, executive analytics aggregation API design, SSE broadcast event schema, and test isolation strategies.
  - `.ai/FEATURES.md` updated with Sprint-014 feature entries for all 5 phases.
  - `.ai/CHANGELOG.md` updated with a `v2.6.0` section listing all 20 tasks and their business impact.
  - `.ai/PROJECT_STATUS.md` updated to reflect `Product Version: 2.6.0`, `Sprint ID: MOBILE-HARDENING-EXEC-ANALYTICS-014`, `Status: ✅ Completed & Released`, and updated test/build status.
  - `Sprint-014-Execution-Log.md` saved with all 20 tasks marked complete, files modified/created, acceptance criteria status, build/test results, and any deviations.
- **Verification Method:** Verify all AIOS documentation files are updated and accurate. Check documentation coverage of all 20 Sprint-014 tasks.
- **Estimated Complexity:** Low-Medium

---

## Task Matrix & Dependencies

| Task ID | Description | Primary Files | Dependencies | Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **MHD-001** | Voice Copilot Riverpod Provider (Flutter) | `voice_copilot_provider.dart`, `voice_copilot_state.dart` | None | High |
| **MHD-002** | Voice Copilot Screen HTTP Wiring (Flutter) | `voice_copilot_screen.dart`, `webview_handoff_screen.dart` | MHD-001 | Med-High |
| **MHD-003** | VoiceQueryParser Fuzzy/Phonetic Enhancement | `voice-query-parser.ts` | None | Medium |
| **MHD-004** | Mobile Voice Integration Test Suite | `mobile-voice-integration.test.ts` | MHD-001, 002, 003 | Medium |
| **MHD-005** | Real Hive Encrypted LocalDbAdapter (Flutter) | `local_db_adapter.dart`, `hive_migration_handler.dart` | None | High |
| **MHD-006** | Real OfflineSyncQueue Hive Persistence (Flutter) | `offline_sync_queue.dart`, `sync_record.dart` | MHD-005 | Med-High |
| **MHD-007** | GitHub Actions Flutter CI Pipeline | `.github/workflows/flutter-ci.yml` | MHD-005, 006 | Medium |
| **MHD-008** | Policy Sync SSE Broadcast Integration | `policy-sync-engine.ts`, `event-bus.ts` | None | Low-Med |
| **MHD-009** | Executive Analytics API Endpoint | `/api/admin/executive/analytics/route.ts` | MHD-003 | Medium |
| **MHD-010** | Executive Analytics React Components | `executive-*-card/gauge/panel/tile.tsx` | MHD-009 | Med-High |
| **MHD-011** | Executive Analytics Dashboard Page & SSE Refresh | `/admin/executive/analytics/page.tsx` | MHD-009, 010, 008 | High |
| **MHD-012** | Executive Analytics Validation Schema & RBAC | `schemas.ts`, `roles.ts`, `permissions.md` | MHD-009 | Low-Med |
| **MHD-013** | Executive Analytics Navigation Entry | `layout.tsx`, `sidebar-nav.tsx` | MHD-011, 012 | Low |
| **MHD-014** | SQLITE_BUSY Test Failure Resolution | `jest.config.ts`, `test-db.ts`, multiple tests | None | High |
| **MHD-015** | Next.js Context Test Failure Resolution | `mock-next-request.ts`, multiple tests | None | Medium |
| **MHD-016** | ESLint Warning Cleanup (30+ warnings) | Multiple `src/` files | None | Medium |
| **MHD-017** | SMS Gateway & Redis Cluster Config | `.env.production.example`, `docker-compose.redis-cluster.yml` | None | Low-Med |
| **MHD-018** | Executive Analytics & Hardening Test Suite | `executive-analytics-validation.test.ts`, `production-hardening.test.ts` | MHD-008, 009, 012 | Medium |
| **MHD-019** | Sprint-014 Security Audit Test Suite | `mobile-hardening-security-audits.test.ts` | MHD-001, 008, 009, 012 | Med-High |
| **MHD-020** | Architecture Guide, AIOS Docs & Execution Log | `docs/`, `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`, Execution Log | MHD-001..019 | Low-Med |

### Dependency Graph

```
Phase 1: MHD-001 → MHD-002 → MHD-004
          MHD-003 → MHD-004

Phase 2: MHD-005 → MHD-006 → MHD-007
          MHD-008 (independent)

Phase 3: MHD-003 → MHD-009 → MHD-010 → MHD-011
          MHD-008 → MHD-011
          MHD-009 → MHD-012 → MHD-013

Phase 4: MHD-014 (independent)
          MHD-015 (independent)
          MHD-016 (independent)
          MHD-017 (independent)

Phase 5: MHD-008,009,012 → MHD-018
          MHD-001,008,009,012 → MHD-019
          All → MHD-020
```

**Parallel Execution Opportunities:**
- Phase 1 (MHD-001→003) and Phase 2 (MHD-005→008) can execute in parallel.
- Phase 4 tasks (MHD-014, MHD-015, MHD-016, MHD-017) are fully independent and can run in parallel with Phases 1–3.
- MHD-009, MHD-003 can start as soon as their dependencies complete, before all Phase 1/2 tasks finish.

---

## Risks & Mitigation Strategies

| Risk Description | Severity | Impact Area | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **1. Flutter Nonce Exchange JWT Clock Skew** | High | Mobile Voice Copilot Availability | Implement nonce refresh retry with 500ms exponential backoff in `voice_copilot_provider.dart` (`MHD-001`). Surface retry state in UI with progress indicator. |
| **2. Hive Migration Data Loss on Mock→Real Transition** | High | Mobile Offline Data Integrity | Version-guarded `HiveMigrationHandler` (`MHD-005`) safely clears stale v0 mock state with explicit user notification before migration. |
| **3. Flutter CI iOS Runner Cost Overrun** | Medium | CI/CD Budget | iOS testing gated to `release/*` branches only (`MHD-007`). Android-only on PR/feature pushes. Establish monthly CI cost budget alert. |
| **4. Executive Analytics Dashboard > 5s SLA** | Medium | Executive UX & Leadership Adoption | `Promise.all()` parallel fetching in `/api/admin/executive/analytics` (`MHD-009`) with Redis caching for repeat requests. Add API response time monitoring. |
| **5. SQLITE_BUSY Resolution Incomplete** | Medium | Build Confidence & Test Reliability | Target 15+ of 26 failures in Sprint-014. Quarantine remaining failures with `.skip` and `// TODO(Sprint-015)` markers to prevent blocking green CI. |
| **6. ESLint Warning Cleanup Introduces Regressions** | Low | Code Quality & Functionality | Run `pnpm test` after each cleanup batch. Use `git stash` checkpointing to enable granular rollback of individual warning fixes. |

---

## Rollback Plan

In the event of critical failures during deployment or verification:

1. **Feature Flag Isolation:** Executive analytics dashboard, voice copilot HTTP integration, and SSE policy broadcast are wrapped behind feature flags (`ENABLE_EXECUTIVE_ANALYTICS`, `ENABLE_VOICE_HTTP_INTEGRATION`, `ENABLE_POLICY_SSE_BROADCAST`). Disabling any flag immediately reverts the platform to certified Sprint-013 (v2.5.0) behavior for the affected subsystem without downtime or database rollback.

2. **Flutter Offline Persistence Rollback:** If real Hive/Sqflite persistence causes data corruption or unexpected failures in production, the `LocalDbAdapter` includes a `fallbackToInMemory()` escape hatch that reverts to the Sprint-013 in-process mock storage. This allows immediate mobile app functionality recovery while a fix is prepared.

3. **Test Isolation Rollback:** If Jest worker isolation changes in `jest.config.ts` cause unexpected test failures in previously passing suites, revert `jest.config.ts` to the Sprint-013 baseline and re-apply SQLITE_BUSY fixes incrementally per suite using `--testPathPattern` targeting.

4. **Git Branch Reversion:** Revert the `feature/sprint-014-mobile-hardening` branch merge commit to restore code to the certified v2.5.0 release state. All Sprint-014 changes are additive; no existing tables, API routes, or components are deleted, ensuring forward compatibility.

5. **Database Non-Destructive Policy:** Sprint-014 adds no new database schema tables. All changes are confined to application code, Flutter Dart files, GitHub Actions YAML, and documentation. Zero database rollback scripts required.

---

## Definition of Done (DoD)

A task or sprint deliverable is defined as **DONE** only when all of the following criteria are satisfied:

1. **Implementation Completeness:** All 20 tasks specified in this engineering contract are fully implemented in code without stubbed functions, mock responses in production paths, or missing logic.

2. **TypeScript & Build Standards:** TypeScript compilation (`pnpm check-types` / `tsc --noEmit`) completes with **0 errors**. Codebase build (`pnpm build`) completes with **0 errors**.

3. **Linting Standards:** ESLint warning count ≤ 16 (reduced from 46). Zero ESLint errors.

4. **Flutter Code Quality:** `flutter analyze` completes with **0 errors and 0 warnings** across all mobile Dart files modified or created in Sprint-014.

5. **Test Suite Certification:**
   - All Sprint-014 test suites pass with 100% pass rate: `mobile-voice-integration.test.ts`, `executive-analytics-validation.test.ts`, `production-hardening.test.ts`, `mobile-hardening-security-audits.test.ts`.
   - Total passing test suites ≥ 134 (recovered from 119 via SQLITE_BUSY fixes in MHD-014/015).
   - Zero flaky test failures across 3 consecutive full test suite runs.

6. **Mobile Platform Completeness:** Flutter `VoiceCopilotScreen` makes live authenticated API calls (no mock). `OfflineSyncQueue` persists to real Hive storage (no mock). `flutter analyze` exits 0.

7. **GitHub Actions CI:** `flutter-ci.yml` workflow passes all steps (checkout, pub get, analyze, test, build apk) on the `feature/sprint-014-mobile-hardening` branch.

8. **Executive Dashboard Operational:** `/admin/executive/analytics` page renders with live data, auto-refreshes every 30 seconds, and responds to SSE `POLICY_PROPAGATED` events. Dashboard response time < 5 seconds.

9. **Security Verification:** All 4 security invariants in `mobile-hardening-security-audits.test.ts` verified: voice API authentication, executive analytics RBAC, SSE payload content safety, and Hive encryption-at-rest.

10. **Documentation & Execution Log:** Execution log saved to `.ai/execution/Sprint-014-Execution-Log.md`. Architecture guide saved to `docs/mobile-hardening-executive-analytics-guide.md`. `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` updated for v2.6.0.
