# Implementation Contract: Sprint-008 AI-Powered Predictive Analytics & Cross-Platform Synchronization

**Sprint ID:** SIS-PARENT-008 (AI-SYNC-008)  
**Sprint Name:** AI-Powered Predictive Analytics & Cross-Platform Synchronization  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-07-31  
**Target Execution:** 2026-08-14 to 2026-08-24  
**Estimated Duration:** 10–14 days (75–95 hours)  
**Risk Level:** Medium-High  
**Classification:** AIOS v3.0 Official Implementation Contract  
**Target Release Version:** v2.0.0 (Intelligent Platform Milestone)  

---

## Executive Summary

Sprint-008 executes **AI-Powered Predictive Analytics & Cross-Platform Synchronization**, marking the major strategic transition of ThaibaHive from a 100% completed transactional ERP (certified in Sprint-007, v1.9.0) into an **intelligent, predictive institutional OS**. This sprint fulfills the core roadmap mandate of "Ambient AI Intelligence" by introducing machine-learning feature aggregation, early warning systems for student performance and fee collection defaults, operational anomaly detection, real-time cross-platform delta synchronization, and resolving the key mobile technical debt of background execution workers (`WorkManager` / `BackgroundFetch`).

**Key Business Impact:**
- **Proactive Early Warning System:** Automatically flags at-risk students (academic decline and chronic absenteeism) and fee defaulters with >80% accuracy, enabling timely intervention before term completion.
- **60% Reduction in Executive Reporting Burden:** AI-generated natural language executive summaries synthesize multi-campus operational metrics, financial trajectories, and attendance trends automatically.
- **Sub-Second Cross-Platform Synchronization:** Multi-master delta sync engine guarantees real-time consistency across web, mobile companion apps, and background sync workers without data loss or corruption.
- **Technical Debt Resolution (Mobile Background Worker):** Resolves mobile background sync when the app is backgrounded or terminated, leveraging Android `WorkManager` and iOS `BackgroundFetch` with exponential backoff and retry queues.

**Strategic Alignment:**
- Advances product version from v1.9.0 to **v2.0.0 (Intelligent Platform Release)**.
- Reuses **Sprint-007 Performance Engine** metrics for AI staff/student evaluation analysis.
- Extends **Sprint-005 Mobile Companion Architecture** (Hive local DB, Riverpod, `FlutterSecureStorage`) with multi-master sync & background workers.
- Leverages **Sprint-002 Export Engine** for encrypted PDF predictive reports, XLSX trend analysis, and CSV audit logs.
- Reuses **Sprint-006 Notification System** (FCM/APNs) to push real-time AI anomaly alerts directly to administrators, teachers, and parents.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation
The Sprint-008 specification is **technically sound, architecturally robust, and achievable**. The implementation builds directly on top of ThaibaHive's established production infrastructure:
- Dual-dialect Drizzle ORM schemas (`packages/db/schema.ts` for SQLite dev and `packages/db/schema.pg.ts` for PostgreSQL prod).
- Strict multi-tenant isolation and RBAC wrapper (`requireAuth`) in `@thaiba/auth`.
- Offline storage infrastructure (`Hive` local boxes in Flutter, vector timestamps in TypeScript).
- Event-driven notification bus for real-time alert dispatch.

### Technical Assessment & Risks Identified

1. **Statistical & ML Feature Aggregation Performance**
   - *Challenge:* Computing predictive features across tens of thousands of attendance, fee, and exam records could degrade database performance under heavy concurrent load.
   - *Mitigation:* Implement incremental feature vector caching in dedicated analytics tables (`ai_models`, `ai_predictions`) and run analytical feature extractions asynchronously in background jobs.

2. **Deterministic Conflict Resolution (Multi-Master Delta Sync)**
   - *Challenge:* Concurrent edits between offline mobile devices and active web sessions might lead to data overwrites or sync loops.
   - *Mitigation:* Implement a deterministic Last-Write-Wins (LWW) with field-level conflict resolution using vector sequence numbers (`sync_version`) and immutable change audit logs (`sync_conflict_logs`).

3. **Mobile Background Execution Limitations (Android WorkManager / iOS BackgroundFetch)**
   - *Challenge:* OS battery optimization settings may delay or throttle background sync workers when the app is killed.
   - *Mitigation:* Design background workers as idempotent batch operations with local outbox sync queues, using exponential backoff retry policies and graceful degradation when offline.

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule**, this contract was reviewed by **Qwen**, **OpenCode (Local-Ollama)**, and **Claude Code** for peer review and optimization. The following enhancements were incorporated into the contract:

