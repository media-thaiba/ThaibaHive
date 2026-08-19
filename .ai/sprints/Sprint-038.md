# Engineering Contract — Sprint-038

**Sprint ID:** SPRINT-038  
**Sprint Name:** Distributed Adaptive Rate Limiting, API Gateway Security Shield & Intelligent Threat Mitigation  
**Target Release Version:** v3.22.0  
**Contract Date:** 2026-08-19  
**Contract Status:** APPROVED — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-038-Recommendation.md`  

---

## 1. Contract Overview

This engineering contract formalises the implementation scope, task breakdown, acceptance criteria, risk register, and definition of done for Sprint-038. It is binding on the Implementation Engineer and governs all execution work until the sprint is handed to the Verification Engineer.

Sprint-038 delivers an enterprise-grade **Distributed Adaptive Rate Limiting Engine**, **API Gateway Security Shield**, and **Intelligent Automated Threat Mitigation Subsystem** layered on top of the Zero-Trust Identity Mesh (Sprint-037), Cryptographic Merkle Audit Engine (Sprint-036), and Cross-Region Redis Sync Mesh (Sprint-035).

The system provides multi-dimensional sliding-window rate limiting (per tenant, per staff role, and per client DPoP device thumbprint `cnf.jkt`), dynamic risk-adjusted threshold throttles, automated IP/subnet reputation scoring with quarantine triggering, synthetic canary health probes with edge circuit breaking, upstream edge WAF synchronization (Cloudflare/AWS WAF), and a real-time Admin Threat Shield Radar dashboard at `/admin/security/gateway`.

---

## 2. Scope

### In Scope

| # | Area | Description |
|---|------|-------------|
| 1 | Distributed Rate Limiting Engine | Redis-backed sliding-window counter and token-bucket rate limiter with sub-millisecond enforcement latency (< 1ms) |
| 2 | In-Memory Graceful Fallback | Resilient local sliding-window cache fallback when Redis cluster connections degrade or fail |
| 3 | Adaptive Risk-Based Throttling | Integration with Sprint-037 Continuous Risk Engine to dynamically tighten rate limits (e.g. 50% tighter for high-risk sessions) |
| 4 | Client Device & Role Quotas | Multi-dimensional quota dimensions: per-tenant, per-role (`super_admin`, `admin`, `principal`, `hod`, `staff`), and per-device (`cnf.jkt` DPoP thumbprint) |
| 5 | Route Middleware Decorator | Composable Next.js route wrapper `withRateLimit` adhering to RFC 6585 / RFC 7807 (`429 Too Many Requests`, `Retry-After`, `RateLimit-*` headers) |
| 6 | IP Reputation Scoring | Multi-signal IP reputation evaluator (ASN risk, velocity, repeated 4xx/401/403 anomalies, brute-force patterns) |
| 7 | Automated IP Quarantine | Automatic temporary banning of IP / CIDR subnets upon 5+ failed step-up challenges, 10+ DPoP replays, or aggressive scanning |
| 8 | Distributed Quarantine Mesh | Sub-50ms propagation of IP quarantine events across distributed gateway nodes via EventBus / Redis PubSub |
| 9 | Upstream Edge WAF Dispatcher | Webhook and API dispatch integration to propagate quarantined IPs into upstream WAFs (Cloudflare IP Access Rules / AWS WAF IP sets) |
| 10 | Synthetic Canary Probes | Background synthetic probe subsystem measuring gateway latency, edge responsiveness, and simulation resilience |
| 11 | Edge Circuit Breaker & Degraded Mode | Automated circuit breaker opening under DDoS bursts / Redis saturations, activating deterministic degraded shedding |
| 12 | DDoS Simulation & k6 Harness | k6 test suites simulating high-concurrency DDoS bursts (1000+ RPS), credential stuffing, and DPoP replay storms |
| 13 | Admin Threat Shield Radar UI | Real-time visual dashboard at `/admin/security/gateway` displaying traffic volume, blocked requests, quota heatmaps, and quarantine management |
| 14 | Security Telemetry & Prometheus | 12+ OpenMetrics counters and histograms for rate-limit violations, quarantine triggers, probe latencies, and circuit breaker states |
| 15 | Tamper-Proof Audit Logging | Integration of 8 new gateway threat event types into the SHA-256 Merkle audit chain |
| 16 | CI/CD Security Gate | AST-based route scanner (`pnpm gateway:scan`) asserting 100% rate-limit decoration coverage on sensitive API endpoints |
| 17 | Technical Debt Resolution | Resolution of TD-010 (staging load execution) and TD-011 (FIDO2 WebAuthn attestation statement validator) |
| 18 | Operational Runbooks | 5 comprehensive production runbooks in `docs/` covering rate limiting, IP quarantine, DDoS response, WAF integration, and radar operations |

### Out of Scope

| Area | Reason |
|------|--------|
| BGP Anycast routing layer modifications | Infrastructure/DNS layer managed by cloud hosting provider; gateway operates at L7 HTTP/Reverse Proxy layer |
| Captcha/Cloudflare Turnstile front-end challenge injection | Handled transparently by upstream reverse proxy if configured; application gateway focuses on cryptographic step-up & IP quarantine |
| Custom machine-learning bot classifier training | Rule-based heuristics and continuous risk engine integration are deterministic and sufficient for v3.22.0 |
| Modification of core ERP business entities | Core database schema remains untouched; only gateway security, quarantine, and metric schemas are modified |
| Client-side Flutter rate limiting modifications | Flutter client uses standard backoff and retry headers provided by the server gateway |

---

## 3. Implementation Tasks

> Tasks are structured in strict dependency order. Foundational engine modules (AGS-001 through AGS-004) MUST be verified before dependent quarantine, canary, and dashboard systems are constructed.

---

### Phase 1 — Distributed Sliding-Window Rate Limiting Engine

#### AGS-001 — Sliding-Window Counter & Token-Bucket Rate Limiter Core

| Field | Value |
|-------|-------|
| **Task ID** | AGS-001 |
| **Phase** | Phase 1 — Distributed Sliding-Window Rate Limiting Engine |
| **Description** | Implement the core sliding-window counter and token bucket algorithms for high-throughput rate limiting. Support configurable time windows (1s, 10s, 60s, 1hr), burst capacities, and multi-key evaluation. Expose clean interfaces for distributed storage backends. |
| **Files** | `src/lib/security/rate-limiter.ts` [NEW] · `src/lib/security/sliding-window.ts` [NEW] · `src/lib/security/rate-limit-types.ts` [NEW] · `src/lib/__tests__/security/rate-limiter.test.ts` [NEW] |
| **Dependencies** | None — Foundational Primitive |
| **Acceptance Criteria** | (1) Accurate sliding-window log/counter tracking request timestamps with sub-millisecond calculation time. (2) Token-bucket algorithm supporting burst allowances and steady-state refill rates. (3) Structured types defining `RateLimitRule`, `RateLimitResult`, `RateLimitTier`, and `RateLimitDimension`. (4) Memory leak protection with automated expiration of stale window buckets. (5) 100% unit test coverage for sliding-window accuracy across boundary conditions. |
| **Verification Method** | `pnpm test --testPathPattern=rate-limiter` — all unit tests passing. Verify exact bucket counts across simulated sub-second intervals. |
| **Estimated Complexity** | Medium-High |

---

#### AGS-002 — Redis Cluster Adapter & Local In-Memory Fallback Store

| Field | Value |
|-------|-------|
| **Task ID** | AGS-002 |
| **Phase** | Phase 1 — Distributed Sliding-Window Rate Limiting Engine |
| **Description** | Implement the distributed Redis cluster storage adapter using atomic Lua scripts (ZADD, ZREMRANGEBYSCORE, ZCARD, EXPIRE) and Redis pipelining for sub-millisecond execution. Implement a resilient local in-memory LRU fallback store that automatically activates with zero downtime if the Redis connection degrades or drops. |
| **Files** | `src/lib/security/rate-limit-redis.ts` [NEW] · `src/lib/security/rate-limit-fallback.ts` [NEW] · `src/lib/__tests__/security/rate-limit-redis.test.ts` [NEW] · `src/lib/__tests__/security/rate-limit-fallback.test.ts` [NEW] |
| **Dependencies** | AGS-001 |
| **Acceptance Criteria** | (1) Atomic Lua script execution ensures zero race conditions in high-concurrency window tracking. (2) Redis pipelining keeps single-request overhead < 1ms under standard network latency. (3) Health check detector transparently fails over to `LocalFallbackStore` within 50ms of Redis disconnection. (4) Automatic resynchronization when Redis connection recovers. (5) Unit tests assert complete mock Redis disconnection and seamless fallback. |
| **Verification Method** | `pnpm test --testPathPattern=rate-limit-redis` and `rate-limit-fallback` — 100% green. Execute disconnection chaos simulation verifying zero thrown unhandled exceptions. |
| **Estimated Complexity** | High |

---

#### AGS-003 — Adaptive Risk-Aware Limiting Pipeline & DPoP Thumbprint Binding

| Field | Value |
|-------|-------|
| **Task ID** | AGS-003 |
| **Phase** | Phase 1 — Distributed Sliding-Window Rate Limiting Engine |
| **Description** | Integrate the rate limiting engine with Sprint-037's Continuous Risk Engine (`src/lib/identity/risk-engine.ts`) and DPoP device thumbprint (`cnf.jkt`). Compute dynamic quotas where client trust score and session risk level scale the allowable request rate (e.g. low risk = 100% quota; medium risk = 75% quota; high risk = 25% quota; critical risk = 0% / instant drop). |
| **Files** | `src/lib/security/adaptive-limiter.ts` [NEW] · `src/lib/security/quota-resolver.ts` [NEW] · `src/lib/__tests__/security/adaptive-limiter.test.ts` [NEW] |
| **Dependencies** | AGS-001, AGS-002 |
| **Acceptance Criteria** | (1) Rate limits resolve compound keys combining `tenantId:role:dpopThumbprint:routeCategory`. (2) Risk score >= 50 reduces allowable burst capacity by 50%. (3) Risk score >= 80 drops quota to 10% and emits high-risk telemetry event. (4) Unauthenticated endpoints fall back to `ip:routeCategory` with strict public baseline limits. (5) Role-based tiers properly provisioned (`super_admin` > `admin` > `staff` > `public`). (6) Zero TypeScript errors. |
| **Verification Method** | `pnpm test --testPathPattern=adaptive-limiter` — all unit tests green with simulated risk profiles (low, medium, high, critical). |
| **Estimated Complexity** | Medium-High |

---

#### AGS-004 — Route Middleware Decorator `withRateLimit` & RFC 7807/6585 Responses

| Field | Value |
|-------|-------|
| **Task ID** | AGS-004 |
| **Phase** | Phase 1 — Distributed Sliding-Window Rate Limiting Engine |
| **Description** | Build the Next.js API route middleware decorator `withRateLimit` that seamlessly chains with `requireAuth` and `withDPoP`. Attach standard RFC 6585 headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`) to all responses. Return RFC 7807 Problem Details on `429 Too Many Requests`. |
| **Files** | `src/lib/security/rate-limit-middleware.ts` [NEW] · `src/lib/security/index.ts` [NEW] · `src/lib/__tests__/security/rate-limit-middleware.test.ts` [NEW] |
| **Dependencies** | AGS-001, AGS-002, AGS-003 |
| **Acceptance Criteria** | (1) `withRateLimit(handler, { tier: 'auth' | 'mutation' | 'query' | 'export' })` cleanly wraps API handlers. (2) Returns HTTP 429 with `application/problem+json` body on limit violation. (3) Injects `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` on all requests. (4) Execution overhead < 1ms. (5) Fully composable with `requireAuth(withDPoP(withRateLimit(...)))`. (6) All negative path tests pass. |
| **Verification Method** | Unit and integration tests testing wrapped routes with rapid sequential requests triggering 429 and asserting exact response headers. |
| **Estimated Complexity** | Medium |

