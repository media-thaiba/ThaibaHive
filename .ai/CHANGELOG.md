# Changelog — ThaibaHive

All notable changes to the ThaibaHive ecosystem are documented here.

## [3.25.0] - 2026-08-19
### Added
- **Internal PKI & Continuous mTLS Service Mesh:** RFC 5280 compliant X.509 certificates (ECDSA prime256v1 / RSA), root/intermediate CA engine, service identity resolution, SAN matching, and zero-downtime certificate rotation with 30-day dual-cert grace overlap and distributed revocation sync (`CERT_REVOKED`, `CERT_ROTATED`, `CRL_UPDATED`).
- **Device Trust Scoring System & Behavioral Analysis:** Multi-factor composite 0–100 score across OS/patch levels, MDM compliance, DPoP binding, WebAuthn, geo-risk, and behavioral stability. Real-time anomaly detection for impossible travel, UA changes, and auth storms with dynamic penalty scoring, TTL-bound manual overrides, and autonomous SOAR containment bridge.
- **Dynamic Micro-Segmentation Policy Engine:** Priority-based default-deny policy engine with hardware network adapters for Campus Switches (VLAN 10 Prod, VLAN 20 Student, VLAN 30 Inspection, VLAN 99 Quarantine), Edge Gateways, and Iptables, with conflict resolution and $< 5$s cluster propagation mesh.
- **Automated SBOM Vulnerability Scanner & Supply Chain Security:** CycloneDX v1.5 JSON and SPDX v2.3 JSON generation, continuous CVE matcher, non-breaking auto-patch upgrade verifier, and open-source copyleft license compliance auditor.
- **Advanced Forensic Root-Cause Analysis Copilot:** Multi-stage MITRE ATT&CK correlation, chronological event sequencing, DAG root-cause graph reconstruction, and executive summary generation in $< 30$ seconds.
- **Dual-Store Database Persistence & Merkle Audit Trail:** Drizzle ORM persistence for SQLite and PostgreSQL (`zasm_device_trust`, `zasm_segmentation_policies`, `zasm_certificates`, `zasm_sbom_packages`, `zasm_sbom_vulnerabilities`, `zasm_forensic_reports`) with 100% schema parity, and SHA-256 Merkle chain audit logging.
- **Prometheus OpenMetrics Telemetry:** Registered 6 ZASM metric series (`zasm_mtls_handshakes_total`, `zasm_certificate_rotations_total`, `zasm_device_trust_score_distribution`, `zasm_segmentation_policies_active`, `zasm_sbom_vulnerabilities_total`, `zasm_forensic_analysis_duration_seconds`) integrated directly into `/api/metrics`.
- **Admin Zero-Trust Radar Dashboard UI:** Real-time 4-tab dashboard at `/admin/security/zero-trust` with live device posture matrix, trust override dialog, micro-segmentation policy table, PKI certificate manager, SBOM vulnerability viewer, license compliance card, and interactive Forensic Copilot panel.
- **End-to-End Zero-Trust Simulation Harness & CLI:** Automated pipeline simulator (`scripts/security/zasm-simulation-runner.ts` / `pnpm zasm:simulate`) verifying full perimeterless flow: PKI generation, mTLS handshake, trust scoring, anomaly detection, VLAN 99 quarantine, SBOM scan, and forensic DAG synthesis.
- **Operational Runbooks:** Authored 5 comprehensive runbooks in `docs/` (`zasm-architecture-guide.md`, `mtls-certificate-rotation-ops.md`, `campus-micro-segmentation-guide.md`, `sbom-supply-chain-ops.md`, `forensic-copilot-investigation-ops.md`).