1. **Hybrid Heuristic & Statistical Model Engine (OpenCode / Ollama):** Enforced a dual-layer prediction model (rule-based heuristics + statistical trend models) in `AI-004` and `AI-005` to ensure accurate predictions even with sparse historical dataset samples.
2. **Field-Level LWW Conflict Resolution (Claude Code):** Enhanced task `AI-012` to perform granular field-level merges during delta synchronization rather than coarse record-level overwrites.
3. **Optimized Delta Change Vectors (Qwen):** Required sequence number tracking (`sync_version`) in `AI-011` to minimize payload sizes during mobile background sync checks.
4. **Idempotent Background Retry Queue (OpenCode):** Standardized background sync execution in `AI-014` with persistent local SQLite/Hive outbox storage to guarantee zero data loss during network dropouts.
5. **AI Model Explainability & Confidence Scoring (Claude Code):** Added requirement to include explicit human-readable factors (e.g. "Absence rate > 25% over 3 weeks") and numeric confidence scores (0.0 to 1.0) for every prediction generated in `AI-004` and `AI-006`.

---

## Scope & Out of Scope

### In Scope

1. **Database Schema & Permission Extensions:**
   - Define Drizzle ORM schemas for `ai_models`, `ai_predictions`, `ai_anomalies`, `sync_states`, `sync_conflict_logs`, and `sync_device_registrations` in `packages/db/schema.ts` and `schema.pg.ts`.
   - Extend `@thaiba/auth` RBAC matrix with `analytics:predict`, `analytics:manage`, `sync:manage`, and `sync:device` permissions.

2. **AI Analytics & Predictive Inference Engine:**
   - Feature aggregation pipeline (`feature-extractor.ts`) assembling historical attendance, fee, exam, and operational records.
   - Attendance prediction & chronic absenteeism early warning engine (`attendance-prediction-service.ts`).
   - Fee collection forecasting & default risk prediction engine (`fee-forecasting-service.ts`).
   - Academic performance trend & student at-risk identification engine (`academic-prediction-service.ts`).
   - Operational anomaly detection & AI natural language executive summarizer (`anomaly-detector.ts`, `executive-summarizer.ts`).

3. **Web User Experience & Early Warning Center:**
   - Executive AI Analytics Workspace (`/admin/ai-analytics`).
   - Early Warning & Student/Fee Intervention Center (`/admin/ai-analytics/early-warning`).
   - Export engine integration (`/api/export/ai-insights`) for PDF, XLSX, and CSV predictive summaries.

4. **Cross-Platform Delta Sync & Conflict Resolution Engine:**
   - Server-side delta sync API (`/api/sync/delta`, `/api/sync/push`) with vector sequence numbers.
   - Deterministic field-level Last-Write-Wins (LWW) conflict resolver (`conflict-resolver.ts`).

5. **Mobile Companion AI Insights & Background Worker:**
   - Flutter AI insights screens (`thaibahive_mobile_app/lib/features/ai_insights/`).
   - Mobile background sync worker (`background_sync_worker.dart`) utilizing WorkManager (Android) and BackgroundFetch (iOS).

6. **System Verification & Documentation:**
   - E2E cross-platform sync & prediction accuracy test suite (`cross-platform-sync-e2e.test.ts`, `ai-performance-benchmarks.test.ts`).
   - Documentation updates (`docs/ai-analytics-and-sync-guide.md`, `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`).

### Explicitly Out of Scope

- Training heavy deep neural network models on external GPU clusters; models use efficient in-memory statistical regression, decision tree heuristics, and vector trend math suitable for standard server runtimes.
- Third-party external LLM API dependencies (e.g. OpenAI API calls) for core features; text summaries use deterministic template synthesis and lightweight local NLP heuristics.
- Real-time video stream AI analytics; campus security operations remain focused on visitor pass verification and cashless canteen logic created in Sprint-006.

---

## Risk Analysis & Mitigation Strategies

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Inaccurate Predictions due to Sparse Historical Data** | High | Medium | Fall back to rule-based threshold heuristics when historical data points are < 10 records per entity (`AI-004`). |
| **Data Sync Overwrites across Concurrent Mobile Sessions** | High | Low | Enforce field-level Last-Write-Wins (LWW) with immutable audit logging in `sync_conflict_logs` (`AI-012`). |
| **Heavy Computational Load during Bulk Analytics Extraction** | Medium | Medium | Run feature extraction in chunked background batches with query caching and indexed timestamp ranges (`AI-003`). |
| **Mobile OS Terminating Background Sync Workers** | Medium | Medium | Use native `WorkManager` (Android) and `BackgroundFetch` (iOS) with constrained network triggers and outbox retry queues (`AI-014`). |
| **Privacy Concerns Regarding AI Risk Tagging** | Medium | Low | Restrict AI prediction access to authorized roles via `analytics:predict` permission and enforce anonymized aggregated views (`AI-002`). |