---

### Phase 2 — Automated IP Reputation, Quarantine & Edge WAF Integration

#### AGS-005 — IP Reputation Scoring & Threat Heuristic Engine

| Field | Value |
|-------|-------|
| **Task ID** | AGS-005 |
| **Phase** | Phase 2 — Automated IP Reputation, Quarantine & Edge WAF Integration |
| **Description** | Implement an IP reputation engine that tracks suspicious client behaviors across a 15-minute sliding window: failed step-up challenges, DPoP replay attempts, 404 scanning velocity, invalid JWT floods, and rapid cross-tenant requests. Calculate an IP Threat Score (0–100) and assign reputation classifications (`clean`, `suspicious`, `malicious`, `banned`). |
| **Files** | `src/lib/security/ip-reputation.ts` [NEW] · `src/lib/security/threat-heuristics.ts` [NEW] · `src/lib/__tests__/security/ip-reputation.test.ts` [NEW] |
| **Dependencies** | AGS-001, AGS-003 |
| **Acceptance Criteria** | (1) Tracks behavioral threat indicators per IP and /24 subnet. (2) Cumulative threat scoring weights: 10 DPoP replays = +50 pts; 5 failed step-up challenges = +40 pts; 20 404s/min = +30 pts. (3) Score >= 70 flags IP as `malicious`; score >= 90 triggers immediate quarantine request. (4) Decay algorithm reduces reputation penalty over 1-hour clean window. (5) In-memory LRU + Redis storage for reputation state. |
| **Verification Method** | `pnpm test --testPathPattern=ip-reputation` — unit tests verifying threshold transitions and time-decay algorithms. |
| **Estimated Complexity** | Medium |

