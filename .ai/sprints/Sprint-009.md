# Implementation Contract: Sprint-009 Multi-Campus Regional Analytics & Enterprise Scaling

**Sprint ID:** SIS-PARENT-009 (REGIONAL-SCALE-009)  
**Sprint Name:** Multi-Campus Regional Analytics & Enterprise Scaling  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-07-31  
**Target Execution:** 2026-08-16 to 2026-08-28  
**Estimated Duration:** 12–14 days (90–110 hours)  
**Risk Level:** Medium-High  
**Classification:** AIOS v3.0 Official Implementation Contract  
**Target Release Version:** v2.1.0 (Multi-Campus Enterprise Milestone)  

---

## Executive Summary

Sprint-009 executes **Multi-Campus Regional Analytics & Enterprise Scaling**, transforming ThaibaHive from a single-campus intelligent platform (certified in Sprint-008, v2.0.0) into a **multi-campus regional enterprise platform**. Building upon the Ambient AI analytics engine, cross-platform delta synchronization, and mobile companion app established in Sprint-008, this sprint expands institutional oversight to regional education authorities, multi-school management groups, and institutional clusters across 100+ campuses.

**Key Business Impact:**
- **Cross-Institution Benchmarking & Comparative Intelligence:** Standardized KPIs (attendance stability, fee collection velocity, academic growth, AI risk prevalence) enable regional education authorities to compare institutional performance objectively across campuses.
- **Regional HOD Performance Ranking:** Automated evaluation and ranking of department heads within discipline clusters across institutions, highlighting top-performing departments and facilitating peer knowledge sharing.
- **Enterprise Data Warehousing & Incremental ETL:** Centralized multi-tenant data warehouse with automated 5-minute incremental ETL pipelines aggregates operational metrics across hundreds of campuses without degrading transactional database performance.
- **Real-Time Push Notification Risk Alerting:** Wires Sprint-008 AI risk alerts directly to FCM (Firebase Cloud Messaging) and APNs (Apple Push Notification Service) channels, delivering critical risk warnings to regional admins and principals in < 10 seconds.
- **80% Reduction in Regional Reporting Burden:** Automated cross-institution data aggregation, comparative analytics matrices, and multi-format export engines replace manual multi-campus reporting processes.

**Strategic Alignment:**
- Advances product version from v2.0.0 to **v2.1.0 (Enterprise Regional Milestone)**.
- Extends **Sprint-008 AI Analytics & Sync Engine** by aggregating campus-level inferences into regional trend models and routing critical AI alerts via push channels.
- Leverages **Sprint-007 Performance & Evaluation Engine** metrics for cross-campus HOD discipline comparisons.
- Reuses **Sprint-006 FCM/APNs Notification Infrastructure** for real-time mobile push delivery.
- Reuses **Sprint-002 Export Engine** for multi-campus PDF regional briefings, multi-tab XLSX benchmarking workbooks, and CSV data warehouse exports.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation
The Sprint-009 specification is **technically sound, architecturally scalable, and fully aligned with AIOS standards**. The implementation extends existing production architecture:
- Dual-dialect Drizzle ORM schemas (`packages/db/schema.ts` for SQLite dev and `packages/db/schema.pg.ts` for PostgreSQL prod).
- Multi-tenant RBAC permissions (`@thaiba/auth`) extended with fine-grained regional access grants (`regional_access_grants`).
- Incremental data aggregation models in dedicated data warehouse tables (`dw_aggregated_analytics`, `dw_materialized_snapshots`, `dw_etl_runs`).
- Event-driven push notification routing with device registration tracking (`push_notification_subscriptions`, `alert_delivery_logs`).

### Technical Assessment & Risks Identified

1. **Cross-Institution Query Performance Under High Scale**
   - *Challenge:* Querying raw transactional data across 100+ campus databases for real-time benchmarking can cause severe performance degradation and high latency.
   - *Mitigation:* Implement an Enterprise Data Warehouse with incremental background ETL pipelines (`dw-etl-service.ts`) and pre-calculated materialized snapshots (`dw_materialized_snapshots`), ensuring regional queries complete in < 3 seconds.

2. **Cross-Tenant Security & Data Privacy Compliance**
   - *Challenge:* Exposing multi-campus data risks accidental data leakage between unauthorized institutions or regional groups.
   - *Mitigation:* Enforce strict regional hierarchy mappings (`hierarchy-service.ts`), explicit cluster access grants (`regional_access_grants`), data anonymization for comparative baselines, and automated security audit test suites (`regional-security-auditor.ts`).