---

## Rollback Strategy

In the event of unexpected issues during deployment of Sprint-008:

1. **Feature Flag Deactivation:** Set `NEXT_PUBLIC_AI_ANALYTICS_ENABLED=false` and `NEXT_PUBLIC_CROSS_PLATFORM_SYNC_ENABLED=false` in configuration to isolate new modules gracefully.
2. **Schema Non-Destructiveness:** All database table additions (`ai_models`, `ai_predictions`, `ai_anomalies`, `sync_states`, `sync_conflict_logs`, `sync_device_registrations`) are strictly additive. No existing core tables will be altered.
3. **Mobile API Fallback:** Mobile companion app automatically falls back to standard HTTP endpoints if delta sync endpoints return HTTP 503 during maintenance.
4. **Data Integrity Guarantee:** Direct database mutations from existing modules (Attendance, Exams, Finance) remain fully independent of AI prediction background jobs.

---

## Implementation Tasks

The sprint is structured into **16 sequential implementation tasks**:

```
AI-001 ──► AI-002 ──► AI-003 ──► AI-004 ──► AI-008 ──► AI-010
                       │          │
                       ├──► AI-005├──► AI-009
                       │          │
                       ├──► AI-006└──► AI-013
                       │
                       └──► AI-007
                                  
AI-001 ──► AI-002 ──► AI-011 ──► AI-012 ──► AI-014 ──► AI-015 ──► AI-016
```

---

### Task AI-001: Database Schema Extensions for AI Predictive Analytics & Sync Engine

- **Task ID:** AI-001
- **Description:** Extend Drizzle ORM schemas in both SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) to support AI Model Registries (`ai_models`), Prediction Records (`ai_predictions`), Anomaly Flags (`ai_anomalies`), Synchronization States (`sync_states`), Conflict Logs (`sync_conflict_logs`), and Mobile Device Registrations (`sync_device_registrations`).
- **Files:**
  - `[MODIFY] packages/db/schema.ts`
  - `[MODIFY] packages/db/schema.pg.ts`
  - `[MODIFY] packages/db/index.ts`
- **Dependencies:** None
- **Acceptance Criteria:**
  1. All 6 new database tables defined with proper column types, foreign keys, timestamps, version numbers, and `institutionId` indexes.
  2. Dual-dialect parity strictly maintained between SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`).
  3. Package exports updated in `packages/db/index.ts` without breaking existing imports.
  4. Type generation succeeds without TypeScript or Drizzle schema errors.
- **Verification Method:** Run `pnpm --filter @thaiba/db build` and `pnpm typecheck`.
- **Estimated Complexity:** Medium (1 day)

---

### Task AI-002: Validation Schemas & RBAC Permission Matrix Extensions

- **Task ID:** AI-002
- **Description:** Create Zod validation schemas in `src/lib/validation/schemas.ts` for AI prediction parameters, anomaly reports, and sync request payloads. Update `@thaiba/auth` RBAC definitions to include granular permission scopes (`analytics:predict`, `analytics:manage`, `sync:manage`, `sync:device`).
- **Files:**
  - `[MODIFY] src/lib/validation/schemas.ts`
  - `[MODIFY] packages/auth/src/permissions.ts`
  - `[MODIFY] packages/auth/src/types.ts`
  - `[NEW] src/lib/__tests__/ai-sync-validation.test.ts`
- **Dependencies:** AI-001
- **Acceptance Criteria:**
  1. Zod validation schemas defined for analytics queries, manual prediction runs, anomaly status updates, and delta sync payloads.
  2. `@thaiba/auth` re-exports permission constants and role mappings for `super_admin`, `admin`, `principal`, `hod`, and `staff`.
  3. Validation unit test suite passes cleanly, validating input ranges and sanitizing filter text.
- **Verification Method:** Run `pnpm test src/lib/__tests__/ai-sync-validation.test.ts`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task AI-003: Historical Feature Aggregator & Analytics Data Pipeline

- **Task ID:** AI-003
- **Description:** Build high-performance feature aggregation pipeline in `src/lib/ai/feature-extractor.ts` to transform raw attendance, fee payment histories, exam scores, and staff evaluation records into normalized numerical feature vectors for model consumption.
- **Files:**
  - `[NEW] src/lib/ai/feature-extractor.ts`
  - `[NEW] src/app/api/admin/ai/extract-features/route.ts`
  - `[NEW] src/lib/ai/__tests__/feature-extractor.test.ts`
- **Dependencies:** AI-001, AI-002
- **Acceptance Criteria:**
  1. Extracts student-level features (attendance percentage over 30/60/90 days, exam score variance, fee payment delay history) into structured vectors.
  2. Implements batch processing and caching to execute feature extractions in < 1 second for 1,000 students.
  3. API route `/api/admin/ai/extract-features` protected with `requireAuth` and `institutionId` tenant isolation.
  4. Unit test suite verifies feature vector normalization and edge-case handling (e.g. missing historical records).
- **Verification Method:** Run `pnpm test src/lib/ai/__tests__/feature-extractor.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task AI-004: Attendance Pattern & Chronic Absenteeism Prediction Engine

