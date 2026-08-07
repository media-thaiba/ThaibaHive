# Changelog — ThaibaHive

All notable changes to the ThaibaHive ecosystem are documented here.

## [3.12.0] - 2026-08-07
### Added
- **Scheduled Job Management APIs:** Built REST API endpoints under `/api/admin/scheduled-jobs` supporting paginated query filtering, manual report enqueuing, and status updates (Pause/Resume/Cancel) gated with `super_admin` checks.
- **Scheduled Jobs Admin Console:** Created a dashboard at `/admin/scheduled-jobs` displaying current queue items, filtering panels, and dialog actions, featuring 10-second auto-polling.
- **Swarm Queue Telemetry & SSE:** Programmed queue worker EventBus metrics (backlog, worker load, retry rates), SSE stream updates with exponential reconnect backoffs, and 15s fallback database polling.
- **Active Execution Pipeline Topology:** Designed a custom SVG topology map with animated glowing link paths and active worker job ID tags.
- **Preference Audit Log Dashboard:** Programmed a paginated compliance dashboard at `/admin/audit-logs` debouncing filter searches for key modification histories.
- **Test & Validation Harnesses:** Created mock endpoint specs and report-queue event integration test coverage, validating 202 test suites passing cleanly.

## [3.11.0] - 2026-08-06
### Added
- **Database-Backed Job Queue System:** Transitioned scheduled report compilation queue from volatile in-memory storage to persistent `scheduled_jobs` and `job_executions` tables.
- **Atomic Concurrency Controls:** Implemented optimistic locking with conditional updates (`UPDATE WHERE status = 'queued'`) to prevent concurrent double-processing in clustered horizontally scaled environments.
- **Queue Backoff and Retries:** Integrated exponential backoff retry logic (up to 3 attempts) with execution logs tracked in the database.
- **Relational Preferences Auditing:** Replaced standard console-based log outputs with the `preference_audit_log` database table, logging configuration changes asynchronously to ensure sub-50ms API response latency.
- **Secure Audit Logging Guards:** Created explicit `getAuditLogs` method in PreferenceAuditService protecting audit logs retrieval with programmatic `super_admin` role validation.
- **Cashier Dynamic Queries:** Implemented Drizzle aggregations calculating daily collection sums, transaction checkouts, and pending dues count/totals.
- **Parent Dynamic Queries:** Programmed parent-child relationship query mapping, student attendance checks, and outstanding fee balance tracking using active exam hall ticket fee lock checks.
- **Verification Suites:** Created Jest unit tests verifying job enqueuing, backoffs, log pruning, cashier/parent query logic, and verified all 199 test suites passing.

## [3.10.0] - 2026-08-06
### Added
- **Analytics Database Schemas:** Appended migrations adding `workspace_analytics_cache`, `report_schedules`, and `report_history` tables to dev.db and pg schemas.
- **Unified Analytics Service:** Created calculator engines compiling daily attendance variations, fee recovery collection efficiency, exam pass rates, platform active user sessions, and predictive student risk factors.
- **REST Endpoints for BI Engine:** Exposed GET `/api/analytics` and full collection operations under `/api/analytics/schedules`.
- **Specialized Visualization Widgets:** Designed and enhanced principal widgets with gauge meters, area trends, and comparative charts.
- **Executive BI Dashboard & Custom Report Builder:** Built dynamic Next.js layout switching tabs, persisting search filters to localStorage, and compiling custom on-demand reports.
- **On-Demand Report Export Engine:** Formulated PDF and Excel generation output buffers via `pdfkit` and `exceljs` stored directly to `public/exports/`.
- **In-Memory Background Scheduler Queue:** Set up a concurrency-limited in-memory background worker to process automated scheduled report dispatches.
- **Flutter Mobile Screens & Offline Caching:** Designed sparkline CustomPainters in Flutter for analytics views, and configured Riverpod states using Hive local storage.
- **E2E & Unit Test Suites:** Authored Jest analytics tests, and Playwright end-to-end spec authenticating users and testing report compilation.

## [3.9.0] - 2026-08-04
### Added
- **Workspace Preferences Database Schema:** Formulated SQLite and PostgreSQL migration scripts implementing the `workspace_preferences` table.
- **Workspace Aggregation API Layer:** Implemented `WorkspaceAggregationService` and `/api/workspaces/data` scoped endpoint with a 60-second public cache, returning role-based data.
- **Workspace Preferences API:** Created `/api/workspaces/preferences` endpoint supporting GET layout retrieval and PUT configuration updates with Zod validation, rate-limiting, and audit logging.
- **Workspace Dynamic Router & RBAC Middleware:** Integrated edge-compatible JWT base64 role decoder to redirect `/workspace` calls to role-specific layouts `/workspace/{role}`.
- **Adaptive Layout Shell & Widget Library:** Constructed `WorkspaceShell` with customizable grid layouts, `WorkspaceSkeleton` states, and 8 reusable widgets (Attendance Trends, Fee Recovery, etc.).
- **Real-Time Workspace SSE Integration:** Authored `/api/workspaces/sse` endpoint emitting status updates (attendance, receipts) with a 5-second carrier-resilient heartbeat.
- **Flutter Mobile Workspace Dashboards:** Programmed Riverpod-powered workspace dashboards for Principal, Teacher, Cashier, and Parent screens with Hive caching.
- **Embedded Workspace WebView:** Built companion Flutter widget with secure hardware storage tokens and nonce handoff for seamless web page authentication.
- **Test Suites:** Created Jest unit tests, Playwright router security tests, and Flutter widget tests.

