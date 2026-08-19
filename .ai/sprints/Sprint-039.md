# Engineering Contract — Sprint-039

**Sprint ID:** SPRINT-039  
**Sprint Name:** Enterprise Threat Intelligence Federation, Hardened Edge Mesh & Strict Legacy Deprecation  
**Target Release Version:** v3.23.0  
**Contract Date:** 2026-08-19  
**Contract Status:** APPROVED — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-039-Recommendation.md`  

---

## 1. Executive Summary

This engineering contract formalizes the implementation scope, task breakdown, acceptance criteria, risk register, rollback procedures, and definition of done for **Sprint-039**. It governs all execution work by the Implementation Engineer until formal handoff to the Verification Engineer.

Sprint-039 transitions the ThaibaHive platform from localized gateway enforcement to an **Enterprise Threat Intelligence Federation**, **Hardened Edge Quarantine Mesh**, and **Strict Zero-Trust Legacy Token Deprecation** architecture. 

Building directly upon the foundations established in Sprint-038 (Distributed Rate Limiting & Gateway Security Shield), Sprint-037 (Zero-Trust Identity Mesh & DPoP), and Sprint-036 (Cryptographic Merkle Audit Engine), this sprint systematically resolves all **6 residual technical debt items (TD-012 through TD-018)** identified during independent release verification.

### Core Architectural Pillars for Sprint-039:
1. **Hardened Multi-Node Quarantine Mesh (TD-013, TD-014):** Transition the distributed quarantine synchronization engine from an in-process EventBus to a high-throughput Redis PubSub broadcast channel (`security:quarantine:events`) with sub-50ms cross-node sync guarantees, backed by runtime SQLite/PostgreSQL persistence (`ip_quarantines`, `ip_allowlist`) that survives process restarts and node failures.
2. **Production-Grade Upstream WAF Integration & Fail-Closed Webhooks (TD-015):** Implement AWS Signature Version 4 (SigV4) cryptographic request signing for regional AWS WAF IPSet updates with exponential jittered retry backoff (max 5 retries), and enforce strict fail-closed webhook validation (`HTTP 401 Unauthorized`) in production when `EDGE_WEBHOOK_SECRET` is unconfigured or invalid.
3. **Strict Legacy Token Deprecation & Sunset Schedule (TD-012):** Implement an RFC 8594-compliant sunset engine rejecting non-DPoP legacy JWT tokens with structured `401 / 403` problem responses (`LEGACY_TOKEN_DEPRECATED`), client migration telemetry tracking, and administrative sunset controls.
4. **Enterprise Threat Intelligence Federation (STIX 2.1 / TAXII 2.1):** Build a standardized threat intelligence ingestion engine parsing STIX 2.1 JSON indicators, polling external TAXII 2.1 collections, updating automated reputation confidence scores, and offering federated indicator sharing across sister educational institutions.
5. **Source-Emitted Cryptographic Audit Events (TD-017):** Ensure `GATEWAY_CIRCUIT_BREAKER_TRIPPED`, `GATEWAY_CIRCUIT_BREAKER_RESET`, and `GATEWAY_SUBNET_CONTAINED` events are emitted deterministically at their source components into the SHA-256 Merkle audit chain.
6. **True TypeScript AST Route Scanner Engine (TD-018):** Upgrade `scripts/security/gateway-coverage-scanner.ts` with deep TypeScript AST node traversal (using TypeScript Compiler API / `ts-morph`) for robust static verification of `withRateLimit` and `requireAuth` decorators.
7. **Live Staging DDoS Performance Certification (TD-016):** Execute live automated k6 test runs against the dedicated staging cluster under sustained 1,000+ RPS DDoS bursts with documented p95 latency < 50ms and deterministic degraded mode verification.

---

## 2. Scope

### In Scope

| # | Domain | Detailed Description |
|---|--------|----------------------|
| 1 | **Redis PubSub Quarantine Mesh (TD-014)** | Production Redis PubSub channel `security:quarantine:events` distributing IP quarantine additions, removals, and subnet containments across all cluster nodes with < 50ms synchronization and local in-memory Bloom filter updates. |
| 2 | **Database Runtime Persistence (TD-013)** | Dual-write runtime persistence of active quarantines and allowlists into SQLite/PostgreSQL `ip_quarantines` and `ip_allowlist` tables, with cold-start cache warming upon node reboot. |
| 3 | **AWS WAF SigV4 Signing (TD-015)** | Full implementation of AWS Signature Version 4 signing for regional AWS WAFv2 API requests, credential rotation support, and regional endpoint resolution. |
| 4 | **Exponential Jittered Retry Backoff (TD-015)** | Resilient retry mechanism with decorrelated jitter for outbound Cloudflare and AWS WAF edge firewall dispatch calls (up to 5 retries). |
| 5 | **Strict Webhook Secret Enforcement (TD-015)** | Fail-closed enforcement on `/api/webhooks/edge-security` returning `401 Unauthorized` when webhook secret is missing, empty, or fails HMAC SHA-256 validation in production. |
| 6 | **Strict Legacy Token Deprecation Engine (TD-012)** | Enforcement layer rejecting non-DPoP legacy JWT tokens with RFC 8594 `Deprecation` and `Sunset` HTTP headers, accompanied by detailed RFC 7807 problem details. |
| 7 | **Legacy Token Migration Telemetry & Radar (TD-012)** | Telemetry collectors and dashboard cards tracking legacy vs DPoP token adoption percentages per tenant, client app version, and role. |
| 8 | **STIX 2.1 Threat Indicator Parser** | Standards-compliant parser for STIX 2.1 JSON bundles extracting IPv4, IPv6, CIDR blocks, and domain threat indicators with confidence levels and validity periods. |
| 9 | **TAXII 2.1 Feed Polling Client** | Automated background polling client ingesting threat feeds from TAXII 2.1 servers with HTTP Basic/Bearer auth, ETag caching, and rate limiting. |
| 10 | **Federated Institutional Threat Sharing API** | Authenticated inter-institutional threat sharing endpoints (`/api/security/threat-intel/federation`) allowing peer institutions to exchange verified malicious IP indicators. |
| 11 | **Source-Emitted Circuit Breaker Audit Events (TD-017)** | Direct source emission of `GATEWAY_CIRCUIT_BREAKER_TRIPPED` and `GATEWAY_CIRCUIT_BREAKER_RESET` from `circuit-breaker.ts` into `cryptoAuditWriter`. |
| 12 | **Source-Emitted Subnet Containment Events (TD-017)** | Direct source emission of `GATEWAY_SUBNET_CONTAINED` from `quarantine-manager.ts` upon `/24` CIDR auto-containment trigger into `cryptoAuditWriter`. |
| 13 | **TypeScript AST Platform Route Scanner (TD-018)** | Full AST static scanner using the TypeScript Compiler API inspecting route declarations for mandatory security decorators (`withRateLimit`, `requireAuth`). |
| 14 | **Live Staging DDoS Simulation Certification (TD-016)** | Live staging execution of 1,000+ RPS k6 DDoS burst scenarios with automated JSON/HTML report generation and circuit breaker trigger verification. |
| 15 | **Admin Threat Intelligence & Mesh UI** | Radar dashboard extensions at `/admin/security/gateway` and new view at `/admin/security/threat-intel` for managing STIX/TAXII feeds, PubSub mesh node health, and token deprecation. |
| 16 | **Prometheus OpenMetrics Telemetry** | 6 new OpenMetrics series: `threat_intel_indicators_imported_total`, `mesh_pubsub_sync_latency_seconds`, `mesh_pubsub_events_total`, `legacy_token_rejections_total`, `db_quarantine_sync_duration_seconds`, `waf_sigv4_requests_total`. |
| 17 | **Operational Runbooks** | 5 comprehensive production guides in `docs/` covering PubSub mesh operations, AWS SigV4 WAF setup, STIX/TAXII feed configuration, legacy token sunset roadmap, and staging DDoS drill procedures. |
| 18 | **AIOS Documentation Sync** | Complete updates to `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` reflecting v3.23.0 deliverables and technical debt clearance. |

### Out of Scope

| Area | Justification |
|------|---------------|
| Full STIX 2.1 Attack Pattern / Malware Object Graphing | Full graph visualization of complex malware campaign relationships is out of scope; focus is strictly on actionable network indicators (IP/CIDR/domain). |
| Direct BGP Anycast Prefix Hijack Protection | Layer 3/4 infrastructure routing is managed by hosting providers (AWS/Cloudflare); ThaibaHive operates at L7 HTTP/Application Gateway. |
| Automatic Removal of Deprecated Legacy Database Columns | Retain existing database column backwards compatibility until major release v4.0.0. |
| External Paid Commercial Threat Intelligence Subscriptions | Integration is designed for open standards (STIX/TAXII) and open feeds (e.g., AbuseIPDB, AlienVault OTX, CISA feeds); vendor procurement is out of scope. |
| Client-Side Flutter App Re-architecting | Flutter app already supports DPoP RFC 9449 from Sprint-037; client simply consumes standard `Sunset` and `401` deprecation responses. |

---

## 3. Implementation Task Breakdown

> Tasks are structured across 6 logical implementation phases in strict dependency order. Foundational PubSub, database persistence, and cryptographic signing engines MUST be built and verified prior to downstream APIs, UI components, and live staging certification.

---

### Phase 1 — Hardened Edge Quarantine Mesh & Database Persistence (TD-013, TD-014)

#### TIF-001 — Redis PubSub Distributed Quarantine Synchronization Mesh Engine (TD-014)

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-001 |
| **Phase** | Phase 1 — Hardened Edge Quarantine Mesh & Database Persistence |
| **Description** | Replace the localized in-process EventBus quarantine synchronization with a resilient distributed Redis PubSub message channel `security:quarantine:events`. Support multi-node broadcast of IP quarantine additions, removals, and CIDR subnet containments. Guarantee sub-50ms synchronization across all cluster instances. Include automatic heartbeat, node registration, reconnection backoff, full state resynchronization on partition recovery, and graceful local fallback when Redis is unreachable. |
| **Files** | `src/lib/security/quarantine-pubsub.ts` [NEW] · `src/lib/security/quarantine-mesh.ts` [MODIFY] · `src/lib/security/rate-limit-types.ts` [MODIFY] · `src/lib/__tests__/security/quarantine-pubsub.test.ts` [NEW] · `src/lib/__tests__/security/quarantine-mesh.test.ts` [MODIFY] |
| **Dependencies** | None (Foundational Architecture Primitive) |
| **Acceptance Criteria** | 1. PubSub channel `security:quarantine:events` broadcasts typed payloads (`ADD`, `REMOVE`, `CONTAIN_SUBNET`, `SYNC_REQUEST`, `SYNC_RESPONSE`).<br>2. When a node publishes an IP ban, all subscriber nodes receive and update their in-memory Bloom filter within < 50ms.<br>3. Disconnection handler activates local fallback mode immediately with zero uncaught exceptions.<br>4. Reconnection handler requests full active state sync from peer nodes or database upon connection restoration.<br>5. 100% unit and integration test coverage for multi-node broadcast, partition recovery, and Bloom filter synchronization. |
| **Verification Method** | Run `pnpm test --testPathPattern=quarantine-pubsub` and `quarantine-mesh`. Verify simulated multi-node PubSub broadcast with artificial latency assertions (< 50ms). |
| **Estimated Complexity** | High |

---

#### TIF-002 — Dual-Store Runtime Database Persistence for Quarantines & Allowlists (TD-013)

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-002 |
| **Phase** | Phase 1 — Hardened Edge Quarantine Mesh & Database Persistence |
| **Description** | Implement runtime database persistence for `QuarantineManager` and `QuarantineStore`. Ensure all active IP bans, CIDR subnet bans, and allowlist modifications are written atomically to SQLite and PostgreSQL `ip_quarantines` and `ip_allowlist` tables. Implement cold-start cache warming that preloads active, non-expired bans into memory and Bloom filters upon node boot. Provide asynchronous batch-write flushing to ensure database persistence adds < 5ms to quarantine operations. |
| **Files** | `src/lib/security/quarantine-db-store.ts` [NEW] · `src/lib/security/quarantine-store.ts` [MODIFY] · `src/lib/security/quarantine-manager.ts` [MODIFY] · `src/lib/__tests__/security/quarantine-db-store.test.ts` [NEW] |
| **Dependencies** | TIF-001 |
| **Acceptance Criteria** | 1. `QuarantineDbStore` provides async CRUD operations on `ip_quarantines` and `ip_allowlist` tables.<br>2. Node cold-start initializes in-memory store and Bloom filter directly from non-expired database records in < 100ms.<br>3. Dual-write operations ensure Redis and SQLite/PostgreSQL stores remain strictly synchronized.<br>4. Database write failure degrades gracefully without blocking in-memory or Redis quarantine enforcement.<br>5. Pruning cron / worker cleans expired database records periodically.<br>6. Unit tests confirm persistence durability across simulated process restarts. |
| **Verification Method** | Run `pnpm test --testPathPattern=quarantine-db-store`. Assert records are written to test database, survive simulated cache flush, and reload properly into Bloom filter on cold-start. |
| **Estimated Complexity** | Medium-High |

---

#### TIF-003 — Subnet Auto-Containment Source Event Emission & Mesh Synchronization (TD-017)

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-003 |
| **Phase** | Phase 1 — Hardened Edge Quarantine Mesh & Database Persistence |
| **Description** | Enhance `src/lib/security/quarantine-manager.ts` to emit `GATEWAY_SUBNET_CONTAINED` audit events directly at the source trigger point when $\ge 3$ distinct IPs in the same `/24` subnet trigger quarantine within a 10-minute sliding window. Transmit subnet containment events over the Redis PubSub mesh to propagate the entire `/24` block across all nodes, and persist the CIDR block to the database. |
| **Files** | `src/lib/security/quarantine-manager.ts` [MODIFY] · `src/lib/security/threat-audit-events.ts` [MODIFY] · `src/lib/__tests__/security/quarantine-manager.test.ts` [MODIFY] |
| **Dependencies** | TIF-001, TIF-002 |
| **Acceptance Criteria** | 1. When 3rd attacking IP in a `/24` subnet is quarantined, `QuarantineManager` calculates CIDR `/24` prefix.<br>2. Emits `GATEWAY_SUBNET_CONTAINED` event to `threatAuditWriter` with subnet CIDR, attacking IPs, tenant ID, and reason.<br>3. Publishes `CONTAIN_SUBNET` message to Redis PubSub mesh.<br>4. Subnet is written to `ip_quarantines` with `is_subnet: true`.<br>5. Requests from any IP within contained subnet receive `403 Forbidden (QUARANTINED_SUBNET)` across all cluster nodes.<br>6. Unit tests verify 3-IP attack sequence triggers exact source audit event and mesh message. |
| **Verification Method** | Run `pnpm test --testPathPattern=quarantine-manager` verifying subnet calculation, source audit event emission, and mesh synchronization. |
| **Estimated Complexity** | Medium |

---

### Phase 2 — AWS WAF SigV4 Signing, Retry Backoff & Strict Webhook Enforcement (TD-015)

#### TIF-004 — AWS Signature Version 4 (SigV4) Cryptographic Signer for Regional WAF

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-004 |
| **Phase** | Phase 2 — AWS WAF SigV4 Signing, Retry Backoff & Strict Webhook Enforcement |
| **Description** | Implement a standalone AWS Signature Version 4 (SigV4) request signer in `src/lib/security/aws-sigv4-signer.ts` for signing HTTP requests to regional AWS WAFv2 endpoints (`wafv2.<region>.amazonaws.com`). Support HMAC-SHA256 canonical request creation, credential scopes, date headers (`X-Amz-Date`), security token headers (`X-Amz-Security-Token`), and authorization header generation. Eliminate raw unauthenticated or custom stub requests. |
| **Files** | `src/lib/security/aws-sigv4-signer.ts` [NEW] · `src/lib/security/waf-adapters/aws-waf.ts` [MODIFY] · `src/lib/__tests__/security/aws-sigv4-signer.test.ts` [NEW] · `src/lib/__tests__/security/aws-waf-adapter.test.ts` [NEW] |
| **Dependencies** | None (Security Primitive) |
| **Acceptance Criteria** | 1. Implements RFC-compliant AWS SigV4 signing algorithm using Node.js `crypto` primitives.<br>2. Correctly formats canonical URI, canonical query string, canonical headers, and signed headers.<br>3. Computes HMAC-SHA256 signature chain: `DateKey` $\to$ `DateRegionKey` $\to$ `DateRegionServiceKey` $\to$ `SigningKey`.<br>4. Supports AWS IAM environment credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_REGION`).<br>5. Updates `aws-waf.ts` to sign `UpdateIPSet` and `GetIPSet` API calls.<br>6. Unit tests assert exact signature matching against known AWS test suite test vectors. |
| **Verification Method** | Run `pnpm test --testPathPattern=aws-sigv4-signer` and `aws-waf-adapter`. Verify test vectors and mocked AWS WAF responses. |
| **Estimated Complexity** | High |