- **Task ID:** AI-004
- **Description:** Implement predictive engine in `src/lib/ai/attendance-prediction-service.ts` for analyzing student attendance patterns, forecasting future absence likelihood, identifying chronic absenteeism risks, and generating explainable risk factors.
- **Files:**
  - `[NEW] src/lib/ai/attendance-prediction-service.ts`
  - `[NEW] src/app/api/admin/ai/predictions/attendance/route.ts`
  - `[NEW] src/lib/ai/__tests__/attendance-prediction.test.ts`
- **Dependencies:** AI-003
- **Acceptance Criteria:**
  1. Predicts 30-day attendance probability for students with confidence scores (0.0 to 1.0).
  2. Flags students with >75% risk of chronic absenteeism and attaches human-readable risk factors (e.g. "Monday absence clustering").
  3. Saves prediction outputs into `ai_predictions` database table inside atomic transactions.
  4. Unit test suite validates prediction accuracy (>80% on historical benchmark data) and confidence math.
- **Verification Method:** Run `pnpm test src/lib/ai/__tests__/attendance-prediction.test.ts`.
- **Estimated Complexity:** High (1.5 days)

---

### Task AI-005: Fee Collection Forecasting & Default Risk Engine

- **Task ID:** AI-005
- **Description:** Develop fee collection forecasting engine in `src/lib/ai/fee-forecasting-service.ts` to model institutional cash flow trajectories, project term fee realization rates, and flag student accounts with high fee default risks.
- **Files:**
  - `[NEW] src/lib/ai/fee-forecasting-service.ts`
  - `[NEW] src/app/api/admin/ai/predictions/fees/route.ts`
  - `[NEW] src/lib/ai/__tests__/fee-forecasting.test.ts`
- **Dependencies:** AI-003
- **Acceptance Criteria:**
  1. Projects total fee collections per department and institution over 30/60/90-day horizons.
  2. Identifies high-risk payment default accounts using historical payment timing, installment delinquency, and fee balance metrics.
  3. API route returns structured breakdown of expected, delayed, and high-risk fee amounts.
  4. Unit test suite verifies forecasting accuracy against historical transaction benchmarks.
- **Verification Method:** Run `pnpm test src/lib/ai/__tests__/fee-forecasting.test.ts`.
- **Estimated Complexity:** High (1 day)

---

### Task AI-006: Academic Performance & Student At-Risk Early Warning Engine

- **Task ID:** AI-006
- **Description:** Build academic performance trend prediction engine in `src/lib/ai/academic-prediction-service.ts` to analyze exam mark trajectories across terms, project final grade outcomes, and issue early warnings for academically vulnerable students.
- **Files:**
  - `[NEW] src/lib/ai/academic-prediction-service.ts`
  - `[NEW] src/app/api/admin/ai/predictions/academic/route.ts`
  - `[NEW] src/lib/ai/__tests__/academic-prediction.test.ts`
- **Dependencies:** AI-003
- **Acceptance Criteria:**
  1. Computes academic trajectory trends across internal and term examinations.
  2. Identifies students at risk of failing or severe grade drops with explicit subject-level risk indicators.
  3. Stores student risk assessments in `ai_predictions` with `tenantId` isolation.
  4. Unit test suite confirms mathematical correctness of weighted grade projections and risk classifications.
- **Verification Method:** Run `pnpm test src/lib/ai/__tests__/academic-prediction.test.ts`.
- **Estimated Complexity:** High (1 day)