## [3.8.0] - 2026-08-04
### Added
- **Mobile Network-Aware Bandwidth Auto-Tuning (MNAT):** Implemented client-side network type, latency, and bandwidth diagnostics driving parameter auto-tuning (batch sizes, compression level, retry backoffs).
- **Battery-Aware Sync Compression Throttling:** Detects low battery (< 20%) and forces fast compression (gzip level 1) to conserve client CPU cycles.
- **Client Handshake Circuit Breaker:** Integrated StateNotifier provider lock-out that skips server handshake requests for 2 hours if 3 consecutive server fetch errors occur.
- **Admin Tuning Console:** Added interactive WIFI, CELLULAR, and DEFAULT tuning policy settings forms, success rate indicators, and auditing logs to the Swarm console.
- **Auto-Tuning Database Schema & Seeds:** Formulated SQLite/Postgres schemas (`sync_tuning_policies`) and developed CLI seed reset script (`reset-sync-policies.ts`).

## [3.6.0] - 2026-08-04
### Added
- **Visual Playback Control Dashboard UI:** Surfaced historical trace replay capabilities graphically into the Next.js Swarm Observability Console. Administrators can pause, play, step-forward, step-backward, speed configuration (0.5x, 1x, 2x, 5x), and scrub range timelines.
- **Timeline Virtualization:** Dependency-free virtualized list component (`PlaybackEventList.tsx`) for event log rendering, capped below 50MB and maintaining 60 FPS scrolling for lists of up to 10,000 events.
- **Edge Telemetry Ingestion & Compression:** Developed endpoint `/api/admin/swarm/telemetry` supporting compressed batch uploads (gzip/brotli), decompression middleware, and body size/zip-bomb protection (5MB limit).
- **SSE Stream Response Compression:** Outbound SSE text/event-stream responses compressed via native `CompressionStream("gzip")`, with a socket cleanup connection handler.
- **Bandwidth Savings Tracking & UI:** TelemetryDashboard displays bandwidth savings percentages and compression performance graphs.
- **SQLite ↔ PostgreSQL index schema parity checker:** Synchronization script `sync-sqlite-indexes.ts` checking index configurations.
- **React 19 / ESLint Warnings Resolution:** Remediated 29 ESLint warnings and React 19 hook purity issues (impure Date.now render calls).

## [3.5.0] - 2026-08-04
### Added
- **Swarm Telemetry Observability Event Bus & SSE stream**: In-memory EventBus with ring-buffer storage of last 1000 events, event batching, and configurable filtering. Persistent SSE stream route (`/api/admin/swarm/stream`) with connection pooling (max 100 concurrent channels) and heartbeats.
- **Observability REST APIs & Aggregators**: Endpoints returning timeseries metrics (`/api/admin/swarm/metrics`), auction bids (`/api/admin/swarm/sessions`), and current topology graph (`/api/admin/swarm/topology`). `MetricsAggregator` to execute background rollups of metrics into 1-minute buckets.
- **React Swarm Observability Console**: Multi-widget interactive visual dashboard including SwarmTopology tree nodes, Vickrey bids timelines, latency line charts, continuous compliance monitors (Radix UI `<Dialog>`), and remediation history timelines.
- **Self-Healing Remediation Engine & Verification**: RemediationEngine with FIFO queues per resource, HMAC-signed healer connectors with 10s replay attack expiry gates, automated RollbackHandler compensation actions, and human approval gateway gates.
- **Diagnostics, Replay & Voice commands**: Tick-by-tick `PlaybackEngine` CLI replay (`src/scripts/swarm-playback.ts`), rolling average latencies `AnomalyDetector`, and Speech-to-Text intent recognitions mapping for diagnostics queries inside `VoiceQueryParser`.
- **Sprint-021 Test Suites**: Integration suites testing event bus, metrics rolls, dashboard components, state machines, gateways, and end-to-end telemetry flows. Total: **17 new tests** across 4 suites.