---

#### TIF-005 — Exponential Jittered Retry Backoff Engine for Edge Firewall Dispatcher

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-005 |
| **Phase** | Phase 2 — AWS WAF SigV4 Signing, Retry Backoff & Strict Webhook Enforcement |
| **Description** | Implement an asynchronous queue and dispatch runner with exponential decorrelated jitter retry backoff for edge firewall synchronization (`src/lib/security/edge-firewall-dispatcher.ts`). Support up to 5 retries with backoff base 100ms, max delay 5000ms, and full jitter formula $T = \text{random}(0, \min(M, B \times 2^i))$. Emit `GATEWAY_WAF_DISPATCH_FAILED` audit events on terminal exhaustion. |
| **Files** | `src/lib/security/retry-backoff.ts` [NEW] · `src/lib/security/edge-firewall-dispatcher.ts` [MODIFY] · `src/lib/__tests__/security/retry-backoff.test.ts` [NEW] · `src/lib/__tests__/security/edge-firewall-dispatcher.test.ts` [MODIFY] |
| **Dependencies** | TIF-004 |
| **Acceptance Criteria** | 1. `withRetry(operation, options)` wraps outbound WAF API calls with configurable max attempts (default 5).<br>2. Full jitter decorrelation prevents thundering herd against Cloudflare and AWS WAF rate limits.<br>3. Transient 5xx / 429 errors from upstream WAF trigger automatic retry with exponential delay.<br>4. Non-retryable 4xx client errors (400, 401, 403) fail immediately without wasteful retries.<br>5. Terminal failure logs detailed error and dispatches Merkle audit event `GATEWAY_WAF_DISPATCH_FAILED`.<br>6. 100% unit test coverage simulating flaky network connections and verifying retry timing. |
| **Verification Method** | Run `pnpm test --testPathPattern=retry-backoff` and `edge-firewall-dispatcher`. Verify retry sequence and delay distributions. |
| **Estimated Complexity** | Medium |