---

### Task AI-007: Operational Anomaly Detection & AI Executive Summarizer

- **Task ID:** AI-007
- **Description:** Develop real-time anomaly detection engine and natural language executive summarizer in `src/lib/ai/anomaly-detector.ts` and `executive-summarizer.ts` to detect operational spikes (canteen balance anomalies, gate pass surges, staff absenteeism clusters) and generate natural language executive briefings.
- **Files:**
  - `[NEW] src/lib/ai/anomaly-detector.ts`
  - `[NEW] src/lib/ai/executive-summarizer.ts`
  - `[NEW] src/app/api/admin/ai/insights/summary/route.ts`
  - `[NEW] src/lib/ai/__tests__/anomaly-detector.test.ts`
- **Dependencies:** AI-004, AI-005, AI-006
- **Acceptance Criteria:**
  1. Identifies statistical anomalies in operational activity (z-score > 2.5 deviation from 30-day baseline).
  2. Synthesizes multi-domain predictions (attendance, fees, academics) into concise natural language executive summaries.
  3. `GET /api/admin/ai/insights/summary` returns structured briefing with key highlights, anomalies, and recommended action items.
  4. Unit test suite verifies anomaly detection thresholds and text synthesis logic.
- **Verification Method:** Run `pnpm test src/lib/ai/__tests__/anomaly-detector.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task AI-008: Executive Predictive Analytics & Insights Web Workspace

- **Task ID:** AI-008
- **Description:** Develop the executive AI Analytics dashboard in `src/app/(shell)/admin/ai-analytics/page.tsx` for institution leaders to view predictive forecasts, operational health metrics, anomaly feeds, and executive summaries.
- **Files:**
  - `[NEW] src/app/(shell)/admin/ai-analytics/page.tsx`
  - `[NEW] src/app/(shell)/admin/ai-analytics/_components/insights-overview-card.tsx`
  - `[NEW] src/app/(shell)/admin/ai-analytics/_components/prediction-chart.tsx`
  - `[NEW] src/app/(shell)/admin/ai-analytics/_components/executive-summary-banner.tsx`
- **Dependencies:** AI-004, AI-005, AI-006, AI-007
- **Acceptance Criteria:**
  1. Renders executive dashboard with prediction summary cards (Attendance Forecast, Fee Realization Target, At-Risk Student Count, Active Anomalies).
  2. Uses standard UI components (`<Button>`, `<Dialog>`, `<Badge>`, `<Skeleton>`, `<Alert>`) per `AGENTS.md`.
  3. Interactive trend charts display 30/60/90-day attendance and fee projections.
  4. Includes error boundaries and loading skeleton states.
- **Verification Method:** Run `pnpm build` and verify web interface in browser.
- **Estimated Complexity:** High (1 day)

---

### Task AI-009: Early Warning & Intervention Center Web Interface

- **Task ID:** AI-009
- **Description:** Build the Early Warning & Intervention Workspace in `src/app/(shell)/admin/ai-analytics/early-warning/page.tsx` allowing principals, HODs, and counselors to inspect at-risk student lists, review underlying factors, and record intervention action plans.
- **Files:**
  - `[NEW] src/app/(shell)/admin/ai-analytics/early-warning/page.tsx`
  - `[NEW] src/app/(shell)/admin/ai-analytics/_components/at-risk-table.tsx`
  - `[NEW] src/app/(shell)/admin/ai-analytics/_components/risk-factor-badge.tsx`
  - `[NEW] src/app/(shell)/admin/ai-analytics/_components/intervention-modal.tsx`
- **Dependencies:** AI-004, AI-006, AI-008
- **Acceptance Criteria:**
  1. Filterable table rendering at-risk students by domain (Attendance, Academic, Fee, Multi-Risk).
  2. Displays confidence scores and human-readable risk factor badges for each flagged record.
  3. Intervention modal allows assigning staff counselors and recording corrective action plans.
  4. Uses `ensureArray` and standard UI components per `AGENTS.md` guidelines.
- **Verification Method:** Run `pnpm build` and verify intervention workflow UI.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task AI-010: AI Insights & Prediction Export Integration (PDF/XLSX/CSV)

- **Task ID:** AI-010
- **Description:** Extend Sprint-002 Export Engine to generate official PDF executive analytics briefings, XLSX predictive trend spreadsheets, and CSV audit logs of identified anomalies and intervention records.
- **Files:**
  - `[NEW] src/app/api/export/ai-insights/route.ts`
  - `[NEW] src/lib/export/__tests__/ai-export.test.ts`
- **Dependencies:** AI-007, AI-008
- **Acceptance Criteria:**
  1. `POST /api/export/ai-insights` generates encrypted PDF executive briefings with institution headers, trend charts, and action items.
  2. Generates multi-tab XLSX spreadsheets with detailed predictive model outputs and risk rosters.
  3. Enforces DDE Formula Injection Sanitization on all CSV/XLSX export strings.
  4. Export response generated in < 2 seconds for up to 1,000 prediction records.
- **Verification Method:** Run `pnpm test src/lib/export/__tests__/ai-export.test.ts`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task AI-011: Server-Side Cross-Platform Delta Sync Protocol & REST APIs

- **Task ID:** AI-011
- **Description:** Build the core server-side synchronization engine in `src/lib/sync/sync-engine-service.ts` supporting delta change tracking, version sequence numbers (`sync_version`), device registration, and bidirectional sync endpoints (`/api/sync/delta`, `/api/sync/push`).
- **Files:**
  - `[NEW] src/lib/sync/sync-engine-service.ts`
  - `[NEW] src/app/api/sync/delta/route.ts`
  - `[NEW] src/app/api/sync/push/route.ts`
  - `[NEW] src/lib/sync/__tests__/sync-engine.test.ts`
- **Dependencies:** AI-001, AI-002
- **Acceptance Criteria:**
  1. `GET /api/sync/delta?since_version=X` returns entity changes modified since sequence version X.
  2. `POST /api/sync/push` accepts batch offline edits from clients, processes changes inside SQL transactions, and returns updated sync state.
  3. All endpoints enforce `requireAuth` and strict `institutionId` tenant isolation.
  4. Unit test suite verifies delta generation, sequence incrementing, and device state updates.
- **Verification Method:** Run `pnpm test src/lib/sync/__tests__/sync-engine.test.ts`.
- **Estimated Complexity:** High (1.5 days)

---

### Task AI-012: Deterministic Field-Level Last-Write-Wins (LWW) Conflict Resolver

- **Task ID:** AI-012
- **Description:** Implement field-level Last-Write-Wins (LWW) conflict resolution logic in `src/lib/sync/conflict-resolver.ts` to merge concurrent offline edits from mobile devices and web clients deterministically while logging conflicts in `sync_conflict_logs`.
- **Files:**
  - `[NEW] src/lib/sync/conflict-resolver.ts`
  - `[NEW] src/lib/sync/__tests__/conflict-resolver.test.ts`
- **Dependencies:** AI-011
- **Acceptance Criteria:**
  1. Resolves field-level conflicts using timestamp vectors and client priority rules cleanly without data corruption.
  2. Writes immutable conflict records to `sync_conflict_logs` for auditability when values diverge.
  3. Handles edge cases including deleted records (tombstones) and concurrent status updates.
  4. Unit test suite verifies conflict resolution accuracy across multi-client scenario matrices.
- **Verification Method:** Run `pnpm test src/lib/sync/__tests__/conflict-resolver.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task AI-013: Mobile Companion AI Insights & Anomaly Feed Experience (Flutter)