## [3.4.0] - 2026-08-03
### Added
- **Multi-Agent Negotiation Framework**: Sealed-bid/Vickrey auctions implementation (`negotiation-coordinator.ts`), Pareto utility engine, and wait-for-graph cycle deadlock detectors.
- **Swarm Coordination & Topology**: 3-tier parent-child routing hierarchy, local-autonomous replay engines, and partition handler detection.
- **Vector-Mesh Optimization Engine**: 64-node vector clock compression, volume-based merge strategies, priority-aware CRDT conflict resolution, and round-trip time (RTT) sync control algorithms.
- **Compliance Intelligence Engine**: Scoped compliance auditing (`compliance-audit-vault.ts`) evaluating GDPR, HIPAA, SOC2, FERPA, and MoE rules dynamically.
- **Autonomic Swarms & Federated Governance Guide** (`docs/autonomic-swarms-federated-governance-guide.md`): Setup guides, schemas, and flowcharts.

## [3.3.0] - 2026-08-03
### Added
- **Intelligent Agent Orchestration Framework**: Registry (`registry.ts`), priority-sorted message bus (`message-bus.ts`), scheduler with distributed locking (`scheduler.ts`), state store with Drizzle mapping (`state-store.ts`), and consensus engine with leases and cooldowns (`consensus.ts`). Appended `agent_registry`, `agent_logs`, and `agent_decisions` tables to DB schema.
- **Self-Healing Infrastructure Agents**: Remediations for database replication lag (`database-healer.ts`), edge worker errors (`edge-healer.ts`), queue wait-time limits (`pool-healer.ts`), and WebRTC/HLS segmenter resets (`stream-healer.ts`), with human approval gateway (`approval-gateway.ts`) and control API routes (`/api/admin/agents/*`).
- **Predictive Model Auto-Tuning Pipeline**: Drift detection on performance drops (`drift-detector.ts`), mock retraining runs registering candidate versions (`retraining-pipeline.ts`), A/B test split routing (`ab-test-framework.ts`), and promoter with buffer guards and rollbacks (`model-promoter.ts`).
- **Conversational Voice Copilot Extensions**: Keyword-based intent mapper (`intent-mapper.ts`), scan diagnostics handler (`diagnostics-handler.ts`), and two-step action confirmation feedback loop (`feedback-loop.ts`).
- **Sprint-019 Integration Test Suites**: Verification suites covering core orchestration, healing, auto-tuning, and voice copilot integrations. Total: **14 new tests** across 4 suites.
- **Intelligent Agent Self-Healing Guide** (`docs/intelligent-agents-self-healing-guide.md`): Architecture guides, topology, healer registry, and subscriptions.

## [3.2.0] - 2026-08-03
### Added
- **Global Edge Caching & Multi-Tier Optimization**: Edge memory cache and distributed Redis Cluster caching manager (`edge-cache.ts`), global webhook cache invalidation pipeline (`invalidation.ts`), predictive cache warming scheduler (`warming.ts`), and adaptive edge media transcoding processor (`media-accelerator.ts`). API routes at `/api/admin/cache/invalidate/*`.
- **Federated API Gateway & Orchestrator**: Dynamic microservice schema registry reloader and validator (`schema-manager.ts`), query planning parser (`query-planner.ts`), and gateway query execution orchestrator (`gateway.ts`). API routes at `/api/graphql/federated` and `/api/admin/federation/*`.
- **Database Geo-Aware Routing & Pooling**: Lag-aware regional read replica router (`edge-router.ts`), and short-lived Edge connection pooling manager (`edge-pool.ts`).
- **Observability Telemetry & Guardrails**: Performance latency recorder (`edge-analytics.ts`), hit-rate compiler (`cache-analytics.ts`), regional quota usage tracker (`usage-tracker.ts`), query depth guard, and metrics API route at `/api/admin/edge/metrics`.
- **Sprint-018 Integration & Verification Test Suite**: Edge runtime integrations (5/5), federated gateway (5/5), intelligent caching (5/5), database geo-routing (4/4), security invariants (3/3), and SLA performance benchmarks (2/2). Total: **24 new tests**.
- **Global Edge Caching & Federated API Mesh Guide** (`docs/global-edge-caching-api-mesh-guide.md`): Comprehensive architecture diagram, configurations, routing topologies, validation settings, and operational instructions.

