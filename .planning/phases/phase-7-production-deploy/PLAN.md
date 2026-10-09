# Phase 7: Production Deployment & Staging Soak

**Milestone**: ThaibaHive v3.36.x — Production Hardened Release
**Branch**: `feat/phase-7-production-deploy`
**Base**: `v3.36.0` (Two-Tier Platform + Real-Time Messaging Mesh)

---

## 1. Executive Summary

This phase transitions the v3.36.0 feature-complete platform from "dev-ready" to "production-hardened" with containerized deployment, infrastructure-as-code, comprehensive observability, and load-validated staging soak. No new features — only operational excellence.

**Goal**: Zero-downtime production deployment capability with full rollback, telemetry, and incident response readiness.

---

## 2. Scope & Deliverables

### 2.1 Containerization (Week 1)

| Task | Description | Files |
|------|-------------|-------|
| **Multi-stage Dockerfile (Web)** | `Dockerfile.web` — Next.js 16 standalone + `node:20-alpine` runtime; WebSocket/SSE keep-alive (`proxy_read_timeout 3600`); non-root user; healthcheck endpoint | `Dockerfile.web` |
| **Multi-stage Dockerfile (Mobile API)** | `Dockerfile.mobile-api` — Shared Next.js runtime; `/api/mobile/**` routes; optional separate scaling | `Dockerfile.mobile-api` |
| **Nginx Reverse Proxy** | `nginx.conf` — TLS termination, WebSocket upgrade (`proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade`), rate limiting zones, CSP headers | `nginx.conf` |
| **Docker Compose (Local Stack)** | `docker-compose.yml` — web, nginx, postgres, redis, minio (S3), prometheus, grafana, loki | `docker-compose.yml` |
| **Docker Compose (CI)** | `docker-compose.ci.yml` — ephemeral test stack for `pnpm test:e2e` | `docker-compose.ci.yml` |

### 2.2 Kubernetes / Helm (Week 1-2)

| Component | Description |
|-----------|-------------|
| **Helm Chart: `thaibahive-web`** | Deployment (HPA: CPU 70%, memory 80%), Service (ClusterIP), Ingress (TLS, WebSocket annotations), ConfigMap, Secret, PodDisruptionBudget, NetworkPolicy |
| **Helm Chart: `thaibahive-db`** | StatefulSet (PostgreSQL 16 + pgbouncer), PVC, backup CronJob (pg_dump → S3), replication slots |
| **Helm Chart: `thaibahive-cache`** | Redis Cluster (6 nodes, 3 masters) or Valkey; sentinel for HA |
| **Helm Chart: `thaibahive-storage`** | MinIO (4 nodes, erasure coding) or S3-compatible; bucket policies |
| **Helm Chart: `thaibahive-observability`** | Prometheus (scrape configs), Grafana (dashboards), Loki (logs), Tempo (traces), Alertmanager |
| **ArgoCD ApplicationSet** | Multi-environment (staging, prod) with progressive delivery (canary via Flagger) |

### 2.3 Database Migration Pipeline (Week 1)

| Step | Description |
|------|-------------|
| **Pre-migration Checks** | `pnpm db:verify:columns` + `pnpm db:replica:check` + advisory lock acquisition |
| **Migration Execution** | `pnpm db:migrate` with transaction per migration; automated rollback on failure |
| **Post-migration Verification** | Row counts, index usage stats, query plan regression test |
| **Zero-Downtime Strategy** | Backward-compatible migrations only (additive columns, new tables); destructive ops in separate release |

### 2.4 Staging Soak & Load Test (Week 2)

| Test Suite | Tool | Target |
|------------|------|--------|
| **WebSocket Concurrency** | k6 (`scripts/load/ws-concurrency.js`) | 500 concurrent WS connections, 10k msg/min |
| **SSE Long-Poll Flood** | k6 (`scripts/load/sse-flood.js`) | 1000 concurrent SSE, 30min duration |
| **Search API Load** | k6 (`scripts/load/search-api.js`) | 200 RPS, p95 < 200ms |
| **FCM Aggregation Stress** | k6 (`scripts/load/fcm-aggregation.js`) | 10k notifications/min, batch window accuracy |
| **Database Connection Pool** | k6 (`scripts/load/db-pool.js`) | pgbouncer saturation, queue depth |
| **End-to-End Happy Path** | Playwright (`pnpm test:e2e`) | Login → Chat → Search → Offline sync → Reconnect |

### 2.5 Observability & Telemetry (Week 2)

| Component | Implementation |
|-----------|----------------|
| **Health Endpoints** | `/api/system/health` (liveness), `/api/system/health/ready` (readiness with DB/Redis/FCM checks) |
| **Metrics Export** | `/api/system/metrics` (Prometheus + JSON); custom metrics: `ws_connections_active`, `sse_connections_active`, `chat_messages_total`, `fcm_batch_latency_ms` |
| **Distributed Tracing** | OpenTelemetry JS SDK → Tempo; trace WS/SSE lifecycle, DB queries, FCM calls |
| **Structured Logging** | Pino JSON logs → Loki; correlation IDs across WS/SSE/HTTP |
| **Alert Rules** | `ws_connection_drop_rate > 5%`, `sse_reconnect_storm`, `db_pool_exhausted`, `fcm_delivery_latency_p99 > 10s` |

### 2.6 Incident Response & Runbooks (Week 2)

| Runbook | Trigger |
|---------|---------|
| **WebSocket Storm** | >1000 reconnections/min → drain connections, scale pods |
| **Database Pool Exhaustion** | pgbouncer wait_queue > 50 → read replica promotion, query kill |
| **FCM Quota Exceeded** | 429 from FCM → exponential backoff, local queue drain |
| **Schema Migration Failure** | Advisory lock timeout → manual rollback procedure |
| **Staging Soak Failure** | Any k6 threshold breach → auto-rollback ArgoCD |