- **Task ID:** AI-013
- **Description:** Implement Flutter mobile UI screens and Riverpod state providers in `thaibahive_mobile_app` for staff, teachers, and parents to view personalized predictive insights, early warning alerts, and operational notifications.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/ai_insights/providers/ai_insights_provider.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/ai_insights/screens/ai_insights_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/ai_insights/widgets/early_warning_card.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/ai_insights/widgets/trend_summary_widget.dart`
  - `[NEW] src/app/api/mobile/v1/ai-insights/route.ts`
- **Dependencies:** AI-004, AI-006, AI-007, AI-011
- **Acceptance Criteria:**
  1. `AiInsightsScreen` displays domain-tailored prediction cards (e.g. student attendance risk for teachers, child performance trends for parents).
  2. Mobile REST API `/api/mobile/v1/ai-insights` delivers formatted prediction JSON payloads.
  3. Follows Flutter conventions (`ConsumerWidget`, `@freezed` models, Riverpod state management).
  4. `flutter analyze` inside `thaibahive_mobile_app/` completes with 0 errors and 0 strict warnings.
- **Verification Method:** Run `flutter analyze` inside `thaibahive_mobile_app/` and verify mobile rendering.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task AI-014: Mobile WorkManager & BackgroundFetch Worker Integration

- **Task ID:** AI-014
- **Description:** Implement mobile background sync workers using Android `WorkManager` and iOS `BackgroundFetch` in `thaibahive_mobile_app` to perform periodic outbox sync and delta fetch operations when the application is backgrounded or terminated.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/core/sync/background_sync_worker.dart`
  - `[NEW] thaibahive_mobile_app/lib/core/sync/sync_service.dart`
  - `[NEW] thaibahive_mobile_app/lib/core/sync/outbox_queue_manager.dart`
  - `[NEW] thaibahive_mobile_app/test/core/sync/background_sync_test.dart`