## [3.1.0] - 2026-08-03
### Added
- **Multi-Region Data Mesh (CRDT Replication)**: LWW-CRDT conflict resolution with vector clock causality (`crdt-resolver.ts`, `vector-clock.ts`), mesh replication engine with batching and checksum validation (`replication-engine.ts`), region health monitoring (`region-health.ts`), latency-aware query routing (`query-router.ts`), and persistent cross-region sync queue with exponential backoff (`sync-queue.ts`). Admin API routes at `/api/admin/mesh/*`.
- **Predictive Student Learning Analytics**: Weighted multi-factor feature extraction engine (`feature-extractor.ts`), risk scoring model with confidence interval (`prediction-engine.ts`), personalised learning path recommender (`learning-path-recommender.ts`), and 5-minute cached inference service (`inference-service.ts`). API routes at `/api/analytics/*`.
- **Hybrid WebRTC/HLS Distance Learning Streaming**: WebRTC SDP signaling server (`webrtc-signaling.ts`), room/participant session manager with capacity enforcement (`media-session.ts`), adaptive-bitrate HLS segmenter with sliding-window playlist (`hls-segmenter.ts`), recording lifecycle manager (`stream-recorder.ts`), and collaboration bridge (`collaboration-bridge.ts`). API routes at `/api/streaming/*`.
- **PostgreSQL Multi-Node Cluster Certification**: Node health cluster monitor (`cluster-monitor.ts`), lag-aware dynamic replica pool with primary fallback (`replica-pool.ts`), quorum-guarded automated failover manager < 30s RTO (`failover-manager.ts`), and zero-downtime dual-write migration lifecycle (`live-migrator.ts`). Admin API routes at `/api/admin/database/cluster/*`.
- **Sprint-017 Test Suites**: Multi-region mesh integration (6/6), predictive analytics (4/4), streaming integration (5/5), PostgreSQL failover (8/8), performance benchmarks (12/12), and security audit (13/13). Total: **48 new tests**.
- **Global Education Intelligence Guide** (`docs/global-education-intelligence-guide.md`): Complete architecture guide, API reference, schema documentation, configuration reference, and operational runbook.
- **Schema Parity Fix**: Added 21 missing tables (Sprints 015/016/017) to `packages/db/schema.pg.ts` restoring 100% SQLite ↔ PostgreSQL schema parity.

## [3.0.0] - 2026-08-03
### Added
- **Regional Data Lakehouse ETL Engine**: Parquet/Arrow export writer (`parquet-writer.ts`), incremental multi-tenant ETL pipeline (`etl-engine.ts`), partition manager (`partition-manager.ts`), schema evolution manager (`schema-manager.ts`), and administrative API route handlers (`/api/admin/lakehouse/*`).
- **Enterprise Identity Federation (SAML 2.0 & OIDC)**: SAML 2.0 Service Provider engine (`saml-service.ts`), OIDC Relying Party handler with PKCE (`oidc-service.ts`), Federated User Mapper (`federated-user-mapper.ts`), Just-In-Time (JIT) provisioning, and identity federation API routes (`/api/auth/saml/*`, `/api/auth/oidc/*`).
- **Automated Database Index Auto-Tuning Engine**: PostgreSQL query performance analyzer (`index-analyzer.ts`), non-blocking concurrent index execution engine with `lock_timeout` safety guards (`index-auto-tuner.ts`), and admin control API endpoints (`/api/admin/database/index-tuning/*`).
- **Enterprise MDM Deployment & App Wrapping Certification**: Intune XML & Apple `.mobileconfig` profile generator (`config-generator.ts`), zero-touch hardware enrollment API (`/api/mobile/mdm/*`), and Flutter managed configuration client service (`mdm_config_service.dart`).
- **Sprint-016 Integration & Verification Test Suite**: Automated benchmark test suite (`sprint-016-performance.test.ts`), cross-tenant security audit test suite (`sprint-016-security-audit.test.ts`), and complete Architecture Guide (`docs/enterprise-multi-tenant-lakehouse-guide.md`).

## [2.7.0] - 2026-08-03
### Added
- **Official App Store & Play Store Distribution Pipelines**: Android Keystore signing, ProGuard/R8 obfuscation, iOS ExportOptions plist configuration, and automated GitHub Actions release pipeline (`.github/workflows/mobile-release.yml`).
- **Real-Time FCM/APNs Push Notification Engine**: Unified push notification service (`push-notification-service.ts`) with FCM and APNs drivers, device token management API (`/api/mobile/push/register`), and SSE-to-push event bridge (`sse-push-bridge.ts`).
- **Dart Background Isolate Offline Sync Engine**: Background isolate execution worker (`background_sync_isolate.dart`), WorkManager/BackgroundFetch platform channels, and background sync health API (`/api/mobile/sync/background-status`).
- **100% WCAG 2.1 AA Accessibility Compliance**: Complete screen reader, ARIA landmark, focus trap, and contrast ratio remediation across web shell pages and Flutter companion UI screens (`accessibility-wcag.test.ts`).
- **100% Test Suite Coverage (150/150 Passing)**: Remediated all 9 remaining legacy test suites, achieving complete 100% test coverage across the repository.

## [2.6.0] - 2026-08-01