---

#### TIF-006 — Fail-Closed Strict Edge Webhook Authentication & Ingestion Enforcement

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-006 |
| **Phase** | Phase 2 — AWS WAF SigV4 Signing, Retry Backoff & Strict Webhook Enforcement |
| **Description** | Harden the upstream edge webhook endpoint `src/app/api/webhooks/edge-security/route.ts` to enforce strict fail-closed authentication. When `NODE_ENV === 'production'`, reject any webhook call with `401 Unauthorized` if `EDGE_WEBHOOK_SECRET` is missing, unconfigured, or fails HMAC-SHA256 signature verification. Add replay attack protection via timestamp verification (`X-Webhook-Timestamp` within $\pm 300$ seconds). |
| **Files** | `src/app/api/webhooks/edge-security/route.ts` [MODIFY] · `src/lib/security/edge-webhook-validator.ts` [NEW] · `src/lib/__tests__/security/edge-webhook-validator.test.ts` [NEW] · `src/lib/__tests__/security/edge-security-webhook.test.ts` [NEW] |
| **Dependencies** | TIF-001 |
| **Acceptance Criteria** | 1. Webhook validator validates `X-Signature-SHA256` or `X-Hub-Signature-256` using constant-time `crypto.timingSafeEqual`.<br>2. Rejects timestamps older than 5 minutes (`400 Bad Request — TIMESTAMP_EXPIRED`).<br>3. In production, missing `EDGE_WEBHOOK_SECRET` returns `401 Unauthorized` with zero bypass paths.<br>4. Ingested WAF security events automatically quarantine offending IPs via `QuarantineManager`.<br>5. Emits `GATEWAY_WAF_WEBHOOK_RECEIVED` audit event.<br>6. Integration tests verify positive HMAC signature match and rejection on invalid/missing signatures. |
| **Verification Method** | Run `pnpm test --testPathPattern=edge-webhook`. Test missing secret, wrong signature, expired timestamp, and valid payload paths. |
| **Estimated Complexity** | Medium |

---

### Phase 3 — Strict Legacy Token Deprecation & Zero-Trust Enforcement (TD-012)