3. **Push Notification Delivery Reliability for Critical AI Alerts**
   - *Challenge:* OS push notification throttling or network dropouts may cause critical risk alerts to fail delivery.
   - *Mitigation:* Implement multi-channel fallback (push + in-app notification feed), delivery status logging in `alert_delivery_logs`, and automatic retry backoff logic (`push-alert-router.ts`).

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule**, this contract was reviewed by **Qwen**, **OpenCode (Local-Ollama)**, and **Claude Code** for peer review and optimization. The following enhancements were incorporated into the contract:

1. **Incremental ETL & Materialized Snapshot Engine (OpenCode / Ollama):** Enforced incremental delta aggregation in `REG-003` to prevent re-processing full historical datasets during daily/weekly regional data refresh cycles.
2. **Immutable Regional Access Audit Trail (Claude Code):** Added requirement in `REG-002` and `REG-014` to record immutable audit logs (`regional_access_logs`) for all cross-institution queries, permission modifications, and regional access grant mutations.
3. **Normalized Anonymized Benchmarking Baselines (Qwen):** Required percentile normalization algorithms and institutional context adjustments in `REG-005` to ensure fair comparisons regardless of campus size or demographic differences.
4. **Push Alert Delivery Guarantee & Retry Fallback (OpenCode):** Standardized push alert dispatch in `REG-007` and `REG-013` with multi-channel fallback (push notification + local mobile outbox feed) and delivery receipt tracking.
5. **Granular Regional Role Permissions (Claude Code):** Enhanced task `REG-002` to define separate `regional_admin` and `regional_auditor` roles with scoped read/write permissions across campus clusters.

---

## Scope & Out of Scope

### In Scope

1. **Database Schema & Permission Extensions:**
   - Define Drizzle ORM schemas for `regional_groups`, `institution_clusters`, `regional_access_grants`, `regional_benchmarks`, `regional_hod_rankings`, `dw_aggregated_analytics`, `dw_materialized_snapshots`, `dw_etl_runs`, `push_notification_subscriptions`, and `alert_delivery_logs` in `packages/db/schema.ts` and `schema.pg.ts`.
   - Extend `@thaiba/auth` RBAC matrix with `regional:view`, `regional:manage`, `warehouse:export`, and `alerts:push_configure` permissions.

2. **Enterprise Data Warehouse & Regional Analytics Engine:**
   - Incremental ETL data aggregation pipeline (`dw-etl-service.ts`) operating across multi-tenant campus boundaries.
   - Multi-tenant campus hierarchy and regional access grant service (`hierarchy-service.ts`).
   - Cross-institution performance benchmarking engine (`benchmarking-service.ts`) with percentile normalization math.
   - Regional HOD performance ranking & discipline analytics engine (`hod-ranking-service.ts`).
   - Real-time AI critical risk push notification router (`push-alert-router.ts`).

3. **Web User Experience & Regional Analytics Workspaces:**
   - Executive Multi-Campus Regional Analytics Workspace (`/admin/regional-analytics`).
   - Cross-Institution Benchmarking & Comparative Intelligence Matrix (`/admin/regional-analytics/benchmarks`).
   - Regional HOD Ranking & Departmental Intelligence Hub (`/admin/regional-analytics/hod-rankings`).
   - Multi-Tenant Regional Hierarchy & Campus Grouping Management (`/admin/regional-analytics/hierarchy`).
   - Export engine integration (`/api/export/regional-analytics`) for PDF, XLSX, and CSV regional reports.

4. **Mobile Companion Regional Alerts & Push Integration:**
   - Mobile FCM/APNs push notification receiver service (`push_notification_service.dart`).
   - Regional alert feed screen (`RegionalAlertScreen`) in `thaibahive_mobile_app`.
   - Mobile API route (`/api/mobile/v1/regional-alerts`).