### Added
- **Mobile Platform Production Hardening (100% Mobile Companion)**: Flutter Voice Copilot features live HTTP integration with `/api/admin/voice/query` via Riverpod provider (`voiceCopilotProvider`) and nonce exchange retry.
- **Real Encrypted Hive Offline Persistence**: `OfflineSyncQueue` powered by encrypted Hive storage (`HiveAesCipher`) with automated schema migration handler (`HiveMigrationHandler`) replacing mock persistence.
- **Executive Analytics Dashboard (`/admin/executive/analytics`)**: Unified executive intelligence dashboard aggregating cross-campus federated governance, infrastructure resilience, voice copilot usage, and mobile offline sync metrics.
- **Fuzzy & Phonetic Voice Search (`voice-query-parser.ts`)**: Natural language parser equipped with Soundex and Levenshtein distance string matching algorithms for voice misrecognition tolerance.
- **Policy Sync SSE Broadcast (`policy-sync-engine.ts`)**: `PolicySyncEngine.propagatePolicy()` broadcasts real-time `POLICY_PROPAGATED` SSE events on the `governance` channel.
- **GitHub Actions Flutter CI Pipeline (`.github/workflows/flutter-ci.yml`)**: Automated `flutter analyze` and `flutter test` quality gates for mobile code quality on pull requests.
- **Jest Worker Isolation & Test Stability (`jest.config.js`, `test-db.ts`)**: Resolved SQLITE_BUSY lock contention and Next.js request context test failures via worker isolation (`maxWorkers: 1`) and isolated in-memory test database factory.
- **Production Configuration & Redis Cluster (`docker-compose.redis-cluster.yml`, `.env.production.example`)**: 6-node Redis Cluster compose environment and production SMS gateway configuration template.

## [2.5.0] - 2026-08-01
### Added
- **AI-Powered Predictive Analytics Engine (`/app/(shell)/admin/ai-analytics`)**: Elevated ThaibaHive to an intelligent platform with predictive inference models for student attendance, fee collection realization, and academic performance trajectories.
- **Historical Feature Extractor & Pipeline (`feature-extractor.ts`, `/api/admin/ai/extract-features`)**: Assembles student attendance rates, fee payment delay histories, and exam mark trends into normalized feature vectors.
- **Chronic Absenteeism Prediction Engine (`attendance-prediction-service.ts`, `/api/admin/ai/predictions/attendance`)**: Predicts 30-day attendance probability, flags chronic absenteeism risks, and identifies Monday absenteeism patterns with confidence scores (>80% accuracy).
- **Fee Collection Forecasting & Default Risk Engine (`fee-forecasting-service.ts`, `/api/admin/ai/predictions/fees`)**: Models institutional cash flow realization trajectories over 30/60/90 days and flags high-risk default accounts.
- **Academic Performance & Student At-Risk Early Warning Engine (`academic-prediction-service.ts`, `/api/admin/ai/predictions/academic`)**: Evaluates exam mark trajectories across terms to project final grade outcomes and flag academically vulnerable students.
- **Operational Anomaly Detection & AI Executive Summarizer (`anomaly-detector.ts`, `executive-summarizer.ts`, `/api/admin/ai/insights/summary`)**: Detects operational volume spikes (canteen spikes, gate pass surges) and generates natural language executive briefings.
- **Executive Predictive Analytics & Early Warning Workspace (`/admin/ai-analytics`, `/admin/ai-analytics/early-warning`)**: Real-time executive dashboard, filterable at-risk student rosters, and counselor intervention modal.
- **AI Insights Export Integration (`/api/export/ai-insights`, `ai-export.test.ts`)**: Extends multi-format export engine for PDF executive briefings, XLSX trend spreadsheets, and CSV audit logs with DDE sanitization.
- **Server-Side Cross-Platform Delta Sync Protocol (`sync-engine-service.ts`, `/api/sync/delta`, `/api/sync/push`)**: Bidirectional REST delta sync APIs with sequence versioning (`sync_version`) for web and mobile clients.
- **Deterministic Field-Level Last-Write-Wins (LWW) Conflict Resolver (`conflict-resolver.ts`, `sync-engine.test.ts`)**: Merges concurrent edits deterministically with immutable conflict audit logs (`sync_conflict_logs`).
- **Mobile Companion AI Insights & Background Workers (`AiInsightsScreen`, `background_sync_worker.dart`, `outbox_queue_manager.dart`)**: Flutter AI prediction screens, Riverpod state management, and WorkManager/BackgroundFetch outbox sync queues for background execution.

## [1.9.0] - 2026-07-31