---

#### AGS-006 — Automated Subnet & IP Quarantine Subsystem

| Field | Value |
|-------|-------|
| **Task ID** | AGS-006 |
| **Phase** | Phase 2 — Automated IP Reputation, Quarantine & Edge WAF Integration |
| **Description** | Create the IP quarantine management subsystem with database and Redis backing. Support automatic time-bounded quarantines (15m, 1h, 24h, permanent), CIDR /24 subnet containment when multiple IPs in the same subnet attack, and manual admin unban/allowlisting capabilities. Store active bans in a dedicated `ip_quarantines` table. |
| **Files** | `src/lib/security/quarantine-manager.ts` [NEW] · `src/lib/security/quarantine-store.ts` [NEW] · `src/db/schema.ts` [MODIFY — add `ip_quarantines` and `ip_allowlist` tables] · `src/lib/__tests__/security/quarantine-manager.test.ts` [NEW] |
| **Dependencies** | AGS-005 |
| **Acceptance Criteria** | (1) Schema updated with `ip_quarantines` and `ip_allowlist` tables including tenant isolation and expiry timestamps. (2) `QuarantineManager.quarantineIp(ip, reason, duration)` adds IP to active ban list in Redis and SQLite/PostgreSQL. (3) Subnet auto-containment activates if >= 3 distinct IPs in the same /24 subnet trigger quarantine within 10 minutes. (4) Quarantined requests immediately rejected with `403 Forbidden` (`QUARANTINED_IP`). (5) Expired quarantines automatically pruned without manual intervention. |
| **Verification Method** | `pnpm test --testPathPattern=quarantine-manager` — unit tests testing single IP ban, /24 subnet ban, allowlist bypass, and automatic expiration. |
| **Estimated Complexity** | High |

---

#### AGS-007 — Distributed Quarantine Sync Mesh via EventBus / Redis PubSub

| Field | Value |
|-------|-------|
| **Task ID** | AGS-007 |
| **Phase** | Phase 2 — Automated IP Reputation, Quarantine & Edge WAF Integration |
| **Description** | Implement distributed real-time synchronization of quarantine events across all running server and edge nodes using EventBus and Redis PubSub. When an IP is quarantined by any instance, propagate the ban to all cluster instances within < 50ms. Maintain an in-memory Bloom filter on each node for zero-lookup overhead on clean requests. |
| **Files** | `src/lib/security/quarantine-mesh.ts` [NEW] · `src/lib/security/quarantine-bloom.ts` [NEW] · `src/lib/__tests__/security/quarantine-mesh.test.ts` [NEW] |
| **Dependencies** | AGS-006 |
| **Acceptance Criteria** | (1) Redis PubSub channel `security:quarantine:events` broadcasts quarantine additions and removals. (2) Sub-50ms propagation across nodes in cluster. (3) Local Bloom filter updated atomically on receiving PubSub message. (4) Non-quarantined requests pass through Bloom filter in < 0.05ms with zero DB/Redis overhead. (5) Reconnection handler resynchronizes full active quarantine list after network partitions. |
| **Verification Method** | `pnpm test --testPathPattern=quarantine-mesh` — integration tests simulating multi-node broadcast and Bloom filter verification. |
| **Estimated Complexity** | Medium-High |

---

#### AGS-008 — Edge Firewall Sync & Upstream WAF Dispatcher

| Field | Value |
|-------|-------|
| **Task ID** | AGS-008 |
| **Phase** | Phase 2 — Automated IP Reputation, Quarantine & Edge WAF Integration |
| **Description** | Implement an outbound webhook and API dispatcher that formats and syncs quarantined IPs with upstream edge firewalls (Cloudflare IP Access Rules / AWS WAF IP Sets). Provide a webhook interface to ingest upstream edge security events and support dry-run simulation mode for local/testing environments. |
| **Files** | `src/lib/security/edge-firewall-dispatcher.ts` [NEW] · `src/lib/security/waf-adapters/cloudflare.ts` [NEW] · `src/lib/security/waf-adapters/aws-waf.ts` [NEW] · `src/app/api/webhooks/edge-security/route.ts` [NEW] · `src/lib/__tests__/security/edge-firewall-dispatcher.test.ts` [NEW] |
| **Dependencies** | AGS-006, AGS-007 |
| **Acceptance Criteria** | (1) Dispatches async Cloudflare IP Access Rule API mutations upon quarantine creation. (2) Dispatches AWS WAF IP Set update requests with retry and exponential backoff. (3) Configurable `EDGE_WAF_PROVIDER` (`cloudflare` | `aws` | `mock` | `none`). (4) Ingests upstream WAF challenge failure events via `/api/webhooks/edge-security` with HMAC signature validation. (5) Unit tests verify accurate payload construction and mock API responses. |
| **Verification Method** | `pnpm test --testPathPattern=edge-firewall-dispatcher` — all tests green. Mock dispatch verifies correct API contracts. |
| **Estimated Complexity** | Medium |

---

### Phase 3 — Synthetic Canary Health Probes & Adaptive Circuit Breaker

#### AGS-009 — Synthetic Canary Health Probe Subsystem