5. **Security, System Verification & Documentation:**
   - Automated regional security & multi-tenant isolation auditor (`regional-security-auditor.ts`).
   - End-to-end integration & ETL performance benchmark test suite (`regional-analytics-e2e.test.ts`, `dw-etl-performance.test.ts`).
   - Comprehensive regional architecture guide (`docs/multi-campus-regional-analytics-guide.md`).
   - AIOS documentation updates (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`).

### Explicitly Out of Scope

- Physical database sharding across separate geographical cloud data centers; data isolation is governed logically via tenant IDs, schema partitioning, and cluster access grants within the dual-dialect architecture.
- Custom third-party BI tool integrations (e.g. Tableau/PowerBI connectors); export functionality covers encrypted PDF, multi-tab XLSX, and CSV data warehouse dumps.
- Direct billing payment gateway integration for regional enterprise subscriptions; billing tiers remain tracked administratively in system settings.

---

## Risk Analysis & Mitigation Strategies

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Cross-Tenant Data Leakage in Regional Queries** | High | Low | Enforce explicit regional access grant checks (`regional_access_grants`) on every route via `requireAuth` wrapper and automated security audit test suite (`REG-014`). |
| **High Query Latency During Cross-Campus Benchmarking** | High | Medium | Execute queries against pre-aggregated materialized data warehouse snapshots (`dw_materialized_snapshots`) populated by background ETL jobs (`REG-003`). |
| **Unfair Institutional Comparison Due to Campus Size Variance** | Medium | Medium | Implement percentile normalization math and contextual adjustments (e.g. student-teacher ratio weighting) in `benchmarking-service.ts` (`REG-005`). |
| **FCM/APNs Push Notification Certificate Failures** | Medium | Medium | Provide graceful fallback to in-app notification feeds and store delivery failure records in `alert_delivery_logs` for retry (`REG-007`). |
| **ETL Pipeline Failures Under Heavy Concurrent Writes** | Medium | Low | Run ETL jobs inside atomic isolated transactions with exponential backoff retry queues and execution logging in `dw_etl_runs` (`REG-003`). |

---

## Rollback Strategy

In the event of unexpected issues during deployment of Sprint-009:

1. **Feature Flag Isolation:** Set `NEXT_PUBLIC_REGIONAL_ANALYTICS_ENABLED=false` and `NEXT_PUBLIC_PUSH_ALERTS_ENABLED=false` in environment settings to disable regional navigation tabs and background alert dispatch cleanly.
2. **Schema Additivity Guarantee:** All database schema changes (`regional_groups`, `institution_clusters`, `regional_access_grants`, `regional_benchmarks`, `regional_hod_rankings`, `dw_aggregated_analytics`, `dw_materialized_snapshots`, `dw_etl_runs`, `push_notification_subscriptions`, `alert_delivery_logs`) are strictly additive. No core single-campus ERP tables are modified or removed.
3. **Standalone Operational Independence:** Core campus functions (Attendance, Exams, Finance, HR, AI Predictions) operate independently of regional data warehouse aggregation.
4. **Mobile App Fallback:** Flutter mobile app gracefully suppresses regional push alert banners if regional mobile APIs return 503 Maintenance status.

---

## Implementation Tasks

The sprint is structured into **16 sequential implementation tasks**:

```
REG-001 ──► REG-002 ──► REG-003 ──► REG-005 ──► REG-008 ──► REG-009
                       │          │          │
                       ├──► REG-004├──► REG-006├──► REG-010
                       │          │          │
                       └──► REG-007└──► REG-011└──► REG-012
                                                        │
REG-001 ──► REG-002 ──► REG-007 ───────────────► REG-013 ──► REG-014 ──► REG-015 ──► REG-016
```

---

### Task REG-001: Database Schema Extensions for Multi-Campus Regional Analytics & Data Warehouse

- **Task ID:** REG-001
- **Description:** Extend Drizzle ORM schemas in both SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) to support Regional Groups (`regional_groups`), Institution Clusters (`institution_clusters`), Regional Access Grants (`regional_access_grants`), Regional Benchmarks (`regional_benchmarks`), HOD Rankings (`regional_hod_rankings`), Data Warehouse Aggregations (`dw_aggregated_analytics`), Materialized Snapshots (`dw_materialized_snapshots`), ETL Runs (`dw_etl_runs`), Push Subscriptions (`push_notification_subscriptions`), and Alert Delivery Logs (`alert_delivery_logs`).
- **Files:**
  - `[MODIFY] packages/db/schema.ts`
  - `[MODIFY] packages/db/schema.pg.ts`
  - `[MODIFY] packages/db/index.ts`
- **Dependencies:** None
- **Acceptance Criteria:**
  1. All 10 new database tables defined with proper column types, foreign keys, timestamps, indexes, and regional group references.
  2. Dual-dialect parity strictly maintained between SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`).
  3. Package exports updated in `packages/db/index.ts` without breaking existing codebase imports.
  4. Type generation succeeds with 0 TypeScript or Drizzle schema compilation errors.
- **Verification Method:** Run `pnpm --filter @thaiba/db build` and `pnpm typecheck`.
- **Estimated Complexity:** Medium (1 day)

---

### Task REG-002: Validation Schemas & Regional RBAC Permission Matrix Extensions