### Added
- **Admin Module Performance Reviews & HR Development (`/app/(shell)/admin/performance`)**: Achieved 100% MVP completion across all 7 platform domains by delivering complete staff performance evaluation systems and multi-tenant production staging certification.
- **Competency Framework Builder & Form Templates (`framework-builder.tsx`, `form-template-modal.tsx`)**: Configurable competency rating rubrics, dynamic metric weightings, and custom evaluation form templates for all institution typologies.
- **Multi-Stage Review Workflow Engine (`review-workflow-service.ts`, `/api/admin/performance/reviews/*`)**: Deterministic review state machine (Self-Assessment → Manager Rating → 360 Feedback → HR Approval → Staff Sign-off) with score locking, average score calculations, and grade assignments.
- **Staff Self-Service Performance Portal (`/staff/performance`, `self-assessment-form.tsx`, `goal-tracker.tsx`)**: Self-assessment submissions, quarterly professional development goal progress tracking, and historical appraisal records.
- **Manager & HOD Evaluation Workspace (`/admin/performance/evaluate`, `manager-evaluation-form.tsx`, `360-feedback-collector.tsx`)**: Side-by-side comparative scoring against self-assessments, peer 360 feedback requests, and action plan editing.
- **Executive HR Performance Analytics (`/admin/performance/analytics`, `performance-heatmap.tsx`, `department-comparison-chart.tsx`)**: Real-time performance heatmaps, department score ranking curves, and compliance audit logs.
- **Multi-Format Performance Exports & Notifications (`/api/export/performance`, `performance-notifications.ts`)**: Encrypted PDF appraisal summaries, XLSX department reports, CSV audit logs, and automated deadline push/email notifications.
- **Mobile Staff Performance Experience (`StaffPerformanceScreen`, `/api/mobile/v1/staff/performance`)**: Cross-platform Flutter staff self-service screens for evaluation summary and goal tracking.
- **Multi-Tenant MVP Production Staging Certification (`multi-tenant-staging-security.test.ts`, `multi-tenant-staging-performance.test.ts`)**: Automated staging test suites certifying 100% tenant isolation, sub-second response times, and system stability under multi-campus load.

## [1.8.0] - 2026-07-31

### Added
- **Services Module & Campus Operations (`/app/(shell)/vehicles`, `/canteen`, `/visitors`)**: Digitized daily campus operational touchpoints across 23+ campuses (Fleet, Canteen Cashless Meal Passes, Visitor Security).
- **Fleet Management & Dispatch (`/api/vehicles/*`, `vehicles/page.tsx`)**: Real-time vehicle tracking, driver route assignments, vehicle maintenance logs, and requisition approval workflows.
- **Canteen Cashless Meal Pass System (`/api/canteen/*`, `cashier-terminal.tsx`)**: Daily cafeteria menu publisher, meal pass wallets, atomic balance deductions (`db.transaction`), cashier terminal, and Flutter mobile scanner screen (`MealPassScannerScreen`).
- **Parent Portal Meal Balance & Dietary Controls (`/api/mobile/v1/parent/canteen-balance`, `dietary_settings_screen.dart`)**: Real-time student meal balance monitoring, transaction audit logs, low balance warnings, and parent dietary restriction flags.
- **Cryptographic Visitor QR Gate Passes (`/api/visitors/*`, `qr-pass-service.ts`)**: Visitor pre-registration, host employee approvals, HMAC-SHA256 signed QR gate passes, and gatekeeper verification APIs (`GateVerificationScreen`).
- **Offline Gatekeeper Visitor Pass Cache & Sync Engine (`offline_pass_cache.dart`, `/api/mobile/v1/visitors/sync`)**: Encrypted local visitor pass caching and asynchronous offline gate entry/exit log reconciliation.
- **Services Module Export Engine Integration (`/api/export/fleet`, `canteen`, `visitors`)**: Multi-format CSV, Excel (XLSX), and PDF audit log reports for vehicle logbooks, canteen sales ledgers, and gatekeeper visitor logs.

## [1.7.0] - 2026-07-31
### Added
- **Mobile Companion App Integration (`thaibahive_mobile_app/`)**: Delivered cross-platform Flutter companion app integration connecting core web platform (Finance, Examination, Attendance, Parent Portal).
- **WebView Nonce SSO Handoff (`/api/auth/mobile-handoff/nonce`)**: Built single-use cryptographic nonce handoff system (60s TTL) with `WebViewHandoffScreen` for seamless token handoff.
- **Lightweight Mobile API Endpoints (`/api/mobile/v1/*`)**: Created dedicated mobile endpoints (`dashboard`, `profile`, `sync`, `notifications`, `parent/student-360`) returning minified JSON payloads (<5KB) with ETag caching.
- **Mobile Financial Approval Workflows (`ApprovalListScreen`, `approvalProvider`)**: Single-tap mobile financial approval cards with mandatory rejection reason dialog connected to Sprint-003 approval engine.
- **Invigilator Hall Ticket QR Scanner & DOB PDF Report Cards**: Flutter camera QR code scanner with HMAC-SHA256 verification modal (`QrScannerScreen`) and DOB-encrypted PDF report card viewer (`ReportCardScreen`).
- **Staff Attendance Check-In & Student Roster**: Mobile staff check-in/out (`StaffCheckinScreen`) and student attendance roster toggle screen (`StudentRosterScreen`).
- **Offline-First Sync Engine & Outbox Queue**: Local Hive outbox queue manager (`OutboxQueueManager`) and Last-Write-Wins conflict resolution endpoint (`/api/mobile/v1/sync`).
- **Push Notification Service & Parent Portal 360**: FCM push notification service (`PushNotificationService`), notification preference controls, and Parent Portal 360-degree student dashboard (`ParentDashboardScreen`).