#### TIF-007 — Strict Legacy JWT Deprecation Engine with RFC 8594 Sunset Headers

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-007 |
| **Phase** | Phase 3 — Strict Legacy Token Deprecation & Zero-Trust Enforcement |
| **Description** | Implement the legacy token deprecation policy engine `src/lib/identity/legacy-token-deprecation.ts`. Define a multi-stage deprecation schedule (Warning $\to$ Soft Enforcement $\to$ Strict Rejection). Injects standard RFC 8594 `Deprecation: @<timestamp>`, `Sunset: <date>`, and `Link: <url>; rel="sunset"` HTTP response headers when legacy non-DPoP JWT tokens are encountered. |
| **Files** | `src/lib/identity/legacy-token-deprecation.ts` [NEW] · `src/lib/identity/deprecation-types.ts` [NEW] · `src/lib/__tests__/identity/legacy-token-deprecation.test.ts` [NEW] |
| **Dependencies** | None (Identity Domain Primitive) |
| **Acceptance Criteria** | 1. Supports 3 operational modes: `WARN` (headers only), `SOFT_ENFORCE` (block write mutations without DPoP), and `STRICT` (reject all non-DPoP requests with 401).<br>2. Configurable via `LEGACY_TOKEN_DEPRECATION_MODE` environment variable.<br>3. Computes RFC 8594 headers (`Deprecation`, `Sunset`, `Link: <migration-doc>; rel="sunset"`).<br>4. Formats RFC 7807 problem details response on rejection (`type: 'https://thaibahive.edu/errors/legacy-token-deprecated'`).<br>5. Full unit test suite asserting header generation and stage transition rules. |
| **Verification Method** | Run `pnpm test --testPathPattern=legacy-token-deprecation`. Verify headers and rejection body formats. |
| **Estimated Complexity** | Medium |

---

#### TIF-008 — Auth Middleware Strict Legacy Token Rejection & Migration Telemetry

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-008 |
| **Phase** | Phase 3 — Strict Legacy Token Deprecation & Zero-Trust Enforcement |
| **Description** | Integrate the legacy token deprecation engine into `src/lib/identity/dpop-middleware.ts` and `src/lib/identity/require-auth.ts`. When strict deprecation mode is active, reject requests bearing Bearer tokens without valid DPoP proof (`cnf.jkt` binding). Increment legacy token telemetry counters and log migration events for analytics. |
| **Files** | `src/lib/identity/dpop-middleware.ts` [MODIFY] · `src/lib/identity/require-auth.ts` [MODIFY] · `src/lib/security/gateway-metrics.ts` [MODIFY] · `src/lib/__tests__/identity/dpop-middleware.test.ts` [MODIFY] |
| **Dependencies** | TIF-007 |
| **Acceptance Criteria** | 1. In `STRICT` mode, un-attested legacy Bearer tokens are rejected with `401 Unauthorized` (`LEGACY_TOKEN_REJECTED`).<br>2. In `WARN` mode, requests pass with deprecation headers attached and metric incremented.<br>3. Emits `IDENTITY_LEGACY_TOKEN_ACCESSED` or `IDENTITY_LEGACY_TOKEN_REJECTED` audit event.<br>4. Increments Prometheus counter `legacy_token_requests_total{mode, client_version, tenant}`.<br>5. Unit tests assert both DPoP attested (200 OK) and legacy tokens (rejected or warned depending on mode). |
| **Verification Method** | Run `pnpm test --testPathPattern=dpop-middleware`. Assert mode switching from WARN to STRICT. |
| **Estimated Complexity** | Medium |

---

#### TIF-009 — Admin Legacy Token Migration Dashboard & Telemetry Tracking

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-009 |
| **Phase** | Phase 3 — Strict Legacy Token Deprecation & Zero-Trust Enforcement |
| **Description** | Build admin telemetry backend API routes (`/api/admin/security/identity/deprecation-stats`) and UI components for tracking legacy token sunset progress. Display migration percentage progress bar (0–100% DPoP adoption), active legacy client breakdown by User-Agent / client version, and controls to toggle deprecation enforcement mode per tenant or platform-wide. |
| **Files** | `src/app/api/admin/security/identity/deprecation-stats/route.ts` [NEW] · `src/components/security/legacy-token-migration-card.tsx` [NEW] · `src/app/(shell)/admin/security/identity/page.tsx` [MODIFY] · `src/lib/__tests__/security/deprecation-api.test.ts` [NEW] |
| **Dependencies** | TIF-008 |
| **Acceptance Criteria** | 1. `GET /api/admin/security/identity/deprecation-stats` returns adoption rate, legacy client count, and sunset deadline.<br>2. Protected with `system:security:view` RBAC permission.<br>3. UI renders migration progress bar, legacy client distribution table, and sunset countdown timer.<br>4. Accessible per WCAG 2.1 AA with zero violations.<br>5. Uses Radix UI primitives and Skeleton loading states. |
| **Verification Method** | Run `pnpm test --testPathPattern=deprecation-api`. Verify UI component rendering with mock telemetry states. |
| **Estimated Complexity** | Medium-High |

---

### Phase 4 — Enterprise Threat Intelligence Federation (STIX 2.1 / TAXII 2.1)

#### TIF-010 — STIX 2.1 Threat Indicator Parser & Validation Engine

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-010 |
| **Phase** | Phase 4 — Enterprise Threat Intelligence Federation |
| **Description** | Develop a robust STIX 2.1 (OASIS Standard) JSON threat indicator parser in `src/lib/security/threat-intel/stix-parser.ts`. Extract network indicators from STIX Patterning language: IPv4 addresses (`ipv4-addr:value = '...'`), IPv6 addresses, CIDR blocks, and malicious domain names. Parse metadata including `confidence` (0–100), `valid_from`, `valid_until`, `labels`, and `kill_chain_phases`. |
| **Files** | `src/lib/security/threat-intel/stix-parser.ts` [NEW] · `src/lib/security/threat-intel/stix-types.ts` [NEW] · `src/lib/__tests__/security/stix-parser.test.ts` [NEW] |
| **Dependencies** | None (Threat Intelligence Primitive) |
| **Acceptance Criteria** | 1. Parses standard STIX 2.1 `bundle` JSON objects with `indicator` and `observed-data` objects.<br>2. Extracts pattern expressions for single IPs, CIDR ranges, and domains with 100% regex parsing accuracy.<br>3. Filters out expired indicators where `valid_until < now()`.<br>4. Assigns normalized Threat Intelligence Risk Weight based on STIX `confidence` attribute.<br>5. Comprehensive unit tests covering valid bundles, malformed bundles, and complex compound STIX patterns. |
| **Verification Method** | Run `pnpm test --testPathPattern=stix-parser`. Verify parsing of standard OASIS STIX 2.1 sample test bundles. |
| **Estimated Complexity** | Medium-High |

---