- **Task ID:** REG-002
- **Description:** Create Zod validation schemas in `src/lib/validation/schemas.ts` for regional cluster management, benchmarking queries, HOD ranking parameters, push alert configs, and ETL triggers. Update `@thaiba/auth` RBAC definitions to include regional permission scopes (`regional:view`, `regional:manage`, `warehouse:export`, `alerts:push_configure`) and regional roles (`regional_admin`, `regional_auditor`).
- **Files:**
  - `[MODIFY] src/lib/validation/schemas.ts`
  - `[MODIFY] packages/auth/src/permissions.ts`
  - `[MODIFY] packages/auth/src/types.ts`
  - `[NEW] src/lib/__tests__/regional-validation.test.ts`
- **Dependencies:** REG-001
- **Acceptance Criteria:**
  1. Zod validation schemas defined for regional queries, group creation, access grant assignments, and alert channel configurations.
  2. `@thaiba/auth` re-exports updated permission constants and role mappings for `super_admin`, `regional_admin`, `regional_auditor`, `admin`, `principal`, `hod`, and `staff`.
  3. Validation unit test suite passes cleanly, validating input boundaries and sanitizing text filters.
- **Verification Method:** Run `pnpm test src/lib/__tests__/regional-validation.test.ts`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task REG-003: Enterprise Data Warehouse & Automated ETL Pipeline Engine

- **Task ID:** REG-003
- **Description:** Implement scalable enterprise data warehouse ETL engine in `src/lib/regional/dw-etl-service.ts` to extract, transform, and aggregate daily/weekly operational, financial, attendance, and exam metrics across multi-tenant campus databases into `dw_aggregated_analytics` and `dw_materialized_snapshots` with execution logging in `dw_etl_runs`.
- **Files:**
  - `[NEW] src/lib/regional/dw-etl-service.ts`
  - `[NEW] src/app/api/admin/regional/etl/route.ts`
  - `[NEW] src/lib/regional/__tests__/dw-etl-service.test.ts`
- **Dependencies:** REG-001, REG-002
- **Acceptance Criteria:**
  1. Aggregates multi-campus operational metrics into normalized data warehouse snapshots within < 5 second SLA for 100 simulated campuses.
  2. Supports incremental delta aggregation to update only changed campus records since last run timestamp.
  3. API route `/api/admin/regional/etl` protected with `requireAuth` and `regional:manage` permission.
  4. Unit test suite verifies metric transformation accuracy, incremental refresh logic, and error recovery handling.
- **Verification Method:** Run `pnpm test src/lib/regional/__tests__/dw-etl-service.test.ts`.
- **Estimated Complexity:** High (1.5 days)

---

### Task REG-004: Multi-Tenant Campus Hierarchy & Regional Access Grant Engine

- **Task ID:** REG-004
- **Description:** Build institutional hierarchy management service in `src/lib/regional/hierarchy-service.ts` for organizing campuses into regional groups and clusters, assigning fine-grained access grants (`regional_access_grants`), and enforcing strict multi-tenant access boundaries.
- **Files:**
  - `[NEW] src/lib/regional/hierarchy-service.ts`
  - `[NEW] src/app/api/admin/regional/hierarchy/route.ts`
  - `[NEW] src/lib/regional/__tests__/hierarchy-service.test.ts`
- **Dependencies:** REG-001, REG-002
- **Acceptance Criteria:**
  1. Supports creation and management of multi-tier institutional hierarchies (Regional Group -> Campus Cluster -> Institution).
  2. Enforces strict regional access boundaries ensuring regional users can only query institutions explicitly assigned to their active grants.
  3. Logs all hierarchy mutations and access grant changes to audit trail table (`regional_access_logs`).
  4. Unit test suite validates hierarchy resolution, permission checks, and cross-cluster isolation.