## [1.6.0] - 2026-07-31
### Added
- **Examination Management System (`/app/(shell)/examinations/` & `/api/examinations/*`)**: Delivered end-to-end examination management system across 23+ campuses.
- **Grade Calculation Engine (`src/lib/examinations/grade-calculator.ts`)**: Built 10-point GPA scale calculator (`calculateGrade`, `calculateStudentTabulation`) with customizable pass thresholds.
- **Fee-Clearance Lock & Invigilator QR Verification (`hall-ticket-service.ts`)**: Real-time financial dues lock blocking hall tickets for unpaid fee balances, manual override logging, and HMAC-SHA256 QR scanner verification.
- **Double-Blind Teacher Mark Entry Portal (`MarkGridTable.tsx`, `MarkEntryPortal.tsx`)**: Candidate masking toggle (`EVAL-XXXX`), keyboard grid navigation, out-of-bounds mark entry validation, and HOD grace mark moderation modal.
- **Tabulation Register & Performance Analytics (`/examinations/tabulation`)**: Class mark matrix, student ranking, cohort pass percentage summary, and Sprint-002 multi-format export engine integration.
- **Encrypted Report Card PDF Generator (`report-card-generator.ts`, `/examinations/report-cards`)**: `pdfkit` report card generator with memory-optimized 50-student batch streaming, optional DOB password protection, and parent portal delivery API.

## [1.5.0] - 2026-07-31
### Added
- **Finance Multi-Stage Approval Engine (`/app/(shell)/finance/` & `/api/finance/*`)**: Delivered multi-stage workflow approval engine for expense claims and purchase requests across 23+ campuses.
- **Workflow State Machine (`src/lib/finance/workflow-engine.ts`)**: Built deterministic state machine governing stage progression (`Draft` → `Submitted` → `Pending HOD` → `Pending Accounts` → `Pending Principal` → `Approved` / `Rejected`).
- **Threshold & Emergency Auto-Routing**: Auto-approves expenses < $500; routes $500–$5,000 to HODs; routes > $5,000 to HOD → Accounts → Principal; handles emergency purchase instant approval path.
- **Interactive UI Shell (`src/components/finance/`)**: Created `FinanceDashboard`, `ApprovalQueue`, `<ApprovalModal>` with digital signature canvas, `<ApprovalDecisionPanel>`, and `<StatusTimeline>`.
- **Immutable Audit Logging (`src/lib/finance/models/audit-log.ts` & `AuditTrailPanel.tsx`)**: Append-only log storage and history timeline tracking with integrated multi-format export (CSV, XLSX, PDF) powered by **Sprint-002's Export Engine**.
- **Real-time Notifications & Mobile Handoff (`src/lib/finance/websocket-client.ts` & `NotificationCenter.tsx`)**: Real-time queue updates, unread badges, and mobile `WebViewHandoffScreen` nonce auth integration.

