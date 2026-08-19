# Feature Registry

Canonical index of the features available in ThaibaHive.

---

## 1. Feature Lifecycle Status Definitions

| Status | Meaning |
|---|---|
| **Planned** | Concept defined, development not started. |
| **In Progress** | Active coding phase. |
| **Complete** | Code integrated, passes verification tests. |
| **Stable** | Production-deployed and verified. |
| **Deprecated** | Scheduled for removal. |
| **Blocked** | Development paused due to external dependencies. |
| **Experimental**| Active prototype, subject to change. |

---

## 2. Active Features Register

| Feature | Path | Status | Dependencies | Owner |
|---|---|---|---|---|
| **Authentication (jose)** | `/app/auth/` | **Stable** | SQLite / Postgres | Core |
| **WebView Nonce Handoff** | `/api/auth/mobile-handoff/` | **Complete** | Flutter Secure Storage | Mobile/Web |
| **Attendance Checking** | `/app/(shell)/attendance/` | **Complete** | Drizzle schemas | Core |
| **Task Kanban** | `/app/(shell)/tasks/` | **Complete** | dnd-kit, Drizzle | Core |
| **Leave Roster** | `/app/(shell)/leaves/` | **Complete** | Zod schemas | Core |
| **Staff Directory** | `/app/(shell)/staff/` | **Complete** | Drizzle schemas | Core |
| **Bookings & Calendar** | `/app/(shell)/bookings/` | **Complete** | Drizzle checks | Operations|
| **Android Widgets** | `thaibahive_mobile_app/...` | **Planned** | Jetpack Glance, Room | Mobile |
| **Media Library Pipeline** | `/app/(shell)/media-library` | **Complete** | FFmpeg, chunks upload | Media |
| **Multi-Format Export Engine** | `/api/export` & `/src/lib/export/` | **Complete** | ExcelJS, PDFKit | System |
| **Finance Module** | `/app/(shell)/finance/` | **Complete** | Workflow Engine, Export Engine | Finance |
| **Examination Management System** | `/app/(shell)/examinations/` | **Complete** | Grade Engine, Fee Clearance Lock, Export Engine | Academics |
| **Mobile Companion App Integration** | `thaibahive_mobile_app/` | **Complete** | Riverpod, Hive, FCM, Nonce Handoff | Mobile |
| **Services Module & Campus Operations** | `/app/(shell)/vehicles`, `/canteen`, `/visitors` | **Complete** | Fleet, Cashless Meal Passes, HMAC QR Visitor Passes | Operations |
| **Admin Module Performance Reviews & MVP Staging** | `/app/(shell)/admin/performance` | **Complete** | Competency Frameworks, 360 Feedback, HR Analytics, Staging Suites | HR / Admin |
| **Mobile Release Packaging Pipeline** | `.github/workflows/mobile-release.yml` | **Complete** | Flutter 3.24, Keystore, ExportOptions | Mobile/Ops |
| **Real-Time Push Notification Engine** | `/api/mobile/push/register` & `push-notification-service.ts` | **Complete** | FCM, APNs, SSE Event Bus | Infrastructure |
| **Dart Background Isolate Offline Sync** | `background_sync_isolate.dart` & `/api/mobile/sync/background-status` | **Complete** | Hive, WorkManager, BackgroundFetch | Mobile |
| **WCAG 2.1 AA Accessibility Standards** | `src/app/(shell)/` & `accessibility-wcag.test.ts` | **Complete** | Radix UI, ARIA Landmarks, jest-axe | Web / UI |
| **Regional Data Lakehouse ETL Engine** | `/api/admin/lakehouse/` & `src/lib/lakehouse/` | **Complete** | ParquetWriter, Apache Arrow, EtlEngine | Data/Infra |
| **SAML 2.0 & OIDC Identity Federation** | `/api/auth/saml/` & `/api/auth/oidc/` | **Complete** | SamlService, OidcService, FederatedUserMapper | Auth/Sec |
| **Automated DB Index Auto-Tuning Engine** | `/api/admin/database/index-tuning/` | **Complete** | IndexAnalyzer, IndexAutoTuner | Database |
| **Enterprise MDM Deployment Certification** | `/api/mobile/mdm/` & `mdm_config_service.dart` | **Complete** | MdmConfigGenerator, Intune, Apple MDM | Enterprise |
| **Multi-Region Data Mesh (CRDT)** | `src/lib/mesh/` & `/api/admin/mesh/` | **Complete** | CrdtResolver, VectorClockManager, SyncQueue | Infrastructure |
| **Predictive Learning Analytics** | `src/lib/analytics/` & `/api/analytics/` | **Complete** | FeatureExtractor, PredictionEngine, LearningPathRecommender | Academics |
| **Hybrid WebRTC/HLS Live Streaming** | `src/lib/streaming/` & `/api/streaming/` | **Complete** | WebRtcSignaler, MediaSessionManager, HlsSegmenter | Operations |
| **PostgreSQL Cluster Health & Failover** | `src/lib/database/` & `/api/admin/database/` | **Complete** | ClusterMonitor, FailoverManager, LiveMigrator | Database |
| **Global Edge Caching & Acceleration** | `src/lib/edge/` & `src/lib/cache/` | **Complete** | EdgeCache, InvalidationPipeline, MediaAccelerator | CDN/Ops |
| **Federated GraphQL API Gateway** | `src/lib/federation/` & `/api/graphql/federated` | **Complete** | GatewayOrchestrator, SchemaRegistryManager, QueryPlanner | Gateway |
| **Database Geo-Aware Routing & Pooling** | `src/lib/database/edge-router.ts` & `edge-pool.ts` | **Complete** | EdgeRouter, EdgeConnectionPool | Database |
| **Edge Performance Observability** | `src/lib/monitoring/` & `/api/admin/edge/metrics` | **Complete** | TelemetryLogger, CacheHitRateCompiler, UsageTracker | DevOps |
| **Intelligent Agent Orchestration Framework** | `src/lib/agents/core/` | **Complete** | AgentRegistry, AgentMessageBus, AgentScheduler, AgentStateStore, ConsensusCoordinator | Infrastructure |
| **Self-Healing Infrastructure Engine** | `src/lib/agents/healing/` | **Complete** | DatabaseHealer, EdgeHealer, PoolHealer, StreamHealer, ApprovalGateway | Database/Infra |
| **Predictive Model Auto-Tuning Pipeline** | `src/lib/ml/` | **Complete** | DriftDetector, RetrainingPipeline, ABTestFramework, ModelPromoter | ML/Data |
| **Conversational Voice Copilot Extensions** | `src/lib/voice/` | **Complete** | VoiceIntentMapper, DiagnosticsHandler, VoiceFeedbackLoop | Voice/UI |
| **Swarm Telemetry Observability & SSE** | `src/lib/observability/` & `/api/admin/swarm/` | **Complete** | EventBus, SSEManager, MetricsAggregator | DevOps / Observability |
| **Automated Remediation Engine & Verification** | `src/lib/remediation/` & `/api/admin/remediation/` | **Complete** | RemediationEngine, HealerConnector, RollbackHandler, ApprovalGateway | Infra / Security |
| **Visual Playback & Telemetry Compression** | `/src/components/swarm/` & `/api/admin/swarm/` | **Complete** | PlaybackController, PlaybackEventList, usePlaybackStore, CompressionStream | Observability / Performance |
| **Mobile Network Sync Diagnostics & Compression** | `thaibahive_mobile_app/lib/core/sync/` & `/api/mobile/v1/sync/push` | **Complete** | NetworkDiagnosticsCollector, GZipCodec, EventBus, AnomalyDetector, MobileSyncDashboard | Mobile / Observability |
| **Mobile Network-Aware Bandwidth Auto-Tuning** | `thaibahive_mobile_app/lib/core/sync/` & `/api/admin/sync-policies/` | **Complete** | Drizzle, Hive, Riverpod, CircuitBreaker | Mobile / Performance |
| **Role-Based Intent-Driven Workspaces** | `/app/(shell)/workspace/` & `workspace_provider.dart` | **Complete** | Drizzle, Hive, Riverpod, EventSource, base64 redirection | Core / Mobile |
| **Workspace Analytics & BI Engine** | `/app/(shell)/workspace/[role]/analytics` | **Complete** | Drizzle, SQLite/PG, PDFKit, ExcelJS, Riverpod, Hive | Core / Mobile |
| **Workspace Queue & Compliance Auditing** | `src/lib/services/report-queue.ts` & `/api/workspaces/preferences` | **Complete** | Drizzle, SQLite/PG, Optimistic Locking, PreferenceAuditService | Core |
| **Scheduled Job Management Console** | `/app/(shell)/admin/scheduled-jobs/` | **Complete** | Drizzle, Base UI, Zod | Core / Admin |
| **Queue Performance Telemetry** | `/components/swarm/` & `/api/admin/swarm/` | **Complete** | EventBus, SSEManager, Recharts | DevOps / Observability |
| **Preference Audit Log Dashboard** | `/app/(shell)/admin/audit-logs/` | **Complete** | PreferenceAuditService, Drizzle | Security / Compliance |
| **Multi-Browser Playwright E2E Automation** | `/e2e/` & `playwright.config.ts` | **Stable** | Firefox, WebKit, Chromium, Axe-Playwright | QA / Ops |
| **Client-Side DB Import Restriction Linting** | `eslint.config.mjs` | **Stable** | ESLint `no-restricted-imports` rules | Security / Architecture |
| **Database Secondary Query Index Tuning** | `packages/db/schema.ts` & `schema.pg.ts` | **Complete** | Drizzle schema indexes mapping | Database / Performance |
| **Next.js Dynamic Import Bundle Optimization** | `src/app/(shell)/` routes | **Complete** | next/dynamic imports, react suspense / skeletons | Core / Frontend |
| **k6 Concurrency Baseline Load Testing** | `load-tests/` | **Complete** | k6 runner, authenticated endpoint mapping | QA / Stress Testing |
| **DPoP Cryptographic Session Binding** | `src/lib/identity/dpop-*` | **Complete** | Web Crypto, jose, Next.js Middleware | Security / Auth |
| **Risk-Based Authentication Engine (RBA)** | `src/lib/identity/risk-*` | **Complete** | GeoIP, Device Fingerprinting, EventBus | Security / Auth |
| **WebAuthn Step-Up Authentication** | `/api/auth/webauthn/*` | **Complete** | Hardware Keys, OTP Fallback, React Dialog | Security / Auth |
| **Edge Revocation Mesh** | `src/lib/identity/revocation-*` | **Complete** | EventBus, Bloom Filters, In-Memory Sets | Core / Auth |
| **Identity Admin Radar Dashboard** | `/app/(shell)/admin/security/identity` | **Complete** | Recharts, Metrics, Polling | Security / Admin |
| **Distributed Adaptive Rate Limiting** | `src/lib/security/rate-limiter*` | **Complete** | Redis, Sliding Window, Token Bucket, Fallback | Security / Gateway |
| **Automated IP Reputation & Subnet Quarantine** | `src/lib/security/quarantine-*` | **Complete** | CIDR Subnets, Bloom Filters, EventBus Mesh | Security / Gateway |
| **Edge WAF Synchronization & Webhooks** | `src/lib/security/edge-firewall-*` | **Complete** | Cloudflare WAF, AWS WAF, HMAC Webhooks | Security / Edge |
| **Synthetic Canary Health Probes & Circuit Breaker** | `src/lib/security/circuit-breaker*` | **Complete** | Probes, Degraded Mode Shedding, k6 Harness | Reliability / Gateway |
| **Admin Threat Shield Radar Dashboard** | `/app/(shell)/admin/security/gateway` | **Complete** | Real-time Polling, Manual Bans, Breaker Override | Security / Admin |
| **Enterprise Threat Intelligence Federation (STIX/TAXII)** | `src/lib/security/threat-intel/` | **Complete** | STIX 2.1, TAXII 2.1, Federation API, Auto-Quarantine | Security / Threat Intel |
| **Redis PubSub Quarantine Mesh Transport** | `src/lib/security/quarantine-pubsub.ts` | **Complete** | Redis PubSub, Deduplication Window, Latency Tracking | Security / Mesh |
| **Dual-Store Database Quarantine Persistence** | `src/lib/security/quarantine-db-store.ts` | **Complete** | SQLite/PostgreSQL Dual-Write, Cold Cache Warming | Security / Database |
| **Strict RFC 8594 Legacy Token Sunset Engine** | `src/lib/identity/legacy-token-deprecation.ts` | **Complete** | Deprecation/Sunset Headers, 401 Soft/Strict Rejection | Security / Auth |
| **AWS SigV4 WAF Client & Retry Engine** | `src/lib/security/aws-sigv4-signer.ts` | **Complete** | SigV4 HMAC-SHA256, Jittered Exponential Backoff | Security / Cloud |
| **TypeScript AST Security Coverage Scanner** | `scripts/security/gateway-coverage-scanner.ts` | **Complete** | TypeScript Compiler API, CallExpression Visitor | Security / Tooling |
| **Autonomous Security Orchestration & Playbook Engine (SOAR)** | `src/lib/security/soar/` | **Complete** | ActionRegistry, Orchestrator, ConditionEvaluator, SAGA Compensation | Security / SOAR |
| **Threat Confidence Thresholding & Human-in-the-Loop Approvals** | `src/lib/security/soar/confidence-gate.ts` & `approval-queue.ts` | **Complete** | Multi-Tier Thresholding, TTL Expiration, Event Bus | Security / SOAR |
| **Canonical Security Playbook Library (10 Playbooks)** | `src/lib/security/soar/playbooks/definitions.ts` | **Complete** | Network, Identity, Edge, Webhook Containment | Security / SOAR |
| **Dual-Store SOAR Database Persistence & Merkle Audit** | `packages/db/schema.ts` & `src/lib/security/soar/soar-db-store.ts` | **Complete** | SQLite/PG Drizzle Tables, SHA-256 Merkle Chain | Security / Database |
| **Admin Security Orchestration Radar & Killswitch Console** | `/app/(shell)/admin/security/orchestration` | **Complete** | Live Execution Feed, Approval Queue, Killswitch Card | Security / Admin |
| **Internal PKI & Continuous mTLS Mesh Engine** | `src/lib/security/pki/` & `src/lib/security/mesh/` | **Complete** | RFC 5280 X.509, CaEngine, MtlsAuthenticator, 30d Grace Rotation | Security / Mesh |
| **Multi-Factor Device Trust Scoring & Behavioral Anomaly Engine** | `src/lib/security/trust/` | **Complete** | 0-100 Scoring, Impossible Travel, Auth Storms, TTL Overrides | Security / Trust |
| **Dynamic Micro-Segmentation & Campus VLAN Steering** | `src/lib/security/segmentation/` | **Complete** | Priority Default-Deny, VLAN 10/20/30/99, Switch Adapters | Security / Network |
| **Automated CycloneDX & SPDX SBOM Vulnerability Scanner** | `src/lib/security/sbom/` | **Complete** | CycloneDX 1.5, SPDX 2.3, CVE Matcher, License Compliance | Security / Supply Chain |
| **Autonomous Forensic Root-Cause Copilot (DAG Graph)** | `src/lib/security/forensics/` | **Complete** | Multi-Stage MITRE ATT&CK, Event Timeline, RootCauseGraph | Security / Forensics |
| **Admin Zero-Trust Security Mesh Radar (4 Tabs)** | `/app/(shell)/admin/security/zero-trust` | **Complete** | Device Posture, Micro-Segmentation, PKI Mesh, Forensics | Security / Admin |
| **Zero-Trust E2E Simulation CLI & Test Harness** | `scripts/security/zasm-simulation-runner.ts` | **Complete** | `pnpm zasm:simulate`, 6-Phase Pipeline Validation | Security / Tooling |