- **Verification Method:** Run `pnpm test src/lib/regional/__tests__/hierarchy-service.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task REG-005: Cross-Institution Performance Benchmarking Engine

- **Task ID:** REG-005
- **Description:** Develop comparative analytics engine in `src/lib/regional/benchmarking-service.ts` to compute standardized institutional performance metrics (attendance stability, fee realization rate, academic pass velocity, AI risk prevalence) across campus clusters with statistical percentile normalization.
- **Files:**
  - `[NEW] src/lib/regional/benchmarking-service.ts`
  - `[NEW] src/app/api/admin/regional/benchmarks/route.ts`
  - `[NEW] src/lib/regional/__tests__/benchmarking-service.test.ts`
- **Dependencies:** REG-003, REG-004
- **Acceptance Criteria:**
  1. Computes normalized benchmarking scores (percentiles, z-scores, cluster ranks) across campuses for key performance indicators.
  2. Applies demographic and size normalization math to ensure fair comparisons between campuses of varying student counts.
  3. API route returns structured benchmarking payload with regional averages, top-quartile thresholds, and campus rankings.
  4. Unit test suite validates mathematical accuracy of percentile calculations and normalization algorithms.
- **Verification Method:** Run `pnpm test src/lib/regional/__tests__/benchmarking-service.test.ts`.
- **Estimated Complexity:** High (1.5 days)

---

### Task REG-006: Regional HOD Performance Ranking & Discipline Analytics Engine

- **Task ID:** REG-006
- **Description:** Build cross-campus department head ranking engine in `src/lib/regional/hod-ranking-service.ts` to evaluate HOD performance across discipline clusters (e.g. Science HODs across 25 campuses) using standardized academic progress, faculty attendance, syllabus completion, and student retention metrics.
- **Files:**
  - `[NEW] src/lib/regional/hod-ranking-service.ts`
  - `[NEW] src/app/api/admin/regional/hod-rankings/route.ts`
  - `[NEW] src/lib/regional/__tests__/hod-ranking-service.test.ts`
- **Dependencies:** REG-003, REG-004
- **Acceptance Criteria:**
  1. Ranks HODs within discipline clusters fairly based on multi-factor evaluation scores (0 to 100).
  2. Generates human-readable performance factors (e.g. "98% Syllabus On-Time Completion Rate").
  3. Stores ranking snapshots in `regional_hod_rankings` database table with regional group scoping.
  4. Unit test suite confirms mathematical correctness of weighted ranking algorithms and discipline filters.
- **Verification Method:** Run `pnpm test src/lib/regional/__tests__/hod-ranking-service.test.ts`.
- **Estimated Complexity:** High (1 day)

---

### Task REG-007: Real-Time AI Critical Risk Push Notification Router & FCM/APNs Dispatcher

- **Task ID:** REG-007
- **Description:** Build real-time push notification alert router in `src/lib/regional/push-alert-router.ts` connecting Sprint-008 AI prediction risk alerts and operational anomalies directly to FCM/APNs push dispatchers, managing mobile device tokens (`push_notification_subscriptions`), and logging delivery receipts (`alert_delivery_logs`).
- **Files:**
  - `[NEW] src/lib/regional/push-alert-router.ts`
  - `[NEW] src/app/api/admin/regional/alerts/push/route.ts`
  - `[NEW] src/lib/regional/__tests__/push-alert-router.test.ts`
- **Dependencies:** REG-001, REG-002
- **Acceptance Criteria:**
  1. Dispatches critical AI risk alerts to registered mobile devices via FCM/APNs payload formatting in < 10 seconds.
  2. Records delivery status (`sent`, `delivered`, `failed`) and attempt timestamps in `alert_delivery_logs`.
  3. Implements automatic retry backoff logic for failed push dispatches.
  4. Unit test suite verifies push payload formatting, device token resolution, and retry queues.
- **Verification Method:** Run `pnpm test src/lib/regional/__tests__/push-alert-router.test.ts`.
- **Estimated Complexity:** High (1 day)

---

### Task REG-008: Executive Multi-Campus Regional Analytics Workspace (Web)

- **Task ID:** REG-008
- **Description:** Develop the executive Regional Analytics dashboard in `src/app/(shell)/admin/regional-analytics/page.tsx` providing regional education directors and executive administrators with multi-campus aggregate KPIs, regional health index cards, campus cluster summaries, and active critical risk banners.
- **Files:**
  - `[NEW] src/app/(shell)/admin/regional-analytics/page.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/regional-overview-card.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/cluster-comparison-chart.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/regional-alert-banner.tsx`
- **Dependencies:** REG-003, REG-004, REG-005, REG-007
- **Acceptance Criteria:**
  1. Renders executive dashboard displaying regional health index, campus count, total student enrollment, average attendance stability, and active critical risk alert counter.
  2. Uses standard UI components (`<Button>`, `<Dialog>`, `<Badge>`, `<Skeleton>`, `<Alert>`) per `AGENTS.md`.
  3. Interactive chart components display cluster-level comparative performance trends.
  4. Includes error handling boundaries and skeleton loading states.
- **Verification Method:** Run `pnpm build` and verify interface in browser.
- **Estimated Complexity:** High (1 day)

---

### Task REG-009: Cross-Institution Benchmarking & Comparative Intelligence Matrix (Web)

- **Task ID:** REG-009
- **Description:** Build the detailed comparative analytics workspace in `src/app/(shell)/admin/regional-analytics/benchmarks/page.tsx` allowing regional administrators to inspect side-by-side campus metrics, percentile rank distributions, and historical performance trajectories across institutions.
- **Files:**
  - `[NEW] src/app/(shell)/admin/regional-analytics/benchmarks/page.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/benchmark-table.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/benchmark-filter-bar.tsx`
- **Dependencies:** REG-005, REG-008
- **Acceptance Criteria:**
  1. Filterable comparative table rendering campus benchmarking metrics by domain (Attendance, Academic, Fee Realization, AI Risk Index).
  2. Displays percentile indicators and visual status badges (`<Badge variant="success|warning|destructive">`).
  3. Uses `ensureArray` for array handling and standard UI components per `AGENTS.md` guidelines.
  4. Includes export button triggering regional benchmarking report downloads.
- **Verification Method:** Run `pnpm build` and verify benchmarking UI matrix.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task REG-010: Regional HOD Ranking & Departmental Intelligence Hub (Web)

- **Task ID:** REG-010
- **Description:** Implement HOD ranking dashboard in `src/app/(shell)/admin/regional-analytics/hod-rankings/page.tsx` enabling regional education authorities to review top-performing department heads across discipline clusters, inspect departmental score breakdowns, and issue regional performance recognitions.
- **Files:**
  - `[NEW] src/app/(shell)/admin/regional-analytics/hod-rankings/page.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/hod-rank-card.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/discipline-filter.tsx`
- **Dependencies:** REG-006, REG-008
- **Acceptance Criteria:**
  1. Ranks department heads within selectable discipline clusters (e.g. Science, Mathematics, Languages, Commerce).
  2. Displays composite performance score, ranking rank position (#1 to #N), and human-readable achievement factors.
  3. Includes discipline filter bar and search controls.
  4. Follows UI standards in `AGENTS.md` with zero raw HTML input/button tags.
- **Verification Method:** Run `pnpm build` and verify HOD ranking interface.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task REG-011: Multi-Tenant Regional Hierarchy & Campus Grouping Web Interface

- **Task ID:** REG-011
- **Description:** Build administrative interface in `src/app/(shell)/admin/regional-analytics/hierarchy/page.tsx` allowing regional super-admins to configure regional campus groups, assign institutions to clusters, grant regional access permissions, and set alert notification thresholds.
- **Files:**
  - `[NEW] src/app/(shell)/admin/regional-analytics/hierarchy/page.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/group-tree-view.tsx`
  - `[NEW] src/app/(shell)/admin/regional-analytics/_components/campus-assign-modal.tsx`
- **Dependencies:** REG-004, REG-008
- **Acceptance Criteria:**
  1. Interactive tree view interface displaying regional group structures and assigned campuses.
  2. `<Dialog>` modal for adding campuses to clusters and modifying regional access grants.
  3. Protected by `requireAuth` with `regional:manage` permission requirement.
  4. Form validation handles invalid hierarchy nesting cleanly with error alerts.
- **Verification Method:** Run `pnpm build` and verify hierarchy management UI.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task REG-012: Multi-Campus Regional Export Engine (PDF / XLSX / CSV)

- **Task ID:** REG-012
- **Description:** Extend Sprint-002 Export Engine to generate official PDF regional executive briefings, multi-tab XLSX benchmarking workbooks, and CSV data warehouse dumps with strict DDE formula injection sanitization.
- **Files:**
  - `[NEW] src/app/api/export/regional-analytics/route.ts`
  - `[NEW] src/lib/export/__tests__/regional-export.test.ts`
- **Dependencies:** REG-003, REG-005, REG-006
- **Acceptance Criteria:**
  1. `POST /api/export/regional-analytics` generates branded PDF executive regional briefings with summary metrics and cluster performance tables.
  2. Generates multi-tab XLSX workbooks containing campus benchmarks, HOD rankings, and data warehouse aggregation snapshots.
  3. Enforces DDE Formula Injection Sanitization on all export text strings.
  4. Response generated in < 3 seconds for up to 100 campus records.
- **Verification Method:** Run `pnpm test src/lib/export/__tests__/regional-export.test.ts`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task REG-013: Mobile Companion Regional Alerts & Push Receiver (Flutter)

- **Task ID:** REG-013
- **Description:** Implement Flutter mobile push notification service and regional alert feed screen in `thaibahive_mobile_app` for regional admins, principals, and HODs to receive real-time push alerts, view alert severity levels, and inspect anomaly details.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/regional_alerts/services/push_notification_service.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/regional_alerts/screens/regional_alert_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/regional_alerts/widgets/alert_item_card.dart`
  - `[NEW] src/app/api/mobile/v1/regional-alerts/route.ts`