| Field | Value |
|-------|-------|
| **Task ID** | AGS-009 |
| **Phase** | Phase 3 — Synthetic Canary Health Probes & Adaptive Circuit Breaker |
| **Description** | Implement an automated background synthetic probe runner that executes periodic health and latency probes against internal API endpoints and edge nodes. Probes measure p50, p95, p99 gateway latency, Redis rate limiter response time, and edge revocation mesh responsiveness. |
| **Files** | `src/lib/security/canary-probes.ts` [NEW] · `src/lib/security/synthetic-runner.ts` [NEW] · `src/lib/__tests__/security/canary-probes.test.ts` [NEW] |
| **Dependencies** | AGS-001, AGS-002, AGS-004 |
| **Acceptance Criteria** | (1) Executes lightweight synthetic requests every 10 seconds against canary routes. (2) Measures gateway processing latency with microsecond precision. (3) Detects latency spikes (> 50ms) or error rate surges (> 1%). (4) Emits probe status events to internal event bus. (5) Zero production data contamination (canary requests tagged with `X-Synthetic-Probe: true`). |
| **Verification Method** | `pnpm test --testPathPattern=canary-probes` — unit tests verifying runner scheduling, metric capture, and alert triggers. |
| **Estimated Complexity** | Medium |

---

#### AGS-010 — Edge Mesh Circuit Breaker & Graceful Degraded Mode Controller

| Field | Value |
|-------|-------|
| **Task ID** | AGS-010 |
| **Phase** | Phase 3 — Synthetic Canary Health Probes & Adaptive Circuit Breaker |
| **Description** | Build an adaptive circuit breaker that monitors system health signals from canary probes (AGS-009) and rate limit metrics. When system is under severe load or DDoS conditions (p99 latency > 200ms or error rate > 5%), trip the circuit breaker into `DEGRADED` or `SHEDDING` mode to shed unauthenticated/low-priority traffic while preserving critical ERP operations. |
| **Files** | `src/lib/security/circuit-breaker.ts` [NEW] · `src/lib/security/degraded-mode.ts` [NEW] · `src/lib/__tests__/security/circuit-breaker.test.ts` [NEW] |
| **Dependencies** | AGS-009 |
| **Acceptance Criteria** | (1) 3-state state machine: `CLOSED` (normal), `OPEN` (shedding non-critical), `HALF_OPEN` (recovering). (2) In `OPEN` state, immediately sheds public queries with `503 Service Unavailable (Degraded Mode)` while allowing authenticated staff requests. (3) Automatic transition back to `CLOSED` after consecutive successful canary probes. (4) Manual admin trip/reset controls. (5) Unit tests verify state machine transitions under simulated error/latency thresholds. |
| **Verification Method** | `pnpm test --testPathPattern=circuit-breaker` — all tests green. Test state machine transitions under simulated probe failure triggers. |
| **Estimated Complexity** | Medium-High |

---

#### AGS-011 — k6 DDoS Burst Simulation & Load Test Harness

| Field | Value |
|-------|-------|
| **Task ID** | AGS-011 |
| **Phase** | Phase 3 — Synthetic Canary Health Probes & Adaptive Circuit Breaker |
| **Description** | Author comprehensive k6 performance and attack simulation scripts. Create test scenarios for: (1) 1,000 RPS distributed DDoS burst, (2) Credential stuffing attack on auth endpoints, (3) DPoP replay storm testing, and (4) Subnet-wide scraping attack. Verify gateway stability, circuit-breaker tripping, and IP quarantine auto-activation. |
| **Files** | `k6/ddos-burst-simulation.js` [NEW] · `k6/gateway-rate-limit-load.js` [NEW] · `k6/credential-stuffing-simulation.js` [NEW] · `scripts/security/run-attack-simulation.ts` [NEW] |
| **Dependencies** | AGS-004, AGS-006, AGS-010 |
| **Acceptance Criteria** | (1) `ddos-burst-simulation.js` executes 1,000+ RPS sustained burst with 0% unhandled 500 errors. (2) Rate limiting smoothly throttles excess traffic with 429 responses in < 1ms. (3) Credential stuffing simulation triggers IP quarantine after 5 failed attempts per simulated IP. (4) DPoP replay simulation triggers immediate quarantine and audit log event. (5) Script outputs structured JSON performance report. |
| **Verification Method** | Execute `k6 run k6/gateway-rate-limit-load.js` against local test server; verify p95 latency < 50ms and 100% accurate 429 / 403 enforcement. |
| **Estimated Complexity** | Medium |

---

### Phase 4 — Admin Threat Shield Radar & Security Telemetry

#### AGS-012 — Admin Threat Shield Radar API Endpoints

| Field | Value |
|-------|-------|
| **Task ID** | AGS-012 |
| **Phase** | Phase 4 — Admin Threat Shield Radar & Security Telemetry |
| **Description** | Develop the backend API routes for the Admin Threat Shield Radar under `/api/admin/security/gateway`. Provide endpoints for real-time traffic statistics, active IP quarantines list, manual quarantine creation, manual unban/allowlisting, circuit-breaker manual override, and reputation inspection. Secure with `system:security:view` and `system:security:manage` permissions. |
| **Files** | `src/app/api/admin/security/gateway/stats/route.ts` [NEW] · `src/app/api/admin/security/gateway/quarantines/route.ts` [NEW] · `src/app/api/admin/security/gateway/override/route.ts` [NEW] · `src/lib/validation/gateway-schemas.ts` [NEW] · `src/lib/__tests__/security/gateway-api.test.ts` [NEW] |
| **Dependencies** | AGS-006, AGS-007, AGS-010 |
| **Acceptance Criteria** | (1) `GET /api/admin/security/gateway/stats` returns real-time traffic volume, 429 count, quarantined IP count, and circuit breaker status. (2) `GET /api/admin/security/gateway/quarantines` returns paginated list of active bans with reason and expiration. (3) `POST /quarantines` and `DELETE /quarantines/[id]` handle manual ban and unban. (4) Validated with Zod schemas in `gateway-schemas.ts`. (5) RBAC strictly enforced via `requireAuth`. (6) All endpoints covered by Jest integration tests. |
| **Verification Method** | `pnpm test --testPathPattern=gateway-api` — all route handler tests pass with 200, 400, 401, 403 assertion paths. |
| **Estimated Complexity** | Medium |

---

#### AGS-013 — Admin Threat Shield Radar Dashboard UI