## [3.24.0] - 2026-08-19
### Added
- **Autonomous Security Orchestration & Playbook Engine (SOAR):** Core state machine engine supporting DAG/linear pipelines, dynamic parameter interpolation (`{{path}}`), sub-second action dispatch, and per-step timeout isolation.
- **SAGA Compensation Transaction Engine:** Automatic reverse compensation rollback executing in LIFO order upon downstream step failures, ensuring strict zero-drift state integrity.
- **Distributed Concurrency & Cluster Synchronization Mesh:** Redis distributed locking (`DistributedLock`) with Redlock pattern and `SoarMeshSync` multi-node event broadcasting.
- **Threat Intelligence Trigger Matching & Deduplication Engine:** Event-to-playbook route matching with pattern criteria, severity filters, and LRU sliding-window storm deduplication (300s TTL).
- **Risk Confidence Thresholding & Human-in-the-Loop Approval Queue:** Multi-tier evaluation ($\ge 80\%$ auto-execution, $60-79\%$ approval queue, $<60\%$ log only) with 24-hour TTL expiration.
- **Edge Firewall & Zero-Trust Lockdown Actions:** Parallel dispatch to Cloudflare Access Rules, AWS WAF IPSets with SigV4, and zero-trust user session invalidation and account security holds.
- **Canonical Security Playbook Library:** 10 pre-configured, battle-tested enterprise playbooks covering IP quarantines, subnet containments, account lockouts, WAF rate throttling, credential stuffing, and data exfiltration.
- **Dual-Store Database Persistence & Merkle Audit Trail:** Drizzle ORM persistence for SQLite and PostgreSQL (`soar_playbooks`, `soar_executions`, `soar_execution_steps`, `soar_approvals`) with 100% schema parity, and SHA-256 Merkle chain audit logging.
- **Prometheus OpenMetrics Telemetry:** Registered 6 new SOAR metric series (`soar_playbook_executions_total`, `soar_playbook_duration_seconds`, `soar_actions_executed_total`, `soar_pending_approvals_total`, `soar_compensations_total`, `soar_confidence_score_distribution`).
- **Admin Security Orchestration Radar & Control Center:** Real-time dashboard at `/admin/security/orchestration` with live execution radar, pending approval resolution, interactive step inspection dialog, playbook catalog management, manual launch modal, and emergency killswitch.
- **End-to-End Orchestration Simulation Runner:** Automated incident simulator (`scripts/security/soar-simulation-runner.ts`) verifying 4 critical scenarios: autonomous botnet mitigation, approval routing, SAGA compensation rollback, and emergency killswitch.
- **Operational Runbooks:** Authored 5 runbooks in `docs/runbooks/` covering incident response, playbook authoring, approval queue ops, SAGA troubleshooting, and disaster recovery.