- **Dependencies:** REG-007
- **Acceptance Criteria:**
  1. Handles incoming FCM/APNs push notification dispatches in foreground and background app states.
  2. `RegionalAlertScreen` renders filterable feed of regional risk alerts sorted by severity (Critical, High, Medium, Info).
  3. REST API `/api/mobile/v1/regional-alerts` delivers formatted regional alert JSON payloads.
  4. `flutter analyze` inside `thaibahive_mobile_app/` completes with 0 errors and 0 strict warnings.
- **Verification Method:** Run `flutter analyze` inside `thaibahive_mobile_app/` and verify mobile rendering.
- **Estimated Complexity:** High (1 day)

---

### Task REG-014: Enterprise Security Hardening & Regional Multi-Tenant Isolation Auditor

- **Task ID:** REG-014
- **Description:** Develop automated security auditor in `src/lib/security/regional-security-auditor.ts` to verify strict multi-tenant regional data boundaries, prevent cross-cluster data leakage, validate JWT token scopes, and audit regional mutation actions.
- **Files:**
  - `[NEW] src/lib/security/regional-security-auditor.ts`
  - `[NEW] src/lib/security/__tests__/regional-security.test.ts`
- **Dependencies:** REG-004, REG-007
- **Acceptance Criteria:**
  1. Validates that regional admins cannot query or mutate campuses outside their granted regional cluster (`regional_access_grants`).
  2. Verifies parameter tampering resistance across all regional API endpoints (returns 403 Forbidden on illegal tenant/cluster IDs).
  3. Confirms audit log entries (`regional_access_logs`) are created for all cross-institution queries.
  4. Unit test suite passes with 100% success rate.
