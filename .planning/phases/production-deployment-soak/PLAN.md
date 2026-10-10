# Implementation Plan: Production Deployment & Staging Soak (`v3.38.0`)

## 1. Overview & Phased Roadmap
This plan details the implementation, performance optimization, load certification, and canary rollout for **v3.38.0**.

---

## 2. Execution Waves

### 🌊 Wave 1: Performance Hardening, Crypto Safety & Container Infrastructure
- **Task 1.1**: Timing-Safe Challenge Verification (`BiometricMeshEngine.verifyChallenge` with `crypto.timingSafeEqual`) and cached 32-byte key buffer in module scope.
- **Task 1.2**: Multi-Row Bulk Batch Inserts (`TelemetryIngestionWorker.flushBatch` using multi-row Drizzle inserts in chunks of 100).
- **Task 1.3**: Update `Dockerfile` & `Dockerfile.web` with Next.js 16 standalone output mode, `NODE_OPTIONS: "--max-old-space-size=3072"`, and non-root execution.
- **Task 1.4**: Update `charts/thaibahive-web` Helm templates:
  - Add `rollout.enabled` toggle supporting `argoproj.io/v1alpha1 Rollout` alongside standard `Deployment`.
  - Add `charts/thaibahive-web/templates/analysistemplate.yaml` with Prometheus PromQL metrics (5xx error rate < 0.1%, P95 latency < 100ms, WS drop rate < 0.05%).
  - Configure Ingress NGINX annotations (`proxy-buffering: "off"`, `proxy-http-version: "1.1"`, `proxy-read-timeout: "3600"`).
  - Configure `terminationGracePeriodSeconds: 60` and `maxUnavailable: 1` PDB.
  - Add secret volume mount configuration (`tmpfs` `/run/secrets/thaibahive/`, mode `0400`).
- **Task 1.5**: Update `charts/thaibahive-web/values.yaml` and overlays for Staging & Production.

### 🌊 Wave 2: K6 Load & Soak Test Engineering
- **Task 2.1**: Author K6 Common Test Harness (`k6/lib/auth-session.js`, `k6/lib/metrics-reporter.js`).
- **Task 2.2**: Author `k6/hardware-telemetry-soak.js` (5,000 packets/sec continuous soak + 2x spike burst).
- **Task 2.3**: Author `k6/voice-copilot-soak.js` (500 concurrent WebSockets + PCM audio frame bursts).
- **Task 2.4**: Author `k6/gate-access-load.js` (500 concurrent turnstile swipe transits + Anti-Passback state machine stress).
- **Task 2.5**: Author `k6/rag-hybrid-query-soak.js` (200 RPS vector + keyword hybrid search queries).
- **Task 2.6**: Author automated CI workflow `.github/workflows/staging-soak.yml`.

### 🌊 Wave 3: Staging Deployment & Soak Execution
- **Task 3.1**: Execute automated k6 soak scenarios against staging endpoints.
- **Task 3.2**: Monitor Prometheus SLO dashboards, PgBouncer pool utilization, and Loki error log streams.
- **Task 3.3**: Validate zero memory leaks in `TelemetryIngestionWorker` write-behind batching and `BiometricMeshEngine` crypto cache.
- **Task 3.4**: Verify zero socket starvation and graceful WebSocket connection draining.

### 🌊 Wave 4: ArgoCD Canary Progressive Promotion & Runbooks
- **Task 4.1**: Update `charts/argocd-applicationset.yaml` and `charts/thaibahive-web/overlays/production/kustomization.yaml` for `v3.38.0` image tags.
- **Task 4.2**: Configure Argo Rollouts canary steps (5% → 25% → 50% → 100%) with automated Prometheus metric analysis for rollback triggers.
- **Task 4.3**: Author Production Operations & Troubleshooting Runbook (`docs/operations/v3.38.0-deployment-runbook.md`).
- **Task 4.4**: Verify automated rollback triggers with a synthetic failure dry-run.

---

## 3. Quality & Verification Gates
1. **Container Build Gate**: Docker build completes with 0 errors and image size < 300MB.
2. **K8s Manifest Lint Gate**: `helm lint charts/thaibahive-web` and `kustomize build` pass without warnings.
3. **K6 Load Gate**: 100% pass on all 4 soak test thresholds (P95 latency < 100ms, error rate < 0.01%).
4. **Tenant Isolation Gate**: `pnpm security:tenants` passes 100%.
5. **Zero Downtime Gate**: Rolling restart maintains continuous 100% HTTP 200 response rate.