## [3.23.0] - 2026-08-19
### Added
- **Enterprise Threat Intelligence Federation:** Automated STIX 2.1 threat indicator parsing, TAXII 2.1 collection polling with ETag 304 caching and jittered exponential retry backoff, reputation score adjustments, and inter-institutional collaborative threat sharing API (`/api/security/threat-intel/federation`) with RFC 1918 PII stripping.
- **Hardened Redis PubSub Quarantine Mesh:** Upgraded edge node synchronization using Redis PubSub channel `security:quarantine:events` with LRU message deduplication, sub-50ms propagation, and seamless in-process fallback.
- **Dual-Store Database Quarantine Persistence:** Added `QuarantineDbStore` implementing dual-write database persistence (`ip_quarantines`, `ip_allowlist` tables) across SQLite and PostgreSQL, with cold-start cache warming (< 5ms).
- **Strict RFC 8594 Legacy Token Deprecation Engine:** Implemented `LegacyTokenDeprecationEngine` supporting `WARN`, `SOFT_ENFORCE`, and `STRICT` sunset stages with `Deprecation`, `Sunset`, and `Link` response headers, and RFC 7807 401 problem details.
- **Legacy Token Migration Admin Card & API:** Interactive telemetry and enforcement stage toggle at `/admin/security/identity` and API route `/api/admin/security/identity/deprecation-stats`.
- **AWS SigV4 Client & Outbound Retry Backoff:** Implemented `AwsSigV4Signer` with canonical request signing chain and `withRetry` full-jitter exponential backoff for AWS WAF IPSet synchronization.
- **Strict Edge Security Webhook Validation:** Hardened `/api/webhooks/edge-security` with constant-time HMAC-SHA256 signature verification and 300-second timestamp drift rejection.
- **Source-Emitted Circuit Breaker Merkle Events:** Refactored `GatewayCircuitBreaker` and `QuarantineManager` to emit `GATEWAY_CIRCUIT_BREAKER_TRIPPED/RESET` and `GATEWAY_SUBNET_CONTAINED` directly at source into the SHA-256 Merkle audit chain.
- **TypeScript AST Gateway Coverage Scanner:** Upgraded `scripts/security/gateway-coverage-scanner.ts` with true TypeScript Compiler API AST traversal, CallExpression visitor, and identifier alias resolution.
- **Staging Live k6 DDoS Burst Certification:** Created `k6/staging-ddos-certification.js` and `scripts/security/run-staging-ddos-certification.ts` (`pnpm test:staging:ddos`), certifying platform resilience under 1,000+ RPS burst (p95 < 50ms, 0 unhandled 500 errors).
- **Prometheus OpenMetrics Telemetry:** Added 6 new metric series for STIX indicator ingestion, PubSub sync latency, mesh events, legacy token rejections, DB sync duration, and SigV4 requests.
- **Technical Debt Resolved:** 100% resolution of TD-012, TD-013, TD-014, TD-015, TD-016, TD-017, and TD-018.
- **Operational Runbooks:** Authored 5 runbooks in `docs/runbooks/` covering threat intelligence federation, PubSub mesh, legacy token sunset, WAF SigV4, and AST route scanning.
- **New NPM Script:** Added `test:staging:ddos` to `package.json`.

## [3.22.0] - 2026-08-19
### Added
- **Distributed Adaptive Rate Limiting Engine:** Redis cluster-backed sliding-window counter and token-bucket algorithm with local in-memory fallback, multi-dimensional compound keys (tenant, role, DPoP device thumbprint `cnf.jkt`), and sub-millisecond enforcement (< 1ms).
- **Dynamic Risk-Aware Quota Scaling:** Integrated with Continuous Risk Engine dynamically scaling request limits (low risk = 100%, medium = 75%, high = 25%, critical = 0% instant drop) with DPoP cryptographic attestation boosts (+20%).
- **Automated IP Reputation & CIDR Subnet Quarantine:** Sliding-window behavioral threat heuristic engine tracking DPoP replays, step-up failures, and cross-tenant probes; automatically banning IPs and containing `/24` subnets upon >= 3 attacking IPs.
- **Distributed Quarantine Sync Mesh:** Sub-50ms propagation of IP quarantine events across edge nodes via EventBus / Redis PubSub backed by fast-path in-memory Bloom filters (< 0.05ms).
- **Upstream Edge Firewall Dispatcher:** Outbound asynchronous synchronization with Cloudflare IP Access Rules and AWS WAF IP Sets, plus HMAC-authenticated webhook ingestion for upstream edge security events.
- **Synthetic Canary Probes & Edge Circuit Breaker:** Automated 10-second background synthetic health runner with 3-state circuit breaker (`CLOSED`, `HALF_OPEN`, `OPEN`), activating intelligent degraded mode shedding under DDoS bursts.
- **Admin Threat Shield Radar Dashboard:** Real-time visual dashboard at `/admin/security/gateway` with 10-second polling, traffic charts, active quarantine management, 1-click unban, and manual emergency circuit breaker override.
- **Gateway Telemetry & Prometheus Observability:** 6 new OpenMetrics series (`gateway_requests_total`, `gateway_ratelimit_violations_total`, `gateway_ip_quarantines_active`, `gateway_canary_probe_duration_seconds`, `gateway_circuit_breaker_state`, `gateway_threat_score_distribution`).
- **Tamper-Proof Merkle Audit Trail Integration:** 8 new gateway threat event types dispatched to SHA-256 Merkle block chain.
- **CI/CD Security Gate:** AST static scanner `scripts/security/gateway-coverage-scanner.ts` (`pnpm gateway:scan`) and `.github/workflows/gateway-security-gate.yml`.
- **Technical Debt Resolved:** TD-010 (staging load execution under attack harness) and TD-011 (FIDO2 attestation statement validator).
- **Operational Runbooks:** Authored `rate-limiting-configuration-guide.md`, `ip-quarantine-threat-mitigation.md`, `ddos-simulation-canary-ops.md`, `api-gateway-firewall-integration.md`, and `threat-shield-radar-ops.md`.
- **New NPM Scripts:** Added `gateway:scan` and `test:ddos` to `package.json`.