| Field | Value |
|-------|-------|
| **Task ID** | AGS-013 |
| **Phase** | Phase 4 — Admin Threat Shield Radar & Security Telemetry |
| **Description** | Build the real-time visual dashboard at `src/app/(shell)/admin/security/gateway/page.tsx`. Include live traffic volume charts, rate-limit consumption heatmaps by role and route, active IP quarantines table with 1-click unban and manual IP ban dialog, circuit-breaker status badge with manual emergency toggle, and 10-second polling refresh with live pulse indicator. |
| **Files** | `src/app/(shell)/admin/security/gateway/page.tsx` [NEW] · `src/components/security/gateway-stats-cards.tsx` [NEW] · `src/components/security/quarantine-table.tsx` [NEW] · `src/components/security/circuit-breaker-toggle.tsx` [NEW] · `src/components/security/manual-quarantine-dialog.tsx` [NEW] · `src/lib/hooks/use-gateway-radar.ts` [NEW] |
| **Dependencies** | AGS-012 |
| **Acceptance Criteria** | (1) Renders at `/admin/security/gateway` with zero layout regressions. (2) Displays 4 core metrics: Total Requests, Throttled (429), Active Quarantines, Gateway Status (Normal/Degraded). (3) Interactive quarantine table supporting search, filtering, and 1-click unban. (4) Manual ban dialog with IP, CIDR subnet, reason, and duration options. (5) Accessible according to WCAG 2.1 AA (0 violations). (6) Uses UI components from `src/components/ui/` with proper Skeletons. |
| **Verification Method** | Playwright E2E test verifying dashboard rendering, metric cards, quarantine table interactions, and manual unban flow. |
| **Estimated Complexity** | High (UI & Real-time Visualization) |

---

#### AGS-014 — Gateway Security Metrics & Prometheus Telemetry Registry

| Field | Value |
|-------|-------|
| **Task ID** | AGS-014 |
| **Phase** | Phase 4 — Admin Threat Shield Radar & Security Telemetry |
| **Description** | Define and register 12+ Prometheus OpenMetrics for gateway security observability. Include metrics for: rate limit evaluations, 429 rejections by route and tenant, IP reputation distribution, quarantine additions/removals, canary probe latency histograms (p50, p95, p99), and circuit breaker state changes. Expose via the existing metrics registry. |
| **Files** | `src/lib/security/gateway-metrics.ts` [NEW] · `src/lib/metrics/registry.ts` [MODIFY — register gateway metrics] · `src/lib/__tests__/security/gateway-metrics.test.ts` [NEW] |
| **Dependencies** | AGS-001, AGS-006, AGS-009, AGS-010 |
| **Acceptance Criteria** | (1) Metrics exported: `gateway_requests_total`, `gateway_ratelimit_violations_total`, `gateway_ip_quarantines_active`, `gateway_canary_probe_duration_seconds`, `gateway_circuit_breaker_state`, `gateway_threat_score_distribution`. (2) Clean Prometheus OpenMetrics formatting. (3) Correct label dimensions (`tenant`, `route_category`, `role`, `reason`). (4) Unit tests verify counter increments, gauge updates, and histogram observations. |
| **Verification Method** | `pnpm test --testPathPattern=gateway-metrics` — all tests green. `GET /api/metrics` includes all `gateway_*` metric series. |
| **Estimated Complexity** | Low-Medium |

---

#### AGS-015 — Tamper-Proof Merkle Audit Log Integration for Gateway Threat Events

| Field | Value |
|-------|-------|
| **Task ID** | AGS-015 |
| **Phase** | Phase 4 — Admin Threat Shield Radar & Security Telemetry |
| **Description** | Integrate the API gateway security events with the Sprint-036 Cryptographic Audit Log and Merkle Tree verification subsystem (`src/lib/audit/merkle-tree.ts`). Pipe 8 new threat event types: `GATEWAY_RATE_LIMIT_EXCEEDED`, `GATEWAY_IP_QUARANTINED`, `GATEWAY_IP_UNBANNED`, `GATEWAY_SUBNET_CONTAINED`, `GATEWAY_CIRCUIT_BREAKER_TRIPPED`, `GATEWAY_CIRCUIT_BREAKER_RESET`, `GATEWAY_WAF_DISPATCH_FAILED`, `GATEWAY_DEGRADED_MODE_ENTERED`. |
| **Files** | `src/lib/security/threat-audit-events.ts` [NEW] · `src/lib/audit/audit-event-types.ts` [MODIFY — add gateway event types] · `src/lib/__tests__/security/threat-audit-events.test.ts` [NEW] |
| **Dependencies** | AGS-006, AGS-010 |
| **Acceptance Criteria** | (1) All 8 gateway threat event types declared with typed payload structures. (2) Emits audit records with SHA-256 Merkle leaf calculation and tenant isolation. (3) `pnpm compliance:scan` verifies 100% compliance audit coverage across all gateway mutation endpoints. (4) Cryptographic audit verification (`pnpm compliance:verify`) passes with 100% chain integrity. (5) Unit tests verify payload serialization and audit chaining. |
| **Verification Method** | `pnpm test --testPathPattern=threat-audit-events` — all tests pass. `pnpm compliance:verify` confirms unbroken Merkle audit chain. |
| **Estimated Complexity** | Medium |

---

### Phase 5 — Quality Gate, Verification, Technical Debt & Runbooks

#### AGS-016 — CI/CD Security Gate & Gateway Coverage Scanner AST Tool

| Field | Value |
|-------|-------|
| **Task ID** | AGS-016 |
| **Phase** | Phase 5 — Quality Gate, Verification, Technical Debt & Runbooks |
| **Description** | Build an AST-based static scanner `scripts/security/gateway-coverage-scanner.ts` callable via `pnpm gateway:scan`. Scan all API routes in `src/app/api/` and assert that all sensitive mutation and query handlers are decorated with `withRateLimit`. Integrate into GitHub Actions security workflow. |
| **Files** | `scripts/security/gateway-coverage-scanner.ts` [NEW] · `.github/workflows/gateway-security-gate.yml` [NEW] · `package.json` [MODIFY — add `gateway:scan` script] |
| **Dependencies** | AGS-004 |
| **Acceptance Criteria** | (1) AST parser inspects every `route.ts` file under `src/app/api/`. (2) Flags any endpoint missing `withRateLimit` decoration. (3) Exits with status code 1 if unshielded routes are detected; 0 when 100% compliant. (4) GitHub Actions workflow `.github/workflows/gateway-security-gate.yml` runs scanner on every PR. (5) `pnpm gateway:scan` passes cleanly with 0 violations. |
| **Verification Method** | Execute `pnpm gateway:scan` — exits with 0 and prints 100% gateway route coverage. Test against temporary unshielded dummy route to verify exit 1. |
| **Estimated Complexity** | Medium |