- **Dependencies:** AI-011, AI-012, AI-013
- **Acceptance Criteria:**
  1. Background worker triggers outbox sync queue processing periodically (15-min intervals) when network connectivity is available.
  2. Implements exponential backoff and retry policy (max 5 retries) for failed sync requests.
  3. Stores unsent offline actions securely in local Hive box outbox queue.
  4. Flutter unit and background worker test suite passes with 100% success rate.
- **Verification Method:** Run `flutter test test/core/sync/background_sync_test.dart` and `flutter analyze`.
- **Estimated Complexity:** High (1.5 days)

---

### Task AI-015: Cross-Platform Sync & AI Inference End-to-End Test Suite

- **Task ID:** AI-015
- **Description:** Build automated E2E integration test suite verifying end-to-end multi-master delta synchronization, conflict resolution under load, AI prediction inference benchmarks (< 2s), and cross-platform notification dispatch.
- **Files:**
  - `[NEW] src/app/api/sync/__tests__/cross-platform-sync-e2e.test.ts`
  - `[NEW] src/lib/ai/__tests__/ai-performance-benchmarks.test.ts`
- **Dependencies:** AI-001 through AI-014
- **Acceptance Criteria:**
  1. 100% pass rate across multi-client sync scenarios (simultaneous web edits and mobile background sync pushes).
  2. Verifies sub-second delta sync completion time for 1,000 entity changes.
  3. Verifies prediction engine inference completes in < 2 seconds for multi-campus datasets.
  4. Zero data loss or tenant isolation leakage under concurrent sync execution.
- **Verification Method:** Run `pnpm test src/app/api/sync/__tests__/cross-platform-sync-e2e.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task AI-016: System Verification, Technical Debt Resolution & AIOS Registry Sync

- **Task ID:** AI-016
- **Description:** Conduct full system build & test verification, resolve any remaining lint/type warnings, author comprehensive AI Analytics & Sync architecture guide, update project status tracking files, and issue v2.0.0 release certification.
- **Files:**
  - `[NEW] docs/ai-analytics-and-sync-guide.md`
  - `[MODIFY] .ai/FEATURES.md`
  - `[MODIFY] .ai/CHANGELOG.md`
  - `[MODIFY] .ai/PROJECT_STATUS.md`
- **Dependencies:** AI-001 through AI-015
- **Acceptance Criteria:**
  1. Full automated build (`pnpm build`) and typecheck (`pnpm typecheck`) succeed with **0 errors**.
  2. `flutter analyze` inside `thaibahive_mobile_app/` completes with **0 errors and 0 strict warnings**.
  3. `docs/ai-analytics-and-sync-guide.md` created detailing AI prediction pipelines, model metrics, delta sync protocol, and mobile background worker execution.
  4. `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` updated reflecting **v2.0.0 release status (Intelligent Platform Milestone)**.
- **Verification Method:** Run full workspace validation script and inspect documentation.
- **Estimated Complexity:** Medium (1 day)

---

## Detailed Specifications

### Database Table Schemas

#### 1. Table: `ai_predictions`
```typescript
export const aiPredictions = sqliteTable("ai_predictions", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  domain: text("domain").notNull(), // attendance | fees | academic | operational
  targetEntityId: text("target_entity_id").notNull(), // studentId | staffId | departmentId
  targetEntityType: text("target_entity_type").notNull(), // student | staff | department
  predictionType: text("prediction_type").notNull(), // chronic_absenteeism | fee_default | academic_risk
  riskLevel: text("risk_level").notNull(), // low | medium | high | critical
  confidenceScore: real("confidence_score").notNull(), // 0.00 to 1.00
  predictedValue: text("predicted_value"), // JSON payload of projected metrics
  riskFactors: text("risk_factors"), // JSON array of human-readable risk factors
  status: text("status").notNull().default("active"), // active | resolved | dismissed
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

#### 2. Table: `sync_states`
```typescript
export const syncStates = sqliteTable("sync_states", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  deviceId: text("device_id").notNull(),
  userId: text("user_id").notNull(),
  lastSyncVersion: integer("last_sync_version").notNull().default(0),
  lastSyncAt: text("last_sync_at").notNull(),
  devicePlatform: text("device_platform").notNull(), // android | ios | web
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

#### 3. Table: `sync_conflict_logs`
```typescript
export const syncConflictLogs = sqliteTable("sync_conflict_logs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  fieldName: text("field_name").notNull(),
  winningValue: text("winning_value"),
  losingValue: text("losing_value"),
  resolutionStrategy: text("resolution_strategy").notNull().default("LWW"),
  resolvedAt: text("resolved_at").notNull(),
});
```

---

### Key API Endpoint Specs

#### 1. Endpoint: `GET /api/sync/delta`
- **Description:** Retrieve delta entity changes modified since a specified client sequence version.
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Query Params:** `since_version=42&limit=500`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "currentServerVersion": 58,
    "changes": [
      {
        "entityType": "attendance",
        "entityId": "att_9918",
        "action": "UPDATE",
        "version": 45,
        "data": { "status": "present", "updatedAt": "2026-08-15T09:00:00Z" }
      }
    ],
    "hasMore": false
  }
  ```