#### TIF-011 — Automated TAXII 2.1 Feed Polling Client & Reputation Ingestion Pipeline

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-011 |
| **Phase** | Phase 4 — Enterprise Threat Intelligence Federation |
| **Description** | Implement an automated TAXII 2.1 polling client and ingestion worker (`src/lib/security/threat-intel/taxii-client.ts`, `feed-ingester.ts`). Poll configured TAXII 2.1 collections at scheduled intervals (e.g. hourly), parse STIX bundles (TIF-010), and ingest high-confidence threat indicators ($\text{confidence} \ge 80$) directly into `IpReputationEngine` and `QuarantineManager`. Cache manifest ETags to avoid redundant downloads. |
| **Files** | `src/lib/security/threat-intel/taxii-client.ts` [NEW] · `src/lib/security/threat-intel/feed-ingester.ts` [NEW] · `src/lib/security/threat-intel/threat-feed-config.ts` [NEW] · `src/lib/__tests__/security/taxii-client.test.ts` [NEW] |
| **Dependencies** | TIF-002, TIF-005, TIF-010 |
| **Acceptance Criteria** | 1. TAXII client communicates with TAXII 2.1 discovery (`/taxii2/`), api-root, and collections endpoints.<br>2. Supports HTTP Basic Authentication, Bearer token, and custom API key headers.<br>3. `FeedIngester` converts indicators to reputation penalties or auto-quarantines based on confidence threshold.<br>4. ETag and `added_after` query parameter tracking prevents duplicate processing.<br>5. Emits `THREAT_INTEL_FEED_SYNCED` Merkle audit event.<br>6. Unit tests mock TAXII 2.1 server responses and assert correct quarantine and reputation ingestion. |
| **Verification Method** | Run `pnpm test --testPathPattern=taxii-client` and `feed-ingester`. Test successful polling, ETag caching, and threat ingestion. |
| **Estimated Complexity** | High |

---

#### TIF-012 — Federated Institutional Threat Indicator Sharing API

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-012 |
| **Phase** | Phase 4 — Enterprise Threat Intelligence Federation |
| **Description** | Create secure federated threat intelligence sharing API endpoints under `src/app/api/security/threat-intel/federation/route.ts`. Allow authorized sister educational institutions to publish and retrieve anonymized threat indicators in STIX 2.1 format. Enforce mutual cryptographic authentication (mTLS / API Key + HMAC signature) and strip all internal tenant and user PII before sharing indicators. |
| **Files** | `src/app/api/security/threat-intel/federation/route.ts` [NEW] · `src/lib/security/threat-intel/federation-service.ts` [NEW] · `src/lib/validation/threat-intel-schemas.ts` [NEW] · `src/lib/__tests__/security/threat-federation-api.test.ts` [NEW] |
| **Dependencies** | TIF-010, TIF-011 |
| **Acceptance Criteria** | 1. `GET /api/security/threat-intel/federation` exports active threat indicators formatted as a STIX 2.1 bundle.<br>2. `POST /api/security/threat-intel/federation` ingests shared STIX bundles from trusted institutional peers.<br>3. PII sanitizer guarantees zero leakage of internal tenant IDs, user IDs, or student/staff records.<br>4. Authenticated via mutual shared secret / HMAC token with `system:threat-intel:federate` permission.<br>5. Zod schema validation on incoming bundles.<br>6. Unit and integration tests verify export formatting, sanitization, and ingestion. |
| **Verification Method** | Run `pnpm test --testPathPattern=threat-federation-api`. Verify STIX export and zero PII leakage assertions. |
| **Estimated Complexity** | Medium-High |

---

#### TIF-013 — Admin Threat Intelligence Federation Management UI

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-013 |
| **Phase** | Phase 4 — Enterprise Threat Intelligence Federation |
| **Description** | Develop the admin threat intelligence management console at `src/app/(shell)/admin/security/threat-intel/page.tsx`. Include views for configured TAXII feeds, sync status, active threat indicator counts, confidence distribution charts, manual feed trigger button, and federated institutional peer management. |
| **Files** | `src/app/(shell)/admin/security/threat-intel/page.tsx` [NEW] · `src/components/security/threat-intel-feeds-table.tsx` [NEW] · `src/components/security/threat-indicators-chart.tsx` [NEW] · `src/components/security/add-threat-feed-dialog.tsx` [NEW] · `src/lib/hooks/use-threat-intel.ts` [NEW] |
| **Dependencies** | TIF-011, TIF-012 |
| **Acceptance Criteria** | 1. Renders at `/admin/security/threat-intel` within shell layout.<br>2. Lists configured feeds with status badges (`Active`, `Syncing`, `Error`, `Paused`), last sync time, and indicator counts.<br>3. "Sync Now" button triggers immediate asynchronous feed ingestion.<br>4. Add Feed modal allows configuring new TAXII 2.1 URL, credentials, polling interval, and auto-quarantine threshold.<br>5. Meets WCAG 2.1 AA accessibility standards (0 violations).<br>6. Uses design system UI primitives (`Button`, `Badge`, `Dialog`, `Table`, `Skeleton`). |
| **Verification Method** | Test page rendering with mock feeds state, interaction testing on Add Feed modal, and Playwright verification. |
| **Estimated Complexity** | High |

---

### Phase 5 — Circuit Breaker Source Events, AST Scanner & Staging Certification (TD-016, TD-017, TD-018)

#### TIF-014 — Source-Emitted Circuit Breaker Merkle Audit Events & State Sync (TD-017)

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-014 |
| **Phase** | Phase 5 — Circuit Breaker Source Events, AST Scanner & Staging Certification |
| **Description** | Refactor `src/lib/security/circuit-breaker.ts` to directly emit `GATEWAY_CIRCUIT_BREAKER_TRIPPED` and `GATEWAY_CIRCUIT_BREAKER_RESET` Merkle audit events at source during state transitions (`CLOSED` $\to$ `OPEN`, `HALF_OPEN` $\to$ `CLOSED`). Synchronize circuit breaker state across cluster nodes via the Redis PubSub mesh (`TIF-001`) to trigger coordinated degraded mode shedding during platform-wide surges. |
| **Files** | `src/lib/security/circuit-breaker.ts` [MODIFY] · `src/lib/security/threat-audit-events.ts` [MODIFY] · `src/lib/__tests__/security/circuit-breaker.test.ts` [MODIFY] |
| **Dependencies** | TIF-001 |
| **Acceptance Criteria** | 1. Direct invocation of `threatAuditWriter.emitCircuitBreakerTripped` on `trip()` with trigger latency, error rate, and reason.<br>2. Direct invocation of `threatAuditWriter.emitCircuitBreakerReset` on `reset()`.<br>3. Publishes `CIRCUIT_BREAKER_STATE_CHANGE` event to Redis PubSub mesh.<br>4. Subscribing nodes transition to synchronized degraded mode within < 50ms.<br>5. Cryptographic audit chain verified with `pnpm compliance:verify`.<br>6. Unit tests assert source event emission and state broadcast. |
| **Verification Method** | Run `pnpm test --testPathPattern=circuit-breaker`. Verify audit event emission and mesh state synchronization. |
| **Estimated Complexity** | Medium |

---