---

#### AGS-017 — Technical Debt Resolution: Staging Load Execution (TD-010) & FIDO2 Attestation Validator (TD-011)

| Field | Value |
|-------|-------|
| **Task ID** | AGS-017 |
| **Phase** | Phase 5 — Quality Gate, Verification, Technical Debt & Runbooks |
| **Description** | Resolve outstanding tracked technical debt items: (1) **TD-010**: Execute authored Playwright E2E and k6 load tests against staging cluster verifying sub-millisecond rate limiter performance and multi-node synchronization; (2) **TD-011**: Implement WebAuthn FIDO2 Attestation Statement validator verifying CBOR `fmt: 'packed' | 'none' | 'android-key' | 'fido-u2f'` on credential registration. |
| **Files** | `src/lib/identity/webauthn-attestation.ts` [NEW] · `src/lib/identity/webauthn-service.ts` [MODIFY] · `src/lib/__tests__/identity/webauthn-attestation.test.ts` [NEW] · `.ai/PROJECT_STATUS.md` [MODIFY — mark TD-010 and TD-011 resolved] |
| **Dependencies** | AGS-011 |
| **Acceptance Criteria** | (1) WebAuthn attestation statement parser unpacks CBOR statement and verifies authenticator cert/signature or `none` format. (2) Full Jest unit test suite for attestation validator (packed, none, invalid formats). (3) TD-010 validated via k6 automated staging execution report. (4) `.ai/PROJECT_STATUS.md` updated marking TD-010 and TD-011 as resolved. (5) Zero TypeScript or lint errors. |
| **Verification Method** | `pnpm test --testPathPattern=webauthn-attestation` — all unit tests pass. Review updated `PROJECT_STATUS.md`. |
| **Estimated Complexity** | Medium |

---

#### AGS-018 — Operational Runbooks & Architecture Documentation

| Field | Value |
|-------|-------|
| **Task ID** | AGS-018 |
| **Phase** | Phase 5 — Quality Gate, Verification, Technical Debt & Runbooks |
| **Description** | Author 5 comprehensive, production-ready operational runbooks in `docs/` and update AIOS documentation (`FEATURES.md`, `CHANGELOG.md`, `PROJECT_STATUS.md`). |
| **Files** | `docs/rate-limiting-configuration-guide.md` [NEW] · `docs/ip-quarantine-threat-mitigation.md` [NEW] · `docs/ddos-simulation-canary-ops.md` [NEW] · `docs/api-gateway-firewall-integration.md` [NEW] · `docs/threat-shield-radar-ops.md` [NEW] · `.ai/FEATURES.md` [MODIFY] · `.ai/CHANGELOG.md` [MODIFY] · `.ai/PROJECT_STATUS.md` [MODIFY] |
| **Dependencies** | All preceding tasks (AGS-001 through AGS-017) |
| **Acceptance Criteria** | (1) `rate-limiting-configuration-guide.md` documents sliding-window tuning, role quotas, and adaptive risk thresholds. (2) `ip-quarantine-threat-mitigation.md` details reputation weights, automatic subnet containment, and manual unban procedures. (3) `ddos-simulation-canary-ops.md` explains canary probe calibration and k6 DDoS burst execution. (4) `api-gateway-firewall-integration.md` covers Cloudflare / AWS WAF webhook integration. (5) `threat-shield-radar-ops.md` guides operators through dashboard navigation. (6) AIOS docs updated. |
| **Verification Method** | File existence and completeness check. All docs present, formatted according to AIOS standards. |
| **Estimated Complexity** | Low-Medium |

---

## 4. Architecture & Design Considerations

```
                                  [ INCOMING REQUEST ]
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │      IP Quarantine Check     │ ◄── (Local Bloom Filter + Redis)
                            │   Is IP / Subnet Quarantined?│
                            └──────────────┬───────────────┘
                                           │ NO (Allowed)
                                           ▼
                            ┌──────────────────────────────┐
                            │    Edge Circuit Breaker      │ ◄── (Canary Probe Latency & Error Signals)
                            │   System in Degraded Mode?   │
                            └──────────────┬───────────────┘
                                           │ Normal / Bypass
                                           ▼
                            ┌──────────────────────────────┐
                            │    Adaptive Rate Limiter     │
                            │ ─ Redis Sliding Window       │
                            │ ─ Compound Key:              │
                            │   tenant:role:dpopJkt:route  │ ◄── (Sprint-037 Continuous Risk Score)
                            │ ─ Dynamic Quota Scaling      │
                            └──────────────┬───────────────┘
                                           │ Under Limit
                                           ▼
                            ┌──────────────────────────────┐
                            │     requireAuth & withDPoP   │ (Sprint-037 Cryptographic Verification)
                            └──────────────┬───────────────┘
                                           │ Valid Session
                                           ▼
                            ┌──────────────────────────────┐
                            │       API Route Handler      │
                            └──────────────┬───────────────┘
                                           │ Response + Telemetry
                                           ▼
         ┌─────────────────────────────────┴─────────────────────────────────┐
         │                                                                   │
         ▼                                                                   ▼
┌─────────────────────────────────┐                         ┌─────────────────────────────────┐
│     Prometheus OpenMetrics      │                         │    Tamper-Proof Merkle Audit    │
│  `gateway_ratelimit_violations` │                         │  `GATEWAY_RATE_LIMIT_EXCEEDED`  │
│  `gateway_ip_quarantines`       │                         │  `GATEWAY_IP_QUARANTINED`       │
│  `gateway_canary_probe_latency` │                         │  `GATEWAY_CIRCUIT_TRIPPED`      │
└─────────────────────────────────┘                         └─────────────────────────────────┘
```