- **Verification Method:** Run `pnpm test src/lib/security/__tests__/regional-security.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task REG-015: End-to-End Multi-Campus Integration & ETL Performance Benchmark Test Suite

- **Task ID:** REG-015
- **Description:** Build automated E2E integration test suite verifying multi-campus ETL data aggregation, benchmarking score accuracy, query response SLA (< 3s for 100 campuses), and push alert dispatch pipelines.
- **Files:**
  - `[NEW] src/app/api/admin/regional/__tests__/regional-analytics-e2e.test.ts`
  - `[NEW] src/lib/regional/__tests__/dw-etl-performance.test.ts`
- **Dependencies:** REG-001 through REG-014
- **Acceptance Criteria:**
  1. 100% pass rate across multi-campus integration scenario test matrices.
  2. Verifies data warehouse ETL pipeline completes within < 5 second SLA window for 100 simulated campuses.
  3. Verifies cross-institution benchmarking queries execute in < 3 seconds.
  4. Zero cross-tenant data leakage or security isolation breaches under load.
- **Verification Method:** Run `pnpm test src/app/api/admin/regional/__tests__/regional-analytics-e2e.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task REG-016: System Verification, Technical Debt Resolution & AIOS Registry Sync

- **Task ID:** REG-016
- **Description:** Conduct full workspace build and test verification, resolve any remaining linting/type warnings, author comprehensive Multi-Campus Regional Analytics guide in `docs/`, update project status tracking files, and issue v2.1.0 release certification.
- **Files:**
  - `[NEW] docs/multi-campus-regional-analytics-guide.md`
  - `[MODIFY] .ai/FEATURES.md`
  - `[MODIFY] .ai/CHANGELOG.md`
  - `[MODIFY] .ai/PROJECT_STATUS.md`
- **Dependencies:** REG-001 through REG-015
- **Acceptance Criteria:**
  1. Full workspace build (`pnpm build`) and typecheck (`pnpm typecheck`) complete with **0 errors**.
  2. `flutter analyze` inside `thaibahive_mobile_app/` completes with **0 errors and 0 strict warnings**.
  3. `docs/multi-campus-regional-analytics-guide.md` created detailing regional hierarchy setup, ETL pipeline architecture, benchmarking algorithms, and mobile push configuration.
  4. `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` updated reflecting **v2.1.0 release status (Multi-Campus Enterprise Milestone)**.
- **Verification Method:** Run full workspace validation and inspect documentation.
- **Estimated Complexity:** Medium (1 day)

---

## Detailed Specifications

### Database Table Schemas

#### 1. Table: `regional_groups`
```typescript
export const regionalGroups = sqliteTable("regional_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  regionalDirectorId: text("regional_director_id"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

#### 2. Table: `institution_clusters`
```typescript
export const institutionClusters = sqliteTable("institution_clusters", {
  id: text("id").primaryKey(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  clusterCategory: text("cluster_category").notNull().default("standard"), // tier_1 | tier_2 | rural | urban
  assignedAt: text("assigned_at").notNull(),
});
```

#### 3. Table: `regional_access_grants`
```typescript
export const regionalAccessGrants = sqliteTable("regional_access_grants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id),
  role: text("role").notNull(), // regional_admin | regional_auditor
  grantedBy: text("granted_by").notNull(),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});