#### TIF-015 — TypeScript AST Route Scanner Engine with Deep AST Visitor (TD-018)

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-015 |
| **Phase** | Phase 5 — Circuit Breaker Source Events, AST Scanner & Staging Certification |
| **Description** | Refactor `scripts/security/gateway-coverage-scanner.ts` from regex/filesystem string matching to a true TypeScript Abstract Syntax Tree (AST) analyzer using the TypeScript Compiler API (`ts.createSourceFile`, `ts.forEachChild`, AST Node visitor). Parse all `src/app/api/**/route.ts` files, inspect exported HTTP handler functions (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), and verify they are wrapped with `withRateLimit` and `requireAuth`. Expose CLI options `--strict`, `--json`, and `--fix-dry-run`. |
| **Files** | `scripts/security/gateway-coverage-scanner.ts` [MODIFY] · `scripts/security/__tests__/gateway-coverage-scanner.test.ts` [NEW] · `package.json` [MODIFY] |
| **Dependencies** | None (Tooling & Quality Gate) |
| **Acceptance Criteria** | 1. AST engine parses full TypeScript AST of all platform API routes (369+ routes).<br>2. Traverses CallExpressions and Identifiers to verify outer decorator wrapping.<br>3. Identifies missing rate limit tiers or missing auth guards with exact line and column numbers.<br>4. Exits with code 1 if unshielded endpoints are detected, code 0 when 100% compliant.<br>5. `pnpm gateway:scan` runs AST scanner in < 3.0s.<br>6. Unit tests assert detection accuracy against test fixtures with valid, missing, and malformed wrappers. |
| **Verification Method** | Execute `pnpm gateway:scan` asserting 100% coverage. Run `pnpm test --testPathPattern=gateway-coverage-scanner` verifying fixture assertions. |
| **Estimated Complexity** | Medium-High |

---

#### TIF-016 — Staging Cluster Live k6 DDoS Burst Certification & Resilience Validation (TD-016)

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-016 |
| **Phase** | Phase 5 — Circuit Breaker Source Events, AST Scanner & Staging Certification |
| **Description** | Configure and execute a live automated k6 DDoS burst simulation against a live dedicated staging cluster. Generate 1,000+ RPS sustained burst traffic across auth, mutation, and query endpoints for 60 seconds. Validate: (1) p95 latency < 50ms, (2) 0 unhandled 500 errors, (3) graceful 429 throttling, (4) automatic circuit breaker trip into degraded mode, and (5) automatic IP quarantine of simulated malicious actors. Generate a formal JSON/HTML performance certificate. |
| **Files** | `scripts/security/run-staging-ddos-certification.ts` [NEW] · `k6/staging-ddos-certification.js` [NEW] · `package.json` [MODIFY — add `test:staging:ddos`] |
| **Dependencies** | TIF-001, TIF-003, TIF-014 |
| **Acceptance Criteria** | 1. Live k6 runner executes against staging environment (`STAGING_GATEWAY_URL`).<br>2. Sustains 1,000+ RPS for 60 seconds across distributed simulated client IPs.<br>3. Gateway p95 latency remains < 50ms throughout the attack window.<br>4. Circuit breaker trips to `OPEN` within 5 seconds of burst onset and recovers to `CLOSED` after cool-down.<br>5. Produces machine-readable certification report `reports/staging-ddos-certification.json`.<br>6. Automated assertion verifies 0% 500 Internal Server Errors. |
| **Verification Method** | Execute `pnpm test:staging:ddos` in staging environment or simulated staging harness. Verify generated report metrics. |
| **Estimated Complexity** | Medium |

---

### Phase 6 — Observability, Operational Runbooks & AIOS Documentation

#### TIF-017 — Threat Intelligence & Mesh Prometheus OpenMetrics Telemetry

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-017 |
| **Phase** | Phase 6 — Observability, Operational Runbooks & AIOS Documentation |
| **Description** | Implement and register 6 new Prometheus OpenMetrics series in `src/lib/security/gateway-metrics.ts` and `src/lib/metrics/registry.ts`. Cover threat intelligence feed metrics, PubSub mesh synchronization performance, legacy token deprecation rejection counts, and AWS SigV4 request latencies. |
| **Files** | `src/lib/security/gateway-metrics.ts` [MODIFY] · `src/lib/metrics/registry.ts` [MODIFY] · `src/lib/__tests__/security/gateway-metrics.test.ts` [MODIFY] |
| **Dependencies** | TIF-001, TIF-004, TIF-008, TIF-011 |
| **Acceptance Criteria** | 1. Metrics registered:<br>   - `threat_intel_indicators_imported_total{feed_name, indicator_type, confidence_tier}`<br>   - `mesh_pubsub_sync_latency_seconds` (histogram: 0.005 to 0.5s)<br>   - `mesh_pubsub_events_total{event_type, status}`<br>   - `legacy_token_rejections_total{client_version, tenant}`<br>   - `db_quarantine_sync_duration_seconds` (histogram)<br>   - `waf_sigv4_requests_total{provider, action, status}`<br>2. Scrapeable via `/api/metrics` with standard Prometheus formatting.<br>3. Unit tests verify metric increment, gauge updates, and histogram observations. |
| **Verification Method** | Run `pnpm test --testPathPattern=gateway-metrics`. Verify `GET /api/metrics` output format and labels. |
| **Estimated Complexity** | Low-Medium |

---

#### TIF-018 — Operational Runbooks & AIOS Documentation Governance

| Field | Specification Details |
|---|---|
| **Task ID** | TIF-018 |
| **Phase** | Phase 6 — Observability, Operational Runbooks & AIOS Documentation |
| **Description** | Author 5 production-ready operational runbooks in `docs/` and update core AIOS governance documentation (`FEATURES.md`, `CHANGELOG.md`, `PROJECT_STATUS.md`). Document Redis PubSub mesh administration, AWS SigV4 configuration, STIX/TAXII threat feed management, legacy token sunset migration roadmap, and staging DDoS drill procedures. |
| **Files** | `docs/redis-quarantine-mesh-ops.md` [NEW] · `docs/aws-waf-sigv4-configuration.md` [NEW] · `docs/threat-intel-stix-taxii-guide.md` [NEW] · `docs/legacy-token-sunset-roadmap.md` [NEW] · `docs/staging-ddos-certification-ops.md` [NEW] · `.ai/FEATURES.md` [MODIFY] · `.ai/CHANGELOG.md` [MODIFY] · `.ai/PROJECT_STATUS.md` [MODIFY] |
| **Dependencies** | All preceding tasks (TIF-001 through TIF-017) |
| **Acceptance Criteria** | 1. `redis-quarantine-mesh-ops.md` explains PubSub channel topology, partition recovery, and fallback monitoring.<br>2. `aws-waf-sigv4-configuration.md` provides IAM policy templates, SigV4 debugging, and credential rotation steps.<br>3. `threat-intel-stix-taxii-guide.md` details feed configuration, STIX pattern syntax, and institutional federation.<br>4. `legacy-token-sunset-roadmap.md` outlines timeline, deprecation headers, and client upgrade guides.<br>5. `staging-ddos-certification-ops.md` guides operators through k6 load testing execution and verification.<br>6. `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` updated with v3.23.0 deliverables and technical debt resolutions (TD-012 to TD-018 marked resolved). |
| **Verification Method** | Validate file existence, Markdown linting, and complete AIOS status consistency. |
| **Estimated Complexity** | Medium |

---

## 4. Architecture & Data Flow