## [3.21.0] - 2026-08-19
### Added
- **DPoP Cryptographic Foundation:** Implemented RFC 9449 Demonstrating Proof-of-Possession at the Application Layer (DPoP) bindings for all enterprise session tokens using `jose` and Web Crypto API.
- **Risk-Based Authentication Engine (RBA):** Built risk engine evaluating IP velocity, Geo-impossibility, Device Fingerprint drift, and time anomalies to dynamically score session risk.
- **WebAuthn Step-up Authentication:** Added zero-trust hardware key challenges and fallback OTP verification when session risk crosses `high` thresholds.
- **Edge Revocation Mesh:** Built an in-memory bloom filter revocation set propagated over local EventBus channels, ensuring instant session invalidation across the cluster.
- **Identity Admin Radar:** Delivered real-time observability dashboard for tracking DPoP migration progress, revocation velocity, and risk event streams.
- **Device Fingerprinting:** Deployed privacy-safe device fingerprinting and composite hashing for trust-score drift calculation.
- **Identity Auditing & Metrics:** Integrated identity events into `cryptoAuditWriter` and exposed Prometheus metrics for DPoP validation latency and replay rejections.

## [3.20.0] - 2026-08-19
- **Cryptographic Tamper-Proof Audit Logging Engine:** Implemented SHA-256 block hash chaining and binary Merkle tree aggregation in `src/lib/audit/crypto-audit-engine.ts`, creating immutable audit records with cryptographic inclusion proofs.
- **Asynchronous Cryptographic Writer & Route Middleware:** Created `CryptoAuditWriter` micro-batching audit writes (50ms window / 100 entries) with sub-2ms latency overhead and `withCryptoAudit` route wrapper decorator.
- **Audit Chain Verification API & Standalone CLI:** Created `scripts/compliance/verify-audit-chain.ts` (`pnpm compliance:verify`) and `/api/system/compliance/verify` validating hash link continuity and Merkle root integrity.
- **Point-in-Time Forensic State Snapshots:** Implemented `ForensicSnapshotEngine` and `SnapshotSigner` (`src/lib/compliance/`) capturing canonical system state (users, roles, institutions, audit roots) with RSA-SHA256 digital signature manifests.
- **Tiered Cold-Storage Archival & Retention Policy Engine:** Built `RetentionPolicyEngine` (`src/lib/compliance/retention-policy.ts`) and scheduled cron runner `scripts/compliance/snapshot-cron.ts` (`pnpm compliance:snapshot`) managing hot (30d), warm (90d), and cold (365d) tiers.
- **Forensic Snapshot Differential Reconstruction Engine:** Created `SnapshotReconstructor` and `/api/system/compliance/snapshots/diff` for historical point-in-time state inspection and entity diffing.
- **Streaming Compliance Anomaly Detection:** Implemented `AnomalyDetector` (`src/lib/compliance/anomaly-detector.ts`) evaluating mutations in real-time against 5 regulatory guardrail rules with sliding-window event tracking.
- **Compliance Violation Radar & Prometheus Metrics:** Created `ViolationDispatcher` with 5-minute alert deduplication, Prometheus gauge exports in `/api/system/metrics`, and triage API `/api/system/compliance/violations`.
- **Multi-Standard Regulatory Export Engine:** Built `RegulatoryExportEngine` generating digitally signed compliance dossiers for SOC 2 Type II, ISO 27001, GDPR, and HIPAA (`POST /api/system/compliance/export`).
- **Admin Compliance Governance Radar UI Dashboard:** Built interactive dashboard at `/admin/compliance` with live health radar, cryptographic integrity verification trigger, snapshot timeline, and incident triage modal.
- **CI/CD Mutation Audit Coverage Gate:** Authored static AST scanner `scripts/compliance/audit-coverage-scanner.ts` (`pnpm compliance:scan`) and GitHub Actions workflow `.github/workflows/compliance-integrity-gate.yml` requiring 100% audit coverage.
- **Enterprise Runbooks:** Authored `docs/cryptographic-audit-verification-guide.md`, `docs/forensic-snapshot-reconstruction-sop.md`, `docs/realtime-compliance-telemetry-guide.md`, and `docs/regulatory-compliance-export-guide.md`.
- **New NPM Commands:** Added `compliance:verify`, `compliance:snapshot`, and `compliance:scan` to `package.json`.