#### 2. Endpoint: `GET /api/admin/ai/insights/summary`
- **Description:** Fetch executive natural language summary and anomaly highlights.
- **Response (200 OK):**
  ```json
  {
    "generatedAt": "2026-08-15T10:00:00.000Z",
    "executiveSummary": "Overall institution attendance remains strong at 94.2%. However, 14 students in Grade 10 show elevated chronic absenteeism risk.",
    "metrics": {
      "projectedFeeRealization": 91.5,
      "atRiskStudentCount": 24,
      "activeAnomaliesCount": 2
    },
    "anomalies": [
      { "id": "anom_01", "type": "canteen_spike", "severity": "medium", "description": "Unusual 45% increase in cashless transactions at East Canteen." }
    ]
  }
  ```

---

## Definition of Done (DoD)

Sprint-008 will be officially declared **100% COMPLETE & RELEASED (v2.0.0)** when all of the following conditions are met:

1. **Task Execution:**
   - All 16 tasks (AI-001 through AI-016) are fully implemented across backend web and Flutter mobile codebase.
   - Code strictly adheres to AIOS coding standards, Next.js 16 App Router conventions, and Flutter/Riverpod guidelines in `AGENTS.md`.

2. **Build & Type Safety:**
   - `pnpm build` completes with **0 errors**.
   - `pnpm typecheck` passes with **0 errors**.
   - `flutter analyze` inside `thaibahive_mobile_app/` passes with **0 errors and 0 strict warnings**.

3. **Test Suite Verification:**
   - Next.js backend AI prediction, export, notification, sync engine, and E2E test suites (`feature-extractor.test.ts`, `attendance-prediction.test.ts`, `fee-forecasting.test.ts`, `academic-prediction.test.ts`, `anomaly-detector.test.ts`, `ai-export.test.ts`, `sync-engine.test.ts`, `conflict-resolver.test.ts`, `cross-platform-sync-e2e.test.ts`) pass with **100% success rate**.
   - Flutter unit and background worker test suites pass with > 80% coverage.

4. **Performance & Security Certification:**
   - AI prediction inference verified < 2 seconds for standard datasets.
   - Delta sync completion verified < 1 second for 1,000 entity changes.
   - Multi-tenant isolation verified with zero cross-tenant data exposure.

5. **Documentation & Handoff:**
   - Execution log recorded at `.ai/execution/Sprint-008-Execution-Log.md`.
   - `.ai/FEATURES.md` updated marking AI Predictive Analytics & Cross-Platform Sync complete (**v2.0.0 milestone**).
   - `.ai/CHANGELOG.md` updated with v2.0.0 release notes.
   - User and architecture guide created at `docs/ai-analytics-and-sync-guide.md`.
   - Verification Engineer (Opencoder) issues passing Release Certificate.

---

### Sprint Team

**Product Engineering Manager:** Devin (AIOS)  
**Implementation Engineer:** Antigravity  
**Verification Engineer:** Opencoder  
**Architecture Lead:** AIOS Architecture Council  
**Security Auditor:** Antigravity Security  

---

*Contract Approved: 2026-07-31*  
*Classification: AIOS v3.0 Official Implementation Contract*  
*Target Release Version: v2.0.0 (Intelligent Platform Milestone)*  