```
                                      [ INCOMING REQUEST ]
                                               │
                                               ▼
                                ┌──────────────────────────────┐
                                │    Fast-Path Bloom Filter    │ ◄── [ Redis PubSub Sync Mesh ]
                                │  Is IP / Subnet Quarantined? │     (Channel: `security:quarantine:events`)
                                └──────────────┬───────────────┘     (Sub-50ms Multi-Node Sync)
                                               │ NO
                                               ▼
                                ┌──────────────────────────────┐
                                │     Edge Circuit Breaker     │ ◄── [ Canary Latency / Error Rate ]
                                │   System in Degraded Mode?   │     (Source Merkle Audit Emission)
                                └──────────────┬───────────────┘
                                               │ NORMAL / BYPASS
                                               ▼
                                ┌──────────────────────────────┐
                                │    Adaptive Rate Limiter     │ ◄── [ Threat Intel Reputation ]
                                │ ─ Multi-dimensional Quota    │     (STIX 2.1 / TAXII 2.1 Feeds)
                                │ ─ Continuous Risk Scaling    │
                                └──────────────┬───────────────┘
                                               │ UNDER LIMIT
                                               ▼
                                ┌──────────────────────────────┐
                                │   Legacy Token Deprecation   │ ◄── [ RFC 8594 Sunset Engine ]
                                │   Is DPoP Proof Attached?    │     (Strict Rejection / Deprecation Headers)
                                └──────────────┬───────────────┘
                                               │ VALID DPoP TOKEN
                                               ▼
                                ┌──────────────────────────────┐
                                │       API Route Handler      │
                                └──────────────┬───────────────┘
                                               │ Response
                                               ▼
         ┌─────────────────────────────────────┴─────────────────────────────────────┐
         │                                                                           │
         ▼                                                                           ▼
┌─────────────────────────────────┐                                 ┌─────────────────────────────────┐
│     Prometheus OpenMetrics      │                                 │    Tamper-Proof Merkle Audit    │
│  `threat_intel_indicators`      │                                 │  `GATEWAY_CIRCUIT_BREAKER_*`    │
│  `mesh_pubsub_sync_latency`     │                                 │  `GATEWAY_SUBNET_CONTAINED`     │
│  `legacy_token_rejections`      │                                 │  `THREAT_INTEL_FEED_SYNCED`     │
└─────────────────────────────────┘                                 └─────────────────────────────────┘
```

---

## 5. Technical Debt Resolution Matrix

| Technical Debt ID | Original Description | Target Sprint | Resolution Task(s) in Sprint-039 | Resolution Strategy & Verification |
|---|---|---|---|---|
| **TD-012** | Strict Legacy Token Deprecation Enforcement | Sprint-039 | **TIF-007, TIF-008, TIF-009** | Implement RFC 8594 Sunset engine, strict rejection middleware, and admin migration progress radar. Verified via unit and integration tests. |
| **TD-013** | Database Persistence for Quarantine Store (AGS-006) | Sprint-039 | **TIF-002** | Implement dual-write `QuarantineDbStore` persisting bans to SQLite/PostgreSQL `ip_quarantines` with cold-start preload. |
| **TD-014** | Redis PubSub Channel for Quarantine Mesh (AGS-007) | Sprint-039 | **TIF-001** | Replace in-process EventBus with production Redis PubSub channel `security:quarantine:events` ensuring < 50ms multi-node sync. |
| **TD-015** | AWS WAF SigV4 Signing, Retry Backoff & Strict Webhooks (AGS-008) | Sprint-039 | **TIF-004, TIF-005, TIF-006** | AWS SigV4 signer using Node `crypto`, exponential jittered retry engine (max 5 retries), and strict fail-closed webhook validation in production. |
| **TD-016** | Staging Cluster Live k6 DDoS Burst Run (AGS-011) | Sprint-039 | **TIF-016** | Execute live automated k6 1,000+ RPS DDoS burst simulation against staging cluster with documented performance certificate report. |
| **TD-017** | Circuit Breaker & Subnet Source Audit Events (AGS-015) | Sprint-039 | **TIF-003, TIF-014** | Direct source emission of `GATEWAY_CIRCUIT_BREAKER_TRIPPED/RESET` in `circuit-breaker.ts` and `GATEWAY_SUBNET_CONTAINED` in `quarantine-manager.ts`. |
| **TD-018** | AST-Based Platform Route Scanner (AGS-016) | Sprint-039 | **TIF-015** | Implement true TypeScript AST parser inspecting route files for `withRateLimit` and `requireAuth` decorators across 369+ platform routes. |

---

## 6. File Manifest

### New Files to Create

```
src/lib/security/
├── quarantine-pubsub.ts
├── quarantine-db-store.ts
├── aws-sigv4-signer.ts
├── retry-backoff.ts
├── edge-webhook-validator.ts
└── threat-intel/
    ├── stix-parser.ts
    ├── stix-types.ts
    ├── taxii-client.ts
    ├── feed-ingester.ts
    ├── threat-feed-config.ts
    └── federation-service.ts

src/lib/identity/
├── legacy-token-deprecation.ts
└── deprecation-types.ts

src/lib/validation/
└── threat-intel-schemas.ts

src/app/api/admin/security/identity/deprecation-stats/
└── route.ts

src/app/api/security/threat-intel/federation/
└── route.ts

src/app/(shell)/admin/security/threat-intel/
└── page.tsx

src/components/security/
├── legacy-token-migration-card.tsx
├── threat-intel-feeds-table.tsx
├── threat-indicators-chart.tsx
└── add-threat-feed-dialog.tsx

src/lib/hooks/
└── use-threat-intel.ts

src/lib/__tests__/security/
├── quarantine-pubsub.test.ts
├── quarantine-db-store.test.ts
├── aws-sigv4-signer.test.ts
├── aws-waf-adapter.test.ts
├── retry-backoff.test.ts
├── edge-webhook-validator.test.ts
├── edge-security-webhook.test.ts
├── stix-parser.test.ts
├── taxii-client.test.ts
├── threat-federation-api.test.ts
└── deprecation-api.test.ts

src/lib/__tests__/identity/
└── legacy-token-deprecation.test.ts

scripts/security/
├── run-staging-ddos-certification.ts
└── __tests__/
    └── gateway-coverage-scanner.test.ts

k6/
└── staging-ddos-certification.js

docs/
├── redis-quarantine-mesh-ops.md
├── aws-waf-sigv4-configuration.md
├── threat-intel-stix-taxii-guide.md
├── legacy-token-sunset-roadmap.md
└── staging-ddos-certification-ops.md
```

### Existing Files to Modify