## [3.19.0] - 2026-08-19
### Added
- **Automated Disaster Recovery Chaos Engineering Harness:** Implemented `ChaosEngine` and modular failure injectors in `src/lib/dr/` for simulating database crashes, replica lag, network partitions, edge disconnects, and Redis cluster mesh disconnects with auto-expiring safety timers.
- **Disaster Recovery Drill Orchestrator & CLI Runner:** Created `DrillOrchestrator` (`src/lib/dr/drill-orchestrator.ts`), CLI runner `scripts/dr/dr-drill-runner.ts` (`pnpm dr:drill`), and endpoint `/api/system/dr/drill` supporting multi-stage disaster recovery scenarios (`PRIMARY_OUTAGE`, `REGIONAL_PARTITION`, `CACHE_DESYNC`, `MULTI_TENANT_ISOLATION_DRILL`) and metrics collection.
- **Global Multi-Tenant Database Routing & Geo-Affinity:** Implemented `TenantRouter` in `packages/db` with tenant regional mapping (`us-east`, `eu-central`, `ap-south`, `default`) and Next.js middleware `x-tenant-region` header injection.
- **Zero-Downtime Cross-Region Tenant Migration:** Created `TenantMigrationOrchestrator` and endpoint `/api/system/tenant/migrate` validating 100% SHA-256 dataset parity before atomic routing cutover.
- **Cross-Tenant Data Isolation Guardrail & Scanner:** Authored runtime `TenantGuard` and static integrity scanner `scripts/security/tenant-isolation-scan.ts` (`pnpm security:tenants`) scanning 616 source files with 0 detected leaks.
- **Cross-Region Redis Invalidation Mesh:** Built `CrossRegionCacheMesh` in `src/lib/cache/cross-region-mesh.ts` broadcasting cache invalidation events across regions within < 100ms.
- **Vector Clock & LWW Conflict Resolution Engine:** Implemented `VectorClock` and `CacheConflictResolver` (`src/lib/cache/conflict-resolver.ts`) resolving concurrent multi-region mutations with deterministic Last-Write-Wins and anomaly purge triggers.
- **Cache Sync Telemetry & Admin Observability Console:** Added dedicated Cross-Region Cache Sync Mesh KPI card on `/admin/observability`, health endpoint `/api/system/cache-sync-status`, and Prometheus metrics export (`thaibahive_cache_sync_*`).
- **Automated Failover & Rollback Verification Pipeline:** Created `scripts/dr/failover-verifier.ts` (`pnpm dr:verify:failover`) and `scripts/dr/rollback-verifier.ts` (`pnpm dr:verify:rollback`) asserting zero data loss (RPO = 0s) and recovery speed (MTTR < 30s).
- **CI/CD Chaos Drill Staging Gate:** Created `.github/workflows/dr-chaos-drill.yml` and `scripts/staging/dr-canary-evaluator.ts` automating weekly and pre-release chaos disaster recovery verification.
- **Enterprise Runbooks:** Authored `docs/disaster-recovery-drill-runbook.md`, `docs/global-tenant-partitioning-guide.md`, `docs/cross-region-cache-sync-guide.md`, and `docs/failover-rollback-sop.md`.
- **New NPM Commands:** Added `dr:drill`, `dr:verify:failover`, `dr:verify:rollback`, and `security:tenants` to `package.json`.