### Key Architectural Principles
1. **Zero-Latency In-Memory Fast Path:** Non-quarantined requests pass through an in-memory Bloom filter in < 0.05ms without incurring any database or Redis lookups.
2. **Sub-Millisecond Distributed Limiting:** Redis operations utilize atomic Lua scripts with pipelining, ensuring single-request rate limit evaluation adds < 1ms to API response time.
3. **Resilient Local Fallback:** In the event of a Redis cluster partition or failure, the gateway seamlessly fails over to local in-memory sliding-window caches within 50ms, maintaining platform availability.
4. **Zero-Trust Identity Fusion:** Quotas dynamically adapt to the cryptographic identity and continuous trust scores established in Sprint-037, granting full throughput to verified low-risk users while throttling suspicious traffic.
5. **Defense-in-Depth Upstream Sync:** Quarantined IPs are automatically synchronized with upstream edge firewalls (Cloudflare / AWS WAF), dropping malicious traffic at the network edge before reaching application servers.

---

## 5. Technical Debt Resolution

| Debt ID | Description | Severity | Planned Resolution |
| :--- | :--- | :--- | :--- |
| **TD-010** | Staging Cluster Load & E2E Test Execution | Low | Executed as part of AGS-011 and AGS-017 under simulated high-throughput DDoS scenarios. |
| **TD-011** | WebAuthn Attestation Statement Validator | Low | Implemented in AGS-017 via `src/lib/identity/webauthn-attestation.ts` supporting CBOR packed, none, and android-key formats. |
| **TD-012** | Strict Legacy Token Deprecation Enforcement | Low | Tracked for future deprecation sprint after migration metrics reach 100% DPoP adoption across tenants. |

---

## 6. File Manifest

### New Files to Create

```
src/lib/security/
├── rate-limiter.ts
├── sliding-window.ts
├── rate-limit-types.ts
├── rate-limit-redis.ts
├── rate-limit-fallback.ts
├── adaptive-limiter.ts
├── quota-resolver.ts
├── rate-limit-middleware.ts
├── ip-reputation.ts
├── threat-heuristics.ts
├── quarantine-manager.ts
├── quarantine-store.ts
├── quarantine-mesh.ts
├── quarantine-bloom.ts
├── edge-firewall-dispatcher.ts
├── canary-probes.ts
├── synthetic-runner.ts
├── circuit-breaker.ts
├── degraded-mode.ts
├── gateway-metrics.ts
├── threat-audit-events.ts
├── index.ts
└── waf-adapters/
    ├── cloudflare.ts
    └── aws-waf.ts

src/lib/identity/
└── webauthn-attestation.ts

src/lib/validation/
└── gateway-schemas.ts

src/app/api/admin/security/gateway/
├── stats/route.ts
├── quarantines/route.ts
└── override/route.ts

src/app/api/webhooks/edge-security/
└── route.ts

src/app/(shell)/admin/security/gateway/
└── page.tsx

src/components/security/
├── gateway-stats-cards.tsx
├── quarantine-table.tsx
├── circuit-breaker-toggle.tsx
└── manual-quarantine-dialog.tsx

src/lib/hooks/
└── use-gateway-radar.ts

src/lib/__tests__/security/
├── rate-limiter.test.ts
├── rate-limit-redis.test.ts
├── rate-limit-fallback.test.ts
├── adaptive-limiter.test.ts
├── rate-limit-middleware.test.ts
├── ip-reputation.test.ts
├── quarantine-manager.test.ts
├── quarantine-mesh.test.ts
├── edge-firewall-dispatcher.test.ts
├── canary-probes.test.ts
├── circuit-breaker.test.ts
├── gateway-api.test.ts
├── gateway-metrics.test.ts
└── threat-audit-events.test.ts

src/lib/__tests__/identity/
└── webauthn-attestation.test.ts

scripts/security/
├── gateway-coverage-scanner.ts
└── run-attack-simulation.ts

k6/
├── ddos-burst-simulation.js
├── gateway-rate-limit-load.js
└── credential-stuffing-simulation.js

.github/workflows/
└── gateway-security-gate.yml

docs/
├── rate-limiting-configuration-guide.md
├── ip-quarantine-threat-mitigation.md
├── ddos-simulation-canary-ops.md
├── api-gateway-firewall-integration.md
└── threat-shield-radar-ops.md
```

### Existing Files to Modify

```
src/db/schema.ts                       (add ip_quarantines and ip_allowlist tables)
src/lib/metrics/registry.ts            (register gateway Prometheus OpenMetrics)
src/lib/audit/audit-event-types.ts      (register 8 new gateway threat event types)
src/lib/identity/webauthn-service.ts   (integrate FIDO2 attestation validator)
package.json                           (add gateway:scan and test:ddos scripts)
.ai/FEATURES.md                        (document Sprint-038 gateway features)
.ai/CHANGELOG.md                       (document v3.22.0 release changes)
.ai/PROJECT_STATUS.md                  (update status, active sprint, resolved debt)
```

---

## 7. Risk Register

| Risk ID | Category | Description | Probability | Impact | Mitigation |
|---------|----------|-------------|-------------|--------|------------|
| **R-001** | Infrastructure | Redis cluster outage impacts rate limit enforcement latency | Medium | High | Implement resilient local in-memory fallback (`LocalFallbackStore`) activating within 50ms with automatic resync on recovery. |
| **R-002** | Security / UX | False positive rate limiting on legitimate high-volume staff workflows | Medium | High | Compound keys incorporate staff role tiers with generous quotas; adaptive risk engine only tightens limits when trust score is degraded. |
| **R-003** | Security / UX | Shared NAT/proxy IP quarantine blocks multiple legitimate users | Medium | Medium | Automated subnet quarantine requires >= 3 distinct attacking IPs; time-bounded expirations (15m default); admin 1-click unban and allowlist override. |
| **R-004** | Performance | Rate limiting evaluation adds > 1ms latency to critical ERP requests | Low | High | Pipelined atomic Lua scripts; in-memory Bloom filter for instant quarantine checks (< 0.05ms); validated via k6 load test gate. |
| **R-005** | Integration | Upstream WAF API rate limits or network failures during quarantine dispatch | Medium | Low | Non-blocking async queue with exponential backoff and retry; local in-platform quarantine enforcement functions independently of upstream WAF. |
| **R-006** | Operational | Canary probes generate false positive alert storms under transient network jitter | Low | Medium | Canary alerts require 3 consecutive failed probe windows before tripping circuit breaker into degraded mode. |
| **R-007** | Compliance | Merkle audit trail corruption during rapid DDoS event logging | Low | High | Asynchronous batched leaf hashing into SHA-256 Merkle chain with mutex locking on root tree updates. |