---

## 3. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
                        PRODUCTION CLUSTER (EKS/GKE/AKS)
└────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
  INGRESS (NGINX) ── TLS Termination ── WebSocket/SSE Upgrade
  Rate Limiting: 100 req/s per IP, 10 WS/s per IP
└────────────────────────────────────────────────────────────────────┘
         │
    ┌────┴────┬──────────────────┬──────────────────────┐
    ▼         ▼                  ▼                      ▼
┌────────┐ ┌────────┐      ┌──────────┐           ┌──────────┐
│ Web Pod │ │ Web Pod │ ...  │ Web Pod  │           │ Web Pod  │
│ (HPA)   │ │ (HPA)   │      │ (HPA)    │           │ (HPA)    │
└────┬────┘ └────┬────┘      └────┬─────┘           └────┬─────┘
     │           │               │                      │
     └───────────┼───────────────┼──────────────────────┘
                 ▼               ▼
        ┌──────────────┐ ┌──────────────┐
        │  PostgreSQL  │ │    Redis     │
        │  (Primary)   │ │  (Cluster)   │
        │  + pgbouncer │ │  Pub/Sub     │
        └──────────────┘ └──────────────┘
                 │               │
                 ▼               ▼
        ┌──────────────┐ ┌──────────────┐
        │  Replica(s)  │ │  Sentinel    │
        │  (Read)      │ │  (HA)        │
        └──────────────┘ └──────────────┘
```

---

## 4. Verification Gates (All Must Pass)

| # | Gate | Command | Target |
|---|------|---------|--------|
| 1 | Docker Build | `docker build -f Dockerfile.web -t thaibahive-web .` | < 5min, < 500MB |
| 2 | Docker Security | `docker scan thaibahive-web` / `trivy` | 0 CRITICAL, 0 HIGH |
| 3 | Helm Lint | `helm lint charts/thaibahive-*` | 0 errors |
| 4 | Helm Template | `helm template staging charts/thaibahive-web` | Valid YAML |
| 5 | K8s Dry-Run | `kubectl apply --dry-run=client -f` | 0 errors |
| 6 | Staging Deploy | ArgoCD sync to `staging` namespace | All pods `Running` |
| 7 | Health Checks | `curl /api/system/health/ready` | 200 OK, all deps green |
| 8 | k6 Load Test | `k6 run scripts/load/*.js` | All thresholds met |
| 9 | Playwright E2E | `pnpm test:e2e` (staging URL) | 100% pass |
| 10 | Prometheus Scrapes | `curl /api/system/metrics` | All targets UP |
| 11 | Log Aggregation | Loki query `{app="thaibahive-web"}` | Logs flowing |
| 12 | Trace Sampling | Tempo query | Traces visible |
| 13 | Backup/Restore | `pnpm db:verify:restore` | < 30min RTO |
| 14 | Rollback Drill | ArgoCD rollback to prev version | < 5min |
| 15 | Disaster Recovery | `pnpm dr:drill` | RPO < 1hr, RTO < 4hr |

---

## 5. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| WebSocket connection limits on LB | Pre-warm connection pools; configure idle timeouts |
| PostgreSQL migration lock contention | Run migrations in maintenance window; advisory locks |
| FCM rate limits in staging | Use FCM test labels; mock FCM in CI |
| Redis memory pressure | Eviction policy `allkeys-lru`; monitor fragmentation |
| ArgoCD sync loops | `ignoreDifferences` for managed fields; proper finalizers |

---

## 6. Rollout Plan

| Phase | Environment | Validation | Rollback |
|-------|-------------|------------|----------|
| **Canary** | 5% traffic (staging) | 1h soak, error rate < 0.01% | ArgoCD instant rollback |
| **Staging Full** | 100% staging | 24h soak + k6 load | ArgoCD rollback |
| **Prod Canary** | 5% traffic (prod) | 2h soak, business metrics | ArgoCD rollback |
| **Prod Full** | 100% prod | 48h monitoring | Blue/green or ArgoCD |

---

## 7. Definition of Done

- [ ] `Dockerfile.web` + `nginx.conf` build and run locally via `docker-compose up`
- [ ] All 5 Helm charts lint, template, and dry-run clean
- [ ] Staging namespace deployed via ArgoCD; all pods healthy
- [ ] k6 load tests pass all thresholds (staging)
- [ ] Playwright E2E passes against staging URL
- [ ] Prometheus/Grafana/Loki/Tempo dashboards populated
- [ ] Alert rules firing correctly in Alertmanager (test alerts)
- [ ] Backup/restore drill documented and tested
- [ ] Runbooks published in `docs/operations/`
- [ ] Rollback drill completed successfully
- [ ] Disaster recovery drill completed (RPO/RTO met)
- [ ] Release notes v3.36.1 (deployment fixes) drafted

---

## 8. Immediate Next Steps

1. **Commit 1**: Dockerfile.web, nginx.conf, docker-compose.yml
2. **Commit 2**: Helm charts (web, db, cache, storage, observability)
3. **Commit 3**: ArgoCD ApplicationSet + kustomize overlays (staging/prod)
4. **Commit 4**: k6 load test scripts + CI integration
5. **Commit 5**: Health/readiness endpoints + OpenTelemetry instrumentation
6. **Commit 6**: Runbooks + Grafana dashboards + alert rules
7. **Commit 7**: Staging soak execution report + DR drill log

---

*Generated: 2026-10-09*
*Status: READY FOR IMPLEMENTATION*