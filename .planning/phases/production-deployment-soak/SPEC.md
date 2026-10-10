# Phase Specification: Production Deployment & Staging Soak (`v3.38.0`)

## 1. Executive Summary & Objectives
With the release of **v3.38.0** (incorporating Phase 8 AI Copilot V2 and Phase 9 Hardware Radar & IoT Mesh), the ThaibaHive platform incorporates high-frequency hardware telemetry ingestion (target: 5,000+ packets/sec), duplex WebSocket audio streaming for Voice Copilot, pgvector HNSW vector indexing, sub-50ms turnstile access verification with anti-passback state machines, and AES-256-GCM edge biometric mesh.

This operational milestone establishes production-grade deployment manifests, Helm charts with Argo Rollouts support, k6 soak test suites, Prometheus SLO alerting rules, timing-safe cryptographic optimizations, multi-row bulk database writes, and progressive canary rollouts (5% → 25% → 50% → 100%).

---

## 2. Architecture & Container Strategy

### 2.1 Multi-Stage Production Dockerfile (`Dockerfile`)
- **Base**: `node:20-alpine` with build essentials for cryptographic and numeric operations.
- **Stage 1 (`deps`)**: Installs dependencies with `pnpm install --frozen-lockfile`.
- **Stage 2 (`builder`)**: Compiles TypeScript, Next.js 16 App Router bundle with standalone output mode (`output: 'standalone'`), optimizing dynamic chunks.
- **Stage 3 (`runner`)**: Minimal non-root `nextjs:nodejs` (UID 1001) runner image, with environment validation, health check probe endpoints (`/api/health`), and graceful shutdown signal traps (`SIGTERM`/`SIGINT`).
- **Runtime Optimization**: `NODE_OPTIONS: "--max-old-space-size=3072"` ensuring V8 garbage collection fires well within the 4Gi cgroup memory ceiling.

### 2.2 Helm Chart Architecture (`charts/thaibahive-web`)
- **Horizontal Pod Autoscaler (HPA)**: Min 3, Max 15 replicas, scaling on CPU (>70%), Memory (>75%), with `stabilizationWindowSeconds: 300` on scale-down to prevent persistent WebSocket flapping.
- **Pod Disruption Budget (PDB)**: `maxUnavailable: 1` to guarantee zero-downtime rolling upgrades and node drains.
- **Termination Grace Period**: `terminationGracePeriodSeconds: 60` enabling `TelemetryIngestionWorker` to flush all in-memory buffers and close WebSockets cleanly with standard code 1001.
- **Ingress NGINX Configuration**:
  - `nginx.ingress.kubernetes.io/proxy-buffering: "off"` (disables chunk buffering for duplex voice & SSE).
  - `nginx.ingress.kubernetes.io/proxy-http-version: "1.1"`
  - `nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"`
  - `nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"`
  - `nginx.ingress.kubernetes.io/proxy-body-size: "50m"`
- **Resource Allocations**:
  - `requests`: `cpu: 500m`, `memory: 1Gi`
  - `limits`: `cpu: 2000m`, `memory: 4Gi`

### 2.3 Secret Mounting Specification
- Mount sensitive keys as read-only volume files into a memory-backed filesystem (`tmpfs` under `/run/secrets/thaibahive/`) with strict Linux permissions (`defaultMode: 0400`, UID 1001):
  - `/run/secrets/crypto/biometric.key`
  - `/run/secrets/certs/device-root-ca.crt`
  - `/run/secrets/auth/jwt-secret.key`
- Eliminates cleartext environment variable leaks to child processes or unhandled error dumps.

### 2.4 High-Throughput Database & Ingestion Optimization
- **Multi-Row Bulk Batch SQL**: Refactor `TelemetryIngestionWorker.flushBatch()` to execute single multi-row `db.insert(hardwareTelemetryLogs).values(chunk)` statements in 100-row chunks instead of loop single-row queries.
- **PgBouncer Connection Pool Tuning**:
  - `pool_mode = transaction`
  - `default_pool_size = 50`, `reserve_pool_size = 15`, `max_client_conn = 1000`
  - `query_wait_timeout = 10s`, `server_idle_timeout = 60s`

### 2.5 Constant-Time & Low-Churn Cryptography
- **Timing-Safe Challenge Nonce Verification**: Use `crypto.timingSafeEqual` in `BiometricMeshEngine.verifyChallenge` to prevent side-channel timing attacks on HMAC signatures.
- **Pre-Derived Key Caching**: Cache the SHA-256 derived 32-byte AES key buffer at module initialization, eliminating per-operation garbage collection allocations at 500 RPS.

---

## 3. K6 Soak & Load Simulation Suites

### 3.1 Hardware Telemetry Soak (`k6/hardware-telemetry-soak.js`)
- **Target Load**: 5,000+ IoT telemetry packets/sec across 100 simulated BLE anchor gateways and smart turnstiles.
- **Lifecycle**: 5m ramp-up → 30m soak → 5m 2x burst spike → 5m recovery.
- **Endpoints Tested**: `POST /api/hardware/telemetry/ingest`, `POST /api/hardware/telemetry/heartbeat`.
- **Thresholds**:
  - `http_req_duration`: p(95) < 80ms, p(99) < 150ms.
  - `http_req_failed`: < 0.01% (error rate < 1 in 10,000).

### 3.2 Voice Copilot & Real-Time Mesh Soak (`k6/voice-copilot-soak.js`)
- **Target Load**: 500 concurrent WebSocket connections maintaining audio ping/pong and 50 turns/sec.
- **Endpoints Tested**: `GET /api/ai/copilot/voice/interact`, `/api/chat/sse`.
- **Thresholds**:
  - `ws_session_duration`: 100% stable without unexpected closure.
  - Turn-around latency p(95) < 300ms.

### 3.3 Smart Turnstile Gate & Anti-Passback Load (`k6/gate-access-load.js`)
- **Target Load**: 500 concurrent badge swipe transits per second during peak campus morning muster rush.
- **Endpoints Tested**: `POST /api/hardware/access-control/verify`.
- **Thresholds**:
  - `http_req_duration`: p(95) < 50ms, p(99) < 100ms.
  - Zero false-positive Anti-Passback violations on valid transit sequences.

### 3.4 Hybrid RAG & Embedding Query Load (`k6/rag-hybrid-query-soak.js`)
- **Target Load**: 200 RPS vector + keyword hybrid search queries.
- **Endpoints Tested**: `POST /api/ai/rag/query`.
- **Thresholds**:
  - `http_req_duration`: p(95) < 250ms with HNSW indexing.

---

## 4. Observability & SLO Quality Gates

| Metric | Target SLO | PromQL Alert Condition |
|---|---|---|
| **API P95 Latency** | < 100ms | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[2m])) by (le)) > 0.1` |
| **API 5xx Error Rate** | < 0.1% | `sum(rate(http_requests_total{status=~"5.."}[2m])) / sum(rate(http_requests_total[2m])) > 0.001` |
| **WebSocket Drop Rate** | < 0.05% | `sum(rate(websocket_abnormal_closures_total[2m])) / sum(rate(websocket_connections_total[2m])) > 0.0005` |
| **Telemetry Buffer Lag** | < 500 items | `hardware_telemetry_buffer_size > 500` for 1m |
| **Database Pool Utilization** | < 80% | `pg_stat_activity_count / pg_max_connections > 0.8` |
| **Node.js Event Loop Lag** | < 50ms | `nodejs_eventloop_lag_seconds_p95 > 0.05` |

---

## 5. ArgoCD Progressive Canary Strategy & Rollback Safety

### 5.1 Canary Schedule
- **Phase 1 (5% Traffic, 15m)**: Initial canary smoke validation; evaluate `AnalysisTemplate`.
- **Phase 2 (25% Traffic, 30m)**: Medium load evaluation; verify PgBouncer and HPA response.
- **Phase 3 (50% Traffic, 30m)**: Heavy load evaluation; verify database replication and worker batching.
- **Phase 4 (100% Traffic)**: Full production promotion; scale down previous stable deployment.

### 5.2 Automated Rollback Triggers
- **AnalysisTemplate Conditions**: `failureLimit: 1`, `consecutiveErrorLimit: 3`.
- If 5xx error rate > 0.5% or P95 latency > 250ms for 60 consecutive seconds, Argo Rollouts halts traffic routing to canary and rolls back to `v3.37.0` within 30 seconds.

### 5.3 Expand-and-Contract Migration Compatibility
- All DDL migrations are strictly backward-compatible (all new columns nullable/defaulted).
- `v3.37.0` and `v3.38.0` pods can query the database concurrently without error during canary coexistence or rollback.