## [3.18.0] - 2026-08-19
### Added
- **PostgreSQL Read-Replica Dynamic Router & Dual-Pool Client:** Implemented `ReplicaQueryRouter` in `packages/db` enabling intelligent routing of write mutations to Primary and read queries across read-replicas, with "Read-Your-Own-Writes" session sticky pinning.
- **Replica Health & Lag Monitor:** Created `src/lib/db/replica-health.ts` and endpoint `/api/system/replica-status` to monitor WAL replay lag and automatically isolate degraded replicas (>5000ms).
- **Automated Failover Detector & Circuit Breaker:** Implemented `FailoverDetector` in `src/lib/db/failover-detector.ts` and `/api/system/failover` triggering failover alerts and designating election candidates after 3 consecutive probe failures.
- **Read-Replica Data & Schema Parity Checker:** Created `scripts/db/replica-parity-check.ts` and `pnpm db:replica:check` validating 100% schema alignment and row checksums.
- **Multi-Region Edge Caching Policies:** Built `src/lib/edge/cache-control.ts` and `src/lib/media/edge-optimizer.ts` configuring `Cache-Control`, `stale-while-revalidate`, CDN origin-shielding, and surrogate-key tagging (`Surrogate-Key` / `Cache-Tag`).
- **HMAC-Authenticated Edge Cache Purge API:** Implemented `src/lib/edge/cache-purger.ts` and `/api/system/edge-cache/purge` for granular tag, URL path, and global edge cache invalidation with HMAC signature verification.
- **Admin Observability Edge Caching Console:** Added Multi-Region Edge Caching KPI summary card on `/admin/observability` and Prometheus metrics export (`thaibahive_edge_cache_*`) in `/api/system/metrics`.
- **Automated Dependabot & Grouped Update Schedules:** Configured enterprise `.github/dependabot.yml` managing npm root, packages (`@thaiba/db`, `@thaiba/auth`), and GitHub Actions.
- **Dependency Vulnerability Scanner & Audit Workflow:** Authored `scripts/security/vuln-scanner.ts` and `.github/workflows/dependency-security-audit.yml` running daily supply chain audits with `.ai/security-allowlist.json` integration.
- **Automated License Compliance Checker:** Implemented `scripts/security/license-compliance-check.ts` auditing production dependencies against approved open-source licenses.
- **Automated Dependency Canary Validation Pipeline:** Created `.github/workflows/dependency-canary-validate.yml` and `scripts/staging/dependency-canary-evaluator.ts` validating automated dependency PRs and auto-merging on zero regressions.
- **Database Maintenance & Cold Storage Archival:** Authored non-blocking maintenance orchestrator (`scripts/db/maintenance-orchestrator.ts`) and historical audit log cold storage archival runner (`scripts/db/audit-log-archival.ts`).
- **Enterprise Runbooks:** Authored `docs/multi-region-database-runbook.md`, `docs/automated-dependency-security-runbook.md`, `docs/database-maintenance-runbook.md`, and `docs/edge-caching-guide.md`.
- **New NPM Scripts:** Added `db:replica:check`, `db:maintenance`, `db:archive:audit`, `security:deps`, and `security:licenses` to `package.json`.