---

## 8. Rollback Plan

### Rollback Trigger Conditions
- Rate limiting evaluation adds > 20ms p95 latency to API requests in production.
- False positive rate exceeds 1% of total legitimate authenticated transactions.
- Redis fallback fails to maintain local rate limiting during connection drops.
- Critical unhandled exception or crash in `withRateLimit` route decorator.

### Rollback Procedure

**Step 1 — Global Feature Flag Deactivation (< 2 minutes)**
Disable rate limiting and quarantine enforcement immediately via environment configuration:
```bash
RATE_LIMIT_ENFORCEMENT_ENABLED=false
IP_QUARANTINE_ENFORCEMENT_ENABLED=false
GATEWAY_CIRCUIT_BREAKER_ENABLED=false
```
All API handlers decorated with `withRateLimit` immediately pass requests directly to the underlying handler without executing rate limit or quarantine checks.

**Step 2 — Upstream WAF Bypass (< 5 minutes)**
Set `EDGE_WAF_PROVIDER=none` to halt all outbound synchronization requests to Cloudflare / AWS WAF.

**Step 3 — Database Schema Reversion (if required)**
If rolling back database migrations:
```bash
pnpm db:rollback --steps=1
```
Removes `ip_quarantines` and `ip_allowlist` tables. Safe to execute after Step 1 has disabled all gateway read/write operations.

**Step 4 — Verification of Restored Baseline**
1. `pnpm typecheck` → 0 errors
2. `pnpm test` → 100% pass rate across baseline test suites
3. `pnpm compliance:verify` → Merkle audit chain intact
4. Test login and ERP mutation endpoints → 200 OK without rate limit headers

---

## 9. Definition of Done

A Sprint-038 task is complete when **all** of the following criteria are satisfied:

### Code Quality & Standards
- [ ] `pnpm typecheck` passes with zero TypeScript errors across all workspaces
- [ ] `pnpm lint` passes with zero errors and zero new warnings
- [ ] No `console.log` statements in production source code (`src/`, `packages/`)
- [ ] No hardcoded secrets, API tokens, or disabled security checks
- [ ] All exported functions and interfaces contain comprehensive JSDoc annotations
- [ ] Strict adherence to Next.js App Router and ThaibaHive conventions in `AGENTS.md`

### Testing & Verification
- [ ] Unit tests written for every new module with >= 90% code coverage
- [ ] All Jest test suites pass: `pnpm test` → 100% pass rate (280+ suites)
- [ ] `pnpm compliance:scan` → 100% mutation audit coverage maintained
- [ ] `pnpm compliance:verify` → Cryptographic audit chain integrity intact
- [ ] `pnpm security:tenants` → 0 tenant isolation leaks
- [ ] `pnpm gateway:scan` → 100% API route rate-limiting coverage
- [ ] k6 DDoS simulation tests pass with p95 < 50ms under 1,000 RPS load

### Security & RBAC
- [ ] All new gateway API endpoints wrapped with `requireAuth` and appropriate permissions
- [ ] Quarantined IPs strictly prevented from accessing any authenticated or mutation route
- [ ] Quotas partitioned by tenant, role, and DPoP device thumbprint
- [ ] Zero cross-tenant leakage in quarantine management APIs

### Documentation & Governance
- [ ] All 5 operational runbooks created in `docs/`
- [ ] `.ai/FEATURES.md` updated with Sprint-038 feature entries
- [ ] `.ai/CHANGELOG.md` updated with v3.22.0 release notes
- [ ] `.ai/PROJECT_STATUS.md` updated reflecting v3.22.0 and technical debt resolutions
- [ ] `.ai/execution/Sprint-038-Execution-Log.md` created tracking all 18 tasks

---

## 10. Verification Plan Summary

| Verification Type | Command / Method | Pass Threshold |
|-------------------|-----------------|----------------|
| **TypeScript** | `pnpm typecheck` | 0 errors |
| **Linting** | `pnpm lint` | 0 errors, 0 new warnings |
| **Unit Tests** | `pnpm test` | 100% pass (280+ suites) |
| **Gateway Coverage Gate** | `pnpm gateway:scan` | Exit 0, 100% decorated routes |
| **Compliance Audit Scan** | `pnpm compliance:scan` | 100% mutation coverage |
| **Audit Chain Integrity** | `pnpm compliance:verify` | 100% Merkle chain integrity |
| **Tenant Isolation** | `pnpm security:tenants` | 0 leaks across all files |
| **E2E — Chromium** | `pnpm test:e2e --project=chromium` | 100% pass |
| **E2E — Firefox** | `pnpm test:e2e --project=firefox` | 100% pass |
| **E2E — WebKit** | `pnpm test:e2e --project=webkit` | 100% pass |
| **Load — Rate Limiter** | `k6 run k6/gateway-rate-limit-load.js` | p95 < 50ms; accurate 429 throttling |
| **Load — DDoS Burst** | `k6 run k6/ddos-burst-simulation.js` | 1,000 RPS; 0 unhandled 500 errors |
| **Accessibility** | axe-core on Admin Threat Radar UI | 0 WCAG 2.1 AA violations |
| **FIDO2 Attestation** | `pnpm test --testPathPattern=webauthn-attestation` | 100% pass (packed/none formats) |

---

## 11. Sprint Metadata

| Field | Value |
|-------|-------|
| **Sprint ID** | SPRINT-038 |
| **Sprint Name** | Distributed Adaptive Rate Limiting, API Gateway Security Shield & Intelligent Threat Mitigation |
| **Target Release Version** | v3.22.0 |
| **Total Tasks** | 18 (AGS-001 through AGS-018) |
| **Estimated Duration** | 10–12 engineering days |
| **Estimated Complexity** | Large / High |
| **Predecessor Sprint** | SPRINT-037 (v3.21.0 — Zero-Trust Edge Identity Mesh) |
| **Successor Artifact** | `.ai/execution/Sprint-038-Execution-Log.md` |
| **Release Artifact** | `.ai/releases/Release-Sprint-038.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-19*  
*ThaibaHive Institution OS — Sprint-038 v3.22.0 Planning*