```
src/lib/security/quarantine-mesh.ts           (integrate Redis PubSub broadcaster and receiver)
src/lib/security/quarantine-store.ts          (integrate QuarantineDbStore persistence layer)
src/lib/security/quarantine-manager.ts        (emit GATEWAY_SUBNET_CONTAINED at source)
src/lib/security/circuit-breaker.ts           (emit GATEWAY_CIRCUIT_BREAKER_* at source and sync mesh)
src/lib/security/edge-firewall-dispatcher.ts  (integrate retry backoff and SigV4 signer)
src/lib/security/waf-adapters/aws-waf.ts      (integrate SigV4 request signing)
src/app/api/webhooks/edge-security/route.ts   (enforce strict fail-closed webhook validation)
src/lib/identity/dpop-middleware.ts           (integrate strict legacy token deprecation checks)
src/lib/identity/require-auth.ts              (inject RFC 8594 deprecation and sunset headers)
src/lib/security/threat-audit-events.ts       (register threat intel and mesh event creators)
src/lib/security/gateway-metrics.ts           (register 6 new Prometheus OpenMetrics series)
src/lib/metrics/registry.ts                   (expose new metrics series)
src/app/(shell)/admin/security/identity/page.tsx (integrate legacy token migration card)
scripts/security/gateway-coverage-scanner.ts  (refactor to true TypeScript AST parser)
package.json                                  (add test:staging:ddos script)
.ai/FEATURES.md                               (document v3.23.0 feature entries)
.ai/CHANGELOG.md                              (document v3.23.0 release notes)
.ai/PROJECT_STATUS.md                         (update status and mark TD-012 to TD-018 resolved)
```

---

## 7. Risk Register & Mitigation Strategy

| Risk ID | Category | Risk Description | Severity | Probability | Mitigation Strategy |
|---|---|---|---|---|---|
| **R-001** | Infrastructure | Redis PubSub connection drop or cluster partition stalls quarantine propagation | High | Medium | Implement automatic local in-memory fallback and heartbeat reconnect. On reconnect, subscriber nodes issue a `SYNC_REQUEST` to re-fetch all active bans from database/peers. |
| **R-002** | Security / Auth | Strict legacy token deprecation locks out legacy mobile or external integration clients | High | Medium | Implement configurable 3-tier rollout (`WARN` $\to$ `SOFT_ENFORCE` $\to$ `STRICT`). Provide tenant-level opt-in controls and migration dashboard telemetry before triggering strict rejection. |
| **R-003** | External API | AWS WAF rate limits or regional endpoint unavailability during high-frequency quarantine updates | Medium | Low | Deploy exponential jittered retry backoff (TIF-005). Isolate edge dispatch to asynchronous non-blocking queues so local gateway security remains 100% operational. |
| **R-004** | Performance | Ingesting large STIX/TAXII threat feeds (10,000+ indicators) causes memory spikes or slow lookups | Medium | Medium | Ingest only indicators with confidence $\ge 80$. Maintain in-memory Bloom filter for $O(1)$ fast-path checks (< 0.05ms) and batch database writes. |
| **R-005** | Security / Privacy | Federated threat sharing inadvertently leaks internal IP addresses or student/staff identifiers | High | Low | Dedicated PII sanitization pipeline (TIF-012) strips tenant IDs, internal subnets (`10.0.0.0/8`, `192.168.0.0/16`), and user references prior to STIX export. |
| **R-006** | Testing / Environment | Live staging DDoS test impacts staging environment availability or shared services | Low | Medium | Execute staging DDoS drills during scheduled test maintenance windows; implement rate limiting on the simulation runner itself. |

---

## 8. Rollback Plan

### Rollback Trigger Criteria
- Redis PubSub mesh causes memory leaks or unbounded connection growth (> 50 active socket connections).
- Legacy token deprecation false rejection rate exceeds 0.1% for valid authenticated users.
- Edge firewall dispatch queue backpressure causes worker thread exhaustion.
- STIX/TAXII feed ingestion causes database lock contention or CPU usage > 80%.

### Rollback Execution Steps

```bash
# Step 1: Disable Strict Deprecation & Threat Intel Ingestion via Environment Flags (< 1 min)
LEGACY_TOKEN_DEPRECATION_MODE=WARN
THREAT_INTEL_FEED_SYNC_ENABLED=false
EDGE_FIREWALL_DISPATCH_ENABLED=false

# Step 2: Fallback Quarantine Mesh to In-Memory EventBus Mode (< 2 min)
QUARANTINE_MESH_BACKEND=memory

# Step 3: Revert Application Build (if necessary) (< 5 min)
git revert --no-edit HEAD
pnpm build

# Step 4: Verification of Restored Baseline
pnpm typecheck
pnpm test
pnpm compliance:verify
```

---

## 9. Definition of Done

A Sprint-039 task is considered **COMPLETE** when all of the following gates are met:

### Code Quality & Standards
- [ ] `pnpm typecheck` passes with 0 TypeScript errors across all packages (`src/`, `packages/auth`, `packages/db`).
- [ ] `pnpm lint` passes with 0 errors and 0 new warnings.
- [ ] Zero `console.log` statements in production source code (`src/`, `packages/`).
- [ ] No hardcoded secrets, AWS keys, or disabled security flags.
- [ ] Complete JSDoc annotations on all exported types, classes, and helper functions.

### Testing & Verification
- [ ] Unit tests authored for every new module with $\ge 90\%$ code coverage.
- [ ] All Jest test suites pass: `pnpm test` $\to$ 100% pass rate (295+ suites).
- [ ] `pnpm gateway:scan` $\to$ 100% route coverage using true TypeScript AST parser.
- [ ] `pnpm compliance:scan` $\to$ 100% compliance audit coverage across all mutation endpoints.
- [ ] `pnpm compliance:verify` $\to$ Cryptographic Merkle audit chain verified intact.
- [ ] `pnpm security:tenants` $\to$ 0 cross-tenant isolation leaks across all files.
- [ ] Live staging DDoS simulation verifies p95 latency < 50ms under 1,000+ RPS burst.

### Security & RBAC
- [ ] All new threat intelligence and deprecation API routes protected with `requireAuth` and granular permissions (`system:security:view`, `system:security:manage`, `system:threat-intel:federate`).
- [ ] Fail-closed webhook security verified in production environment.
- [ ] AWS SigV4 signatures verified with cryptographic test vectors.

### Documentation & Governance
- [ ] 5 operational runbooks created in `docs/`.
- [ ] `.ai/FEATURES.md` updated with Sprint-039 features.
- [ ] `.ai/CHANGELOG.md` updated with v3.23.0 release notes.
- [ ] `.ai/PROJECT_STATUS.md` updated with v3.23.0 and TD-012 through TD-018 marked resolved.
- [ ] `.ai/execution/Sprint-039-Execution-Log.md` initialized.

---

## 10. Sprint Metadata & Lifecycle

| Metadata Field | Value |
|---|---|
| **Sprint ID** | SPRINT-039 |
| **Sprint Name** | Enterprise Threat Intelligence Federation, Hardened Edge Mesh & Strict Legacy Deprecation |
| **Target Release Version** | v3.23.0 |
| **Total Implementation Tasks** | 18 (TIF-001 through TIF-018) |
| **Estimated Sprint Duration** | 8–10 engineering days |
| **Estimated Complexity** | Medium-High |
| **Predecessor Sprint** | SPRINT-038 (v3.22.0 — API Gateway Security Shield) |
| **Successor Artifact** | `.ai/execution/Sprint-039-Execution-Log.md` |
| **Release Certificate Artifact** | `.ai/releases/Release-Certificate-Sprint-039.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-19*  
*ThaibaHive Institution OS — Sprint-039 v3.23.0 Engineering Lifecycle*