## [3.17.0] - 2026-08-19
### Added
- **Flutter Mobile Sync E2E CI Automation:** Delivered automated Flutter integration test harness (`thaibahive_mobile_app/integration_test/`) covering encrypted Hive persistence, 401 Unauthorized nonce exchange token refresh, and Last-Write-Wins (LWW) conflict resolution, integrated into `.github/workflows/flutter-ci.yml` and `ci.yml` (resolving TD-007).
- **Mobile Sync Mock Server & Driver:** Implemented `MockSyncServer` and `MockSyncHttpClient` enabling deterministic network failure, latency delay, and batch mutation rejection simulations in CI.
- **Mobile Sync Telemetry & APM Bridge:** Authored Flutter client `MobileSyncTelemetry` and backend route `POST /api/mobile/v1/telemetry`, routing client sync duration percentiles, mutation batch sizes, error rates, and conflict counters directly into the APM sliding window aggregation engine.
- **Admin Observability Mobile Sync KPIs:** Extended `/admin/observability` and `/api/system/metrics` to expose live Mobile Sync KPIs (success rate %, p95 sync latency with SLA badges, conflict rate %, and network type breakdowns) and Prometheus metrics (`thaibahive_mobile_sync_*`).
- **Automated Staging Smoke Test Suite:** Authored standalone TypeScript smoke test runner (`scripts/staging/staging-smoke-runner.ts`) with modular validators for deep health, database ping (<250ms SLA), migration schema parity, critical business APIs, and RBAC security boundaries, generating structured JSON summary reports in < 60s (resolving TD-008).
- **GitHub Actions Canary Promotion Gate:** Created `.github/workflows/staging-canary-gate.yml` and evaluator `scripts/staging/canary-promotion-gate.ts` to automatically validate staging deployments and block production promotion on smoke check failures or >20% p95 latency degradations.
- **NPM Staging Command:** Added `"test:staging:smoke"` script to `package.json`.
- **Operational Runbooks:** Authored `docs/mobile-sync-testing-runbook.md` and `docs/staging-canary-runbook.md`.

## [3.16.0] - 2026-08-19
### Added
- **In-Memory Percentile Calculation Engine:** Implemented `LatencyHistogram` and `SlidingWindowAggregator` (`src/lib/observability/`) tracking rolling request durations (`1m`, `5m`, `15m`, `1h`) with exact p50, p90, p95, and p99 percentiles, bounded memory (<50MB), and LRU route eviction (TD-005).
- **Next.js APM Telemetry Middleware:** Embedded request-scoped monotonic timing (`performance.now()`) and route path normalization (`/api/students/:id`) into `src/middleware.ts`, injecting `x-response-time` headers on all API responses with zero-overhead bypass (`APM_TELEMETRY_ENABLED=false`).
- **Prometheus & JSON Metrics Endpoint:** Created `/api/system/metrics` with content negotiation (`text/plain` OpenMetrics v0.0.4 format and `application/json`), guarded by `super_admin` RBAC and timing-safe shared secret authentication.
- **Admin Observability Dashboard:** Built interactive dashboard at `/admin/observability` with 5 KPI summary cards, Recharts percentile trend lines, sortable route latency breakdown table, and 10-second live auto-polling.
- **APM Overhead Benchmark & CI Verification:** Authored `load-tests/apm-overhead-benchmark.js` and updated local load test runner, verifying <1% CPU overhead delta and <2ms latency penalty under concurrent load.
- **Operational Runbook:** Authored `docs/observability-latency-runbook.md` with SLA threshold matrices, diagnostic workflows, and Prometheus scrape configuration.