```

#### 4. Table: `dw_aggregated_analytics`
```typescript
export const dwAggregatedAnalytics = sqliteTable("dw_aggregated_analytics", {
  id: text("id").primaryKey(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
  attendanceRate: real("attendance_rate").notNull(), // 0.00 to 100.00
  feeRealizationRate: real("fee_realization_rate").notNull(), // 0.00 to 100.00
  academicPassRate: real("academic_pass_rate").notNull(), // 0.00 to 100.00
  aiRiskStudentCount: integer("ai_risk_student_count").notNull().default(0),
  activeAnomalyCount: integer("active_anomaly_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
```

#### 5. Table: `alert_delivery_logs`
```typescript
export const alertDeliveryLogs = sqliteTable("alert_delivery_logs", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull(),
  userId: text("user_id").notNull(),
  deviceId: text("device_id"),
  channel: text("channel").notNull(), // push_fcm | push_apns | in_app
  deliveryStatus: text("delivery_status").notNull(), // pending | sent | delivered | failed
  attemptCount: integer("attempt_count").notNull().default(1),
  errorMessage: text("error_message"),
  sentAt: text("sent_at").notNull(),
});
```

---

### Key API Endpoint Specs

#### 1. Endpoint: `GET /api/admin/regional/benchmarks`
- **Description:** Retrieve comparative performance benchmarks across institutions in a regional group.
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Query Params:** `regionalGroupId=rg_south&period=30d`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "regionalGroupId": "rg_south",
    "totalCampuses": 24,
    "regionalAverages": {
      "attendanceRate": 93.8,
      "feeRealizationRate": 89.2,
      "academicPassRate": 88.5
    },
    "campusBenchmarks": [
      {
        "institutionId": "inst_101",
        "institutionName": "Thaiba Campus Alpha",
        "attendancePercentile": 92.5,
        "feeRealizationPercentile": 88.0,
        "academicPassPercentile": 94.1,
        "overallRank": 2,
        "status": "top_performer"
      }
    ]
  }
  ```

#### 2. Endpoint: `POST /api/admin/regional/alerts/push`
- **Description:** Dispatch critical AI risk alert push notifications to regional administrators and campus leaders.
- **Payload:**
  ```json
  {
    "alertId": "anom_7719",
    "severity": "critical",
    "title": "Chronic Absenteeism Spike Alert",
    "body": "Campus Gamma reported a 28% increase in unexcused absences in Grade 10.",
    "targetRegionalGroupId": "rg_south",
    "targetRoles": ["regional_admin", "principal"]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "dispatchedCount": 42,
    "failedCount": 0,
    "deliveryBatchId": "batch_9912"
  }
  ```

---

## Definition of Done (DoD)

Sprint-009 will be officially declared **100% COMPLETE & RELEASED (v2.1.0)** when all of the following conditions are met:

1. **Task Execution:**
   - All 16 tasks (REG-001 through REG-016) are fully implemented across backend web and Flutter mobile codebase.
   - Code strictly adheres to AIOS coding standards, Next.js 16 App Router conventions, and Flutter/Riverpod guidelines in `AGENTS.md`.

2. **Build & Type Safety:**
   - `pnpm build` completes with **0 errors**.
   - `pnpm typecheck` passes with **0 errors**.
   - `flutter analyze` inside `thaibahive_mobile_app/` passes with **0 errors and 0 strict warnings**.

3. **Test Suite Verification:**
   - Next.js backend regional analytics, ETL pipeline, benchmarking, HOD ranking, push alert router, export engine, security auditor, and E2E integration test suites (`dw-etl-service.test.ts`, `hierarchy-service.test.ts`, `benchmarking-service.test.ts`, `hod-ranking-service.test.ts`, `push-alert-router.test.ts`, `regional-export.test.ts`, `regional-security.test.ts`, `regional-analytics-e2e.test.ts`) pass with **100% success rate**.
   - Flutter mobile push receiver test suite passes cleanly.

4. **Performance & Security Certification:**
   - Data warehouse ETL pipeline completes within < 5 second SLA window for 100 simulated campuses.
   - Cross-institution benchmarking queries execute in < 3 seconds.
   - Critical push alerts delivered within < 10 seconds.
   - 100% multi-tenant isolation verified with zero cross-tenant data leakage.

5. **Documentation & Handoff:**
   - Execution log recorded at `.ai/execution/Sprint-009-Execution-Log.md`.
   - `.ai/FEATURES.md` updated marking Multi-Campus Regional Analytics complete (**v2.1.0 milestone**).
   - `.ai/CHANGELOG.md` updated with v2.1.0 release notes.
   - User and architecture guide created at `docs/multi-campus-regional-analytics-guide.md`.
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
*Target Release Version: v2.1.0 (Multi-Campus Enterprise Milestone)*  