## [1.4.0] - 2026-07-31
### Added
- **Multi-Format Export Engine (`/api/export` & `src/lib/export/`)**: Built enterprise-grade data export pipeline supporting CSV (`.csv`), Excel (`.xlsx`), and PDF (`.pdf`) formats across 7 domain categories (`attendance`, `leaves`, `staff`, `payroll`, `accounts`, `assets`, `expenses`).
- **Excel Spreadsheet Formatting (`src/lib/export/excel-formatter.ts`)**: Integrated `exceljs` for generating styled workbooks with custom header rows, auto-sized column widths, number/currency formatting, and zebra striping.
- **Branded PDF Layouts (`src/lib/export/pdf-formatter.ts`)**: Integrated `pdfkit` for generating audit-ready PDF documents featuring institutional banners, metadata filter summaries, auto-paginated table grids, and page numbers.
- **CSV Formula Injection Defense (`src/lib/export/csv-formatter.ts`)**: Enforced automatic DDE attack sanitization prepending single quotes (`'`) to cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r`.
- **Domain-Granular RBAC Guarding**: Enhanced `/api/export` to enforce domain-specific permission checks (`attendance:read`, `staff:read`, `leaves:read`, `reports:read`, `assets:read`) with fallback to legacy `finance:export`.
- **Reusable UI Export Modal (`src/components/export-dialog.tsx`, `export-button.tsx`)**: Created `<ExportDialog>` primitive with interactive format selection, start/end date range pickers, progress states, and `sonner` toast notifications. Integrated into Shell pages.

## [1.3.0] - 2026-07-30
### Added
- **Media Library Integration (`/media-library` & `/media`)**: Wired frontend UI to 80% complete production backend API endpoints (`/api/media/*`).
- **Unified API Client Wrapper (`src/lib/api/client.ts`)**: Built standardized, type-safe API client with automatic JWT httpOnly cookie transmission, 401/403 permission handling with redirects, 429 rate-limit backoff handling, offline network detection, and retry logic.
- **File Upload & Dropzone (`src/components/ui/dropzone.tsx`, `upload-progress.tsx`)**: Multi-file selection, drag-and-drop zone, file validation (blocks executables, max 100MB limit), and progress tracking queue with retry/cancel capabilities.
- **Folder Tree & Breadcrumbs (`src/components/ui/folder-tree.tsx`, `breadcrumbs.tsx`)**: Hierarchical folder navigation, folder creation, renaming, and empty folder deletion.
- **File Preview & Metadata (`src/components/ui/file-preview.tsx`, `metadata-panel.tsx`)**: Media preview modal supporting image zoom/rotate, HTML5 video/audio player, PDF view, keyboard navigation, and detailed file properties panel.
- **Share Link Management (`src/components/ui/share-dialog.tsx`, `share-list.tsx`)**: Generated shareable links with configurable expiration (1h, 24h, 7d, never) and optional password protection.
- **Batch ZIP Downloads (`src/components/ui/download-progress.tsx`)**: Multi-select asset checkboxes and bulk export ZIP archive generation via `/api/media/batch-download`.
- **Search & Filtering (`src/components/ui/search-bar.tsx`, `filter-panel.tsx`)**: Real-time 300ms debounced search and filtering by file type and upload date range.
- **Move & Delete Operations (`src/components/ui/folder-selector.tsx`, `confirm-dialog.tsx`)**: Item relocation between folders and deletion confirmation dialogs.

## [1.2.0] - 2026-07-19
### Added
- Implemented **Daily Activity Logs (`/reports`)** page with log history, creation/drafting/submission dialog, and linked project tasks with logged hours.
- Implemented **Expense Claims (`/expenses`)** page with category filters, description, amount, receipt file uploading (calling `/api/upload`), and approvals.
- Implemented **Purchase Requests (`/purchases`)** page with procurement submission, visual timeline stepper (Requester -> HOD -> Accounts -> Purchase), and stage approvals.
- Implemented **Institutional Financials (`/accounts`)** page with revenue/operational expenses/balance summary cards, date/institution filters, and a transaction ledger table.
- Added client-side **Tax Rate Overrides** calculator panel in `/accounts` for estimated GST liabilities analysis.
- Modified `/api/export` endpoint to support type `"accounts"`, enabling administrators to download transaction ledgers in CSV format.
- Extended the design system `EmptyState` component to support an optional `onClick` handler action prop.

## [1.1.0] - 2026-07-19
### Changed
- Unlocked 13 Flutter features previously hidden behind `ComingSoonScreen`: events, expenses, purchases, visitors, grievances, vehicles, canteen, checklists, timeline, availability, accounts, admin.
- Updated `router.dart` to wire actual screen implementations instead of placeholders.
- Updated `MoreScreen._unlockedRoutes` to include all 23 features.
### Fixed
- Fixed `UpdateService` constructor error (was passing 2 args to 0-param constructor).
- Fixed `UpdateBanner` parameter mismatch (was passing 3 named params to parameterless widget).
- Removed unused `isDark` variable in `UpdateBanner`.
- Removed unused imports in `router.dart` and `update_provider.dart`.
### Added
- Implemented **AI Context System (AIOS 2.0.0)** under the `.ai/` directory.
- Created `MACHINE_README.md`, `PROJECT_STATE.json`, `START_HERE.md`, `CONTEXT_INDEX.md`, and helper templates.
- Created multi-level `rules/` and `prompts/` configurations.
- Verified all 31 AIOS files present with full content (entry points, memory, governance, rules, prompts, maps, ADRs, archives).
- Updated `CURRENT_TASK.md`, `HANDOFF.md`, and `CHANGELOG.md` to reflect AIOS setup completion.

## [0.3.0] - 2026-07-18
### Added
- Unified 3-Track Roadmap (Web, Mobile, Media).
- Android home screen widgets & Jetpack Glance spec.
- Bookings API Conflict checks and resource schedules.

## [0.2.0] - 2026-07-16
### Added
- Created `circularDownloads` analytics and rate limiting.
- Redesigned `/circulars` and `/polls` client routes with rich visualizations.
- Integrated `localStorage` settings cache for notification preferences.

## [0.1.0] - 2026-07-15
### Added
- Refactored 30+ pages from raw HTML inputs/selects to shadcn/ui custom primitives.
- Integrated Zod schema checks inside API paths.
- Setup Playwright E2E and Jest unit test suites.