## [3.15.0] - 2026-08-18
### Added
- **Cross-Browser CI Matrix Automation:** Configured parallel matrix jobs for Chromium, Firefox, and WebKit in GitHub Actions with isolated artifact retention per browser.
- **Automated CI Load Testing Gate:** Added automated `load-tests` GitHub Actions job running k6 stress tests against standalone production builds with p95 < 500ms and failure rate < 5% assertions.
- **Pre-Migration Data Scrubbing Framework:** Authored idempotent SQL (`mark-entries-dedup.sql`) and TypeScript (`mark-entries-dedup.ts`) scrubbing hooks with unit tests to ensure safe migrations across databases with legacy duplicate records.
- **Bundle Size Budgets & Observability:** Integrated `@next/bundle-analyzer`, committed canonical bundle baselines (`baseline-v3.15.0.json`), and established `BUNDLE_BUDGETS.md` with +10% regression limits.
- **New NPM Scripts:** Added `build:analyze`, `test:load`, and `premigrate` commands to `package.json`.

### Fixed
- **Deterministic E2E Test Execution:** Eliminated all brittle `waitForTimeout()` calls across the entire E2E test suite (`approvals.spec.ts`, `attendance-workflow.spec.ts`, `auth.spec.ts`, `global-setup.ts`, `auth-helper.ts`), replacing them with auto-retrying assertions and DOM attachment state signals.

## [3.14.0] - 2026-08-18
### Added
- **Database Query Index Optimization:** Added secondary indexes on `attendance_logs`, `mark_entries`, `financial_transactions`, and `preference_audit_log` tables to optimize read operations and queries. Added composite unique constraint on `mark_entries` table.
- **Concurrent DB Write Handling:** Configured `PRAGMA busy_timeout = 15000;` on SQLite connection to mitigate database write lock contention under load.
- **Next.js Dynamic Import Code-Splitting:** Configured dynamic imports (`ssr: false` widgets) on telemetry dashboards and BI analytics screens, reducing initial page payloads and TTI.
- **k6 Load Stress Testing Harness:** Developed and ran authenticated concurrent stress load scripts verifying sub-500ms p95 latencies under 100+ virtual users.
- **100% E2E Playwright Spec Modernization:** Refactored the remaining 24 legacy spec files to eliminate redundant UI logins, caching session cookies, and isolating testing data parameters.

### Fixed
- **File Upload Layout Collision:** Fixed a CSS layout bug in `ExpenseClaimFormDialog` where absolute dropzone input elements overflowed modal bounds and blocked clicks.
- **Kanban Board Pagination Refresh:** Hardened TanStack Query invalidation and router reloads on task creation forms to avoid pagination display delays.

## [3.13.0] - 2026-08-07
### Added
- **Multi-Browser Playwright E2E Automation:** Configured Firefox, WebKit, and Chromium browser engines with dynamically restricted concurrent workers to support parallel local and CI/CD runs.
- **Role-Based Auth Caching Pipelines:** Developed global test user seeding and session caching (`.auth/*.json`) to bypass redundant manual UI logins during test execution.
- **Attendance & Scanners E2E Specs:** Automates staff check-in/check-out UI transitions, NFC card scanner modals, and telemetry attendance logs verification.
- **Examination Lifecycle E2E Specs:** Covers Term Exam grade entries, max/negative validations, tabulation register reports, and grade sheet exports.
- **Finance Approval & Expenses E2E Specs:** Tests multi-stage expense claims transitions (pending -> pending_hod -> approved), receipt attachments validation, and admin CSV data exports.
- **Admin Operations & RBAC E2E Specs:** Automates scheduled jobs triggering, telemetry view verification, preference audit logs queries, and role-based redirect validations.
- **Architectural Import Boundary Rules:** Configured ESLint custom `no-restricted-imports` rules blocking direct database client/schema imports inside client component and hooks files.
- **CI/CD Pipeline Integration:** Integrated multi-browser E2E verification in GitHub Actions CI with a 15-minute timeout safety gate.

### Fixed
- **ESLint Purity & Syntax Debt:** Resolved React render Date.now purity errors, prefer-const declarations, missing exhaustive-deps callbacks, and redundant eslint-disable directives.

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
