# Engineering Contract — Sprint-037

**Sprint ID:** SPRINT-037  
**Sprint Name:** Multi-Tenant Zero-Trust Edge Identity Mesh & Cryptographic Session Attestation  
**Target Release Version:** v3.21.0  
**Contract Date:** 2026-08-19  
**Contract Status:** APPROVED — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-037-Recommendation.md`  

---

## 1. Contract Overview

This engineering contract formalises the implementation scope, task breakdown, acceptance criteria, risk register, and definition of done for Sprint-037. It is binding on the Implementation Engineer and governs all execution work until the sprint is handed to the Verification Engineer.

Sprint-037 introduces **device-bound cryptographic session attestation (DPoP)**, a **continuous risk-based authentication engine**, a **decentralised edge revocation mesh**, and an **admin identity security posture radar** on top of the enterprise-grade cryptographic audit, cross-region Redis mesh, and multi-tenant partitioning infrastructure delivered in prior sprints (Sprint-035, Sprint-036).

---

## 2. Scope

### In Scope

| # | Area | Description |
|---|------|-------------|
| 1 | DPoP Engine | Ed25519/ECDSA device-bound token generation, validation, and DPoP header middleware |
| 2 | Device Fingerprinting | Canvas/browser fingerprinting, drift detection, and trust scoring |
| 3 | Risk-Based Auth Engine | IP velocity, geographic anomaly, behavioural-signal scoring, adaptive thresholds |
| 4 | WebAuthn Step-Up Auth | Biometric/FIDO2 re-authentication triggered by risk events; OTP fallback |
| 5 | Edge Revocation Mesh | Redis PubSub global credential invalidation, sub-50ms propagation, central fallback |
| 6 | JWT Migration Layer | Dual-token support (DPoP + legacy JWT) with transparent fallback and deprecation timeline |
| 7 | Admin Identity Radar | `/admin/security/identity` dashboard: session map, device trust heatmap, revocation counters |
| 8 | Audit Integration | Identity events piped into the Sprint-036 crypto audit engine (tamper-proof trails) |
| 9 | Observability | Prometheus metrics for DPoP overhead, revocation latency, risk-score distribution |
| 10 | Testing | Jest unit tests, Playwright E2E, k6 load validation, chaos testing for revocation mesh |
| 11 | Documentation | Operational runbooks: DPoP guide, risk-scoring calibration, revocation mesh ops, WebAuthn config |
| 12 | CI Gate | GitHub Actions gate: DPoP coverage scanner, revocation mesh smoke, security lint |

### Out of Scope

| Area | Reason |
|------|--------|
| Machine-learning risk scoring | Post-MVP enhancement; rule-based scoring is sufficient for v3.21.0 |
| Hardware security key (FIDO2 hardware token) management UI | Separate dedicated sprint; WebAuthn API covers the protocol layer |
| Full PKI certificate authority infrastructure | Existing Node.js crypto module + JOSE is sufficient for DPoP |
| OAuth2 / OIDC provider integration | Not required by current ThaibaHive auth architecture |
| End-user account management UI changes | Identity security is infrastructure-layer; no user-facing account pages modified |
| Flutter mobile DPoP binding | Mobile DPoP layer is a separate sprint; mobile nonce exchange (WebViewHandoffScreen) remains unchanged |
| Changes to Drizzle schema for core ERP entities | Only identity/session tables are added or modified |
| Geolocation microservice deployment | External IP-geolocation API integration via HTTP; no new microservice |

---

## 3. Implementation Tasks

> Tasks are listed in strict dependency order. The Implementation Engineer MUST execute foundational tasks (IDP-001 → IDP-004) before proceeding to dependent tasks.

---

### IDP-001 — DPoP Key-Pair Generation & Device Binding Engine

| Field | Value |
|-------|-------|
| **Task ID** | IDP-001 |
| **Phase** | Phase 1 — DPoP Cryptographic Foundation |
| **Description** | Implement the core DPoP cryptographic primitives: Ed25519/ECDSA key-pair generation per device session, JWK (JSON Web Key) serialisation, DPoP proof token construction (RFC 9449-compliant), and server-side proof verification. Expose as `src/lib/identity/dpop-engine.ts`. |
| **Files** | `src/lib/identity/dpop-engine.ts` [NEW] · `src/lib/identity/dpop-types.ts` [NEW] · `src/lib/__tests__/identity/dpop-engine.test.ts` [NEW] |
| **Dependencies** | None — foundational primitive |
| **Acceptance Criteria** | (1) Ed25519 and P-256 ECDSA key pairs generated deterministically per device session. (2) DPoP proof JWTs constructed with `jti`, `htm`, `htu`, `iat` claims per RFC 9449. (3) Server verifies DPoP proof signature and replay protection (jti cache with 5-minute TTL). (4) `pnpm typecheck` passes with zero errors. (5) Jest unit tests cover: key generation, proof construction, valid verification, expired proof rejection, replay rejection. |
| **Verification Method** | `pnpm test --testPathPattern=dpop-engine` — all unit tests green. Manual: POST a request with a valid DPoP proof header → 200. POST same jti twice → 401. |
| **Estimated Complexity** | High (cryptographic RFC compliance, replay cache) |

---

### IDP-002 — DPoP Validation Middleware

| Field | Value |
|-------|-------|
| **Task ID** | IDP-002 |
| **Phase** | Phase 1 — DPoP Cryptographic Foundation |
| **Description** | Build the Next.js route middleware decorator `withDPoP` that wraps API handlers, extracts the `DPoP` header, validates the proof via IDP-001, and attaches the validated device public key fingerprint to the request context. Integrates with the existing `requireAuth` wrapper. |
| **Files** | `src/lib/identity/dpop-middleware.ts` [NEW] · `src/lib/identity/index.ts` [NEW] · `src/lib/__tests__/identity/dpop-middleware.test.ts` [NEW] |
| **Dependencies** | IDP-001 |
| **Acceptance Criteria** | (1) Requests with valid DPoP header proceed normally. (2) Requests missing `DPoP` header on DPoP-required routes return `401 { "error": "DPoP proof required" }`. (3) Requests with invalid/expired DPoP proof return `401 { "error": "DPoP proof invalid" }`. (4) Device public key fingerprint available on `req.dpopThumbprint`. (5) `withDPoP` composable with existing `requireAuth`. (6) Zero TypeScript errors. |
| **Verification Method** | Jest unit tests covering all 401 paths. Integration test: authenticated request with valid DPoP proof → 200. Same route without DPoP header → 401. |
| **Estimated Complexity** | Medium |

---

### IDP-003 — Session Token Service (DPoP-Bound JWT Issuance)

| Field | Value |
|-------|-------|
| **Task ID** | IDP-003 |
| **Phase** | Phase 1 — DPoP Cryptographic Foundation |
| **Description** | Extend the `@thaiba/auth` token issuance path to mint DPoP-bound access tokens. The token `cnf` (confirmation) claim carries the device public key thumbprint. Implement short-TTL (10-minute access token, 7-day refresh token). Add migration flag `dpop_enabled` per token to enable dual-mode compatibility with IDP-004. |
| **Files** | `packages/auth/src/session-token-service.ts` [MODIFY] · `packages/auth/src/token-types.ts` [MODIFY] · `packages/auth/src/__tests__/session-token-service.test.ts` [MODIFY] |
| **Dependencies** | IDP-001, IDP-002 |
| **Acceptance Criteria** | (1) DPoP-bound tokens include `cnf.jkt` claim (SHA-256 thumbprint of device JWK). (2) Legacy JWT tokens (without `cnf`) continue to issue during migration window. (3) Token expiry: access = 10 min, refresh = 7 days. (4) Refresh endpoint validates DPoP proof matches original `cnf.jkt`. (5) All existing auth package tests still pass. (6) Zero TypeScript errors in `packages/auth`. |
| **Verification Method** | `pnpm --filter @thaiba/auth test` — all green. Decode issued token → assert `cnf.jkt` present. Use old token (no `cnf`) against DPoP-required endpoint → graceful fallback or rejection depending on migration flag. |
| **Estimated Complexity** | High (backward-compatible token schema change) |

---

### IDP-004 — Legacy JWT Dual-Mode Migration Layer

| Field | Value |
|-------|-------|
| **Task ID** | IDP-004 |
| **Phase** | Phase 1 — DPoP Cryptographic Foundation |
| **Description** | Implement a migration compatibility layer that accepts both legacy JWT (no `cnf`) and DPoP-bound tokens during the transition window. Tracks migration progress via a `sessions` table column `dpop_migrated: boolean`. Logs migration warnings to the crypto audit engine (IDP-008 integration point). Provides a CLI command `pnpm identity:migration:status` to report migration percentage. |
| **Files** | `src/lib/identity/migration-layer.ts` [NEW] · `src/db/schema.ts` [MODIFY — add `dpop_migrated` to sessions table] · `scripts/identity/migration-status.ts` [NEW] · `src/lib/__tests__/identity/migration-layer.test.ts` [NEW] |
| **Dependencies** | IDP-003 |
| **Acceptance Criteria** | (1) Both legacy JWT and DPoP-bound tokens accepted during migration window. (2) `dpop_migrated` column present in sessions table after migration is run. (3) `pnpm identity:migration:status` outputs migrated vs legacy session counts and percentage. (4) Migration warnings appear in crypto audit log. (5) Existing login flows unchanged from user perspective. (6) Zero TypeScript errors. |
| **Verification Method** | Jest tests verify both token types are accepted. CLI command runs and outputs JSON status. DB migration script runs idempotently. |
| **Estimated Complexity** | Medium |

---

### IDP-005 — Device Fingerprinting & Trust Scoring Engine

| Field | Value |
|-------|-------|
| **Task ID** | IDP-005 |
| **Phase** | Phase 1 — DPoP Cryptographic Foundation |
| **Description** | Implement server-side device fingerprint storage and trust-score computation. Fingerprints are multi-attribute composites (UA, screen resolution, timezone, canvas hash, language) sent as a signed JSON payload from the client on login. Server stores the baseline fingerprint per user-device pair. Subsequent requests carry the fingerprint payload; server detects drift and adjusts trust score (0–100). |
| **Files** | `src/lib/identity/device-fingerprint.ts` [NEW] · `src/lib/identity/trust-scoring.ts` [NEW] · `src/components/auth/device-fingerprint-collector.tsx` [NEW] · `src/db/schema.ts` [MODIFY — add `device_fingerprints` table] · `src/lib/__tests__/identity/trust-scoring.test.ts` [NEW] |
| **Dependencies** | IDP-001 |
| **Acceptance Criteria** | (1) Device fingerprints stored in `device_fingerprints` table with SHA-256 composite hash. (2) Trust score 100 on first login (baseline). (3) Drift in 1–2 attributes → trust score >= 70 (soft warning). (4) Drift in 3+ attributes → trust score < 50 (risk event trigger). (5) Trust score cached with 5-minute TTL per device. (6) Fingerprint collection component renders invisibly in login flow; zero layout impact. (7) Jest tests cover scoring: no drift, partial drift, full drift. |
| **Verification Method** | Jest unit tests for all three drift scenarios. Playwright: login, alter simulated fingerprint, log in again → risk event triggered in audit log. |
| **Estimated Complexity** | Medium-High |

---

### IDP-006 — Continuous Risk-Based Authentication Engine

| Field | Value |
|-------|-------|
| **Task ID** | IDP-006 |
| **Phase** | Phase 2 — Risk-Based Authentication Engine |
| **Description** | Implement the risk-scoring evaluation pipeline at `src/lib/identity/risk-engine.ts`. The engine aggregates signals per authentication event: device trust score (IDP-005), IP velocity (logins from different IPs within a 15-minute sliding window), geographic impossibility (>1000 km/hr velocity between consecutive login IPs), time-of-day anomaly, and failed attempt history. Outputs a `RiskScore` object with `score` (0–100), `level` ("low" | "medium" | "high" | "critical"), and `triggers` array. |
| **Files** | `src/lib/identity/risk-engine.ts` [NEW] · `src/lib/identity/risk-signals.ts` [NEW] · `src/lib/identity/geo-lookup.ts` [NEW] · `src/lib/__tests__/identity/risk-engine.test.ts` [NEW] · `src/lib/__tests__/identity/geo-lookup.test.ts` [NEW] |
| **Dependencies** | IDP-005 |
| **Acceptance Criteria** | (1) Risk score <= 20 → "low" → no step-up required. (2) Risk score 21–50 → "medium" → step-up recommended (soft prompt). (3) Risk score 51–80 → "high" → WebAuthn step-up required. (4) Risk score 81–100 → "critical" → session terminated, credential revoked. (5) IP velocity: 3 distinct IPs in 15 minutes → +30 risk points. (6) Geographic impossibility detected → +40 risk points. (7) Risk evaluation latency < 100ms (p95 under load). (8) Geolocation fallback to cached data when external service unavailable. (9) Jest unit tests for all signal combinations. |
| **Verification Method** | `pnpm test --testPathPattern=risk-engine` — all green. k6 load test: 500 concurrent risk evaluations → p95 < 100ms. Manual test: trigger geographic impossibility → session terminated + audit log entry. |
| **Estimated Complexity** | High |

---

### IDP-007 — WebAuthn / Biometric Step-Up Authentication

| Field | Value |
|-------|-------|
| **Task ID** | IDP-007 |
| **Phase** | Phase 2 — Risk-Based Authentication Engine |
| **Description** | Implement WebAuthn (FIDO2) step-up authentication integration. When risk engine emits "high" or "critical" risk level, the client is redirected to a step-up challenge flow. Server issues a WebAuthn assertion challenge, client authenticates biometrically (platform authenticator) or with security key, server verifies authenticator assertion. On failure, fallback to OTP (6-digit TOTP/email code). Credential management (registration, revocation) handled via `src/app/api/auth/webauthn/`. |
| **Files** | `src/app/api/auth/webauthn/challenge/route.ts` [NEW] · `src/app/api/auth/webauthn/verify/route.ts` [NEW] · `src/app/api/auth/stepup/otp/route.ts` [NEW] · `src/lib/identity/webauthn-service.ts` [NEW] · `src/components/auth/stepup-challenge-dialog.tsx` [NEW] · `src/lib/__tests__/identity/webauthn-service.test.ts` [NEW] · `src/db/schema.ts` [MODIFY — add `webauthn_credentials` table] |
| **Dependencies** | IDP-006 |
| **Acceptance Criteria** | (1) Risk score "high" → step-up dialog rendered using `<Dialog>` component (not custom overlay). (2) WebAuthn challenge issued with 60-second TTL and one-time use nonce. (3) Browser platform authenticator and FIDO2 hardware keys accepted. (4) OTP fallback renders when WebAuthn not supported (`PublicKeyCredential` absent). (5) Failed step-up after 3 attempts → session terminated. (6) Step-up events logged to crypto audit engine. (7) `<Dialog>` component used per UI conventions (no `fixed inset-0 z-50` overlay). (8) WCAG 2.1 AA compliance on step-up dialog. |
| **Verification Method** | Jest unit tests for challenge issuance and verification logic. Playwright E2E: trigger high-risk condition → step-up dialog appears → assert dialog ARIA roles. Manual: complete WebAuthn assertion → session restored. |
| **Estimated Complexity** | High |

---

### IDP-008 — Crypto Audit Integration for Identity Events

| Field | Value |
|-------|-------|
| **Task ID** | IDP-008 |
| **Phase** | Phase 2 — Risk-Based Authentication Engine |
| **Description** | Integrate all identity security events into the Sprint-036 cryptographic audit engine (`src/lib/audit/crypto-audit-engine.ts`). Define identity audit event types: `dpop.proof.validated`, `dpop.proof.rejected`, `session.revoked`, `risk.stepup.triggered`, `risk.stepup.completed`, `risk.stepup.failed`, `fingerprint.drift.detected`, `migration.token.legacy`, `revocation.propagated`. Each event carries `userId`, `institutionId`, `deviceThumbprint`, `riskScore`, and `triggers`. |
| **Files** | `src/lib/identity/identity-audit-events.ts` [NEW] · `src/lib/audit/audit-event-types.ts` [MODIFY — add identity event types] · `src/lib/__tests__/identity/identity-audit-events.test.ts` [NEW] |
| **Dependencies** | IDP-002, IDP-006, IDP-007 — requires crypto audit engine from Sprint-036 (already in codebase) |
| **Acceptance Criteria** | (1) All 9 identity event types emit to crypto audit chain with correct schema. (2) Events visible in `/api/system/compliance/verify` hash chain output. (3) `pnpm compliance:scan` still reports 100% audit coverage after new event types added. (4) Zero TypeScript errors. (5) Jest tests confirm each event type produces valid audit log entry with SHA-256 chaining. |
| **Verification Method** | `pnpm compliance:scan` → 100% coverage. `pnpm compliance:verify` → chain integrity intact. Jest tests: emit each event type → verify audit chain. |
| **Estimated Complexity** | Medium |

---

### IDP-009 — Edge Revocation Mesh (Redis PubSub)

| Field | Value |
|-------|-------|
| **Task ID** | IDP-009 |
| **Phase** | Phase 3 — Edge Revocation Mesh |
| **Description** | Implement the decentralised credential revocation mesh using the existing cross-region Redis PubSub infrastructure (Sprint-035). When a credential is revoked (admin action, risk-critical event, or session expiry), the revocation event is published to the `identity:revocation` PubSub channel. All regional edge nodes subscribe and update their local revocation bloom filter within 50ms. Implement a central revocation API (`/api/auth/revoke`) as fallback for mesh failures. Revocation status queryable via `src/lib/identity/revocation-store.ts`. |
| **Files** | `src/lib/identity/revocation-store.ts` [NEW] · `src/lib/identity/revocation-mesh.ts` [NEW] · `src/app/api/auth/revoke/route.ts` [NEW] · `src/lib/__tests__/identity/revocation-store.test.ts` [NEW] · `src/lib/__tests__/identity/revocation-mesh.test.ts` [NEW] |
| **Dependencies** | IDP-003, IDP-008 — requires Redis PubSub from Sprint-035 (already in codebase) |
| **Acceptance Criteria** | (1) `POST /api/auth/revoke` accepts `{ userId, sessionId, reason }` and emits PubSub event. (2) PubSub propagation to all subscribers completes in < 50ms (measured in integration test with local Redis). (3) Bloom filter correctly identifies revoked tokens on subsequent requests → 401. (4) Central fallback check used when Redis unavailable (graceful degradation). (5) Revocation events appear in crypto audit chain (IDP-008 integration). (6) Endpoint protected by `requireAuth` with `system:security:revoke` permission. (7) Jest unit tests: revoke → bloom filter query → reject; revoke → central API → reject. |
| **Verification Method** | Jest integration tests with local Redis. Manual: revoke session → subsequent request → 401. Simulate Redis failure → central fallback query succeeds. k6 load: 100 concurrent revocations → p95 propagation < 50ms. |
| **Estimated Complexity** | High (distributed systems) |

---

### IDP-010 — Revocation Mesh Monitoring & Alerting

| Field | Value |
|-------|-------|
| **Task ID** | IDP-010 |
| **Phase** | Phase 3 — Edge Revocation Mesh |
| **Description** | Expose Prometheus metrics for the revocation mesh: `identity_revocation_propagation_ms` (histogram), `identity_revocation_bloom_size` (gauge), `identity_revocation_fallback_total` (counter), `identity_active_sessions_total` (gauge by region). Add alerting thresholds for: propagation latency > 100ms, bloom filter memory > 80% capacity, fallback rate > 5% of revocations. Metrics exported via existing observability infrastructure. |
| **Files** | `src/lib/identity/revocation-metrics.ts` [NEW] · `src/lib/observability/metrics-registry.ts` [MODIFY — register identity metrics] · `docs/identity-revocation-mesh-ops.md` [NEW] |
| **Dependencies** | IDP-009 |
| **Acceptance Criteria** | (1) All 4 Prometheus metrics registered and queryable at `/api/system/metrics`. (2) Alert thresholds configured as constants with inline documentation. (3) Operational runbook `docs/identity-revocation-mesh-ops.md` covers: metric interpretation, alert response, bloom filter tuning, mesh failover procedures. (4) Zero TypeScript errors. |
| **Verification Method** | `curl /api/system/metrics | grep identity_revocation` → all 4 metrics present. Jest: emit revocation events → metrics counters increment. |
| **Estimated Complexity** | Low-Medium |

---

### IDP-011 — Identity Security Prometheus Metrics (DPoP & Risk Engine)

| Field | Value |
|-------|-------|
| **Task ID** | IDP-011 |
| **Phase** | Phase 3 — Edge Revocation Mesh |
| **Description** | Extend observability with DPoP and risk-engine Prometheus metrics: `identity_dpop_validation_ms` (histogram), `identity_dpop_replay_rejected_total` (counter), `identity_risk_score_distribution` (histogram), `identity_stepup_triggered_total` (counter by level), `identity_stepup_completed_total` (counter), `identity_device_fingerprint_drift_total` (counter). |
| **Files** | `src/lib/identity/identity-metrics.ts` [NEW] · `src/lib/observability/metrics-registry.ts` [MODIFY] |
| **Dependencies** | IDP-002, IDP-006, IDP-007, IDP-010 |
| **Acceptance Criteria** | (1) All 6 metrics queryable at `/api/system/metrics`. (2) DPoP validation metrics recorded on every proof check. (3) Risk score distribution sampled per authentication event. (4) Step-up counters increment on trigger and completion. (5) Zero TypeScript errors. |
| **Verification Method** | Jest: perform DPoP validation → assert metric increments. Manual: trigger step-up → query metrics → counters reflect event. |
| **Estimated Complexity** | Low |

---

### IDP-012 — Admin Identity Security Posture Radar Dashboard

| Field | Value |
|-------|-------|
| **Task ID** | IDP-012 |
| **Phase** | Phase 4 — Admin Radar & Migration |
| **Description** | Build the admin identity security dashboard at `src/app/(shell)/admin/security/identity/page.tsx`. Sections: (A) Session Distribution Map — active sessions by region with DPoP vs legacy split. (B) Device Trust Score Heatmap — real-time trust score distribution across active sessions. (C) Risk Event Stream — live feed of risk events (step-up triggers, geographic anomalies, fingerprint drifts). (D) Revocation Velocity — revocations per minute gauge with 24-hour sparkline. (E) DPoP Migration Progress — migrated vs legacy session percentage bar. Uses existing `<Badge>`, `<Skeleton>`, `<Dialog>` components and `useCallback`/`useEffect` patterns per AIOS conventions. Polling interval: 10 seconds. Protected by `system:security:view` permission. |
| **Files** | `src/app/(shell)/admin/security/identity/page.tsx` [NEW] · `src/app/api/admin/security/identity/metrics/route.ts` [NEW] · `src/lib/__tests__/admin/identity-radar.test.ts` [NEW] |
| **Dependencies** | IDP-009, IDP-011 |
| **Acceptance Criteria** | (1) Dashboard renders at `/admin/security/identity` with all 5 sections. (2) All fetch calls in `useEffect` have `.catch()` handlers. (3) Loading states use `<Skeleton>` components (not "Loading..." text). (4) Status colours use `<Badge variant="success|warning|destructive">` (no hardcoded Tailwind). (5) No raw `<button>`, `<input>`, `<select>` — only UI primitives from `src/components/ui/`. (6) Data refreshes every 10 seconds. (7) Unauthenticated or insufficient-permission requests return 403. (8) Zero WCAG 2.1 AA violations on dashboard. (9) Zero TypeScript errors. |
| **Verification Method** | Playwright E2E: navigate to `/admin/security/identity` as super_admin → all sections render. Playwright: navigate as staff → redirect to 403. Jest: API route returns correct metric shape. axe-core: 0 WCAG violations. |
| **Estimated Complexity** | Medium-High |

---

### IDP-013 — DPoP Client-Side Token Manager (Browser Hook)

| Field | Value |
|-------|-------|
| **Task ID** | IDP-013 |
| **Phase** | Phase 4 — Admin Radar & Migration |
| **Description** | Implement a browser-side DPoP key-pair manager as a React hook `useDPoP` at `src/lib/hooks/use-dpop.ts`. Generates and stores the device key pair in `indexedDB` (non-extractable CryptoKey via SubtleCrypto). On every API request, generates a fresh DPoP proof JWT signed with the stored private key and attaches it as the `DPoP` header. Handles key rotation on 30-day TTL. Integrates with the existing `fetch` wrapper in `src/lib/api-client.ts`. |
| **Files** | `src/lib/hooks/use-dpop.ts` [NEW] · `src/lib/api-client.ts` [MODIFY — attach DPoP header from useDPoP] · `src/lib/__tests__/hooks/use-dpop.test.ts` [NEW] |
| **Dependencies** | IDP-003 |
| **Acceptance Criteria** | (1) Key pair generated with `SubtleCrypto.generateKey` using P-256 ECDSA, non-extractable. (2) Key pair persisted in `indexedDB` under institution-scoped key. (3) DPoP proof generated fresh per request with correct `htm` and `htu` claims. (4) Key rotation triggered when key age > 30 days. (5) `useDPoP` hook returns `{ attachDPoP: (request: Request) => Request }`. (6) Zero TypeScript errors. (7) Jest tests (jsdom environment) cover: key generation, proof construction, key rotation. |
| **Verification Method** | Jest (jsdom): key persists across hook re-renders; proof includes correct claims. Integration: full auth flow with `use-dpop` → server validates DPoP proof → 200. |
| **Estimated Complexity** | High (Web Crypto API, indexedDB, browser environment) |

---

### IDP-014 — CI/CD Identity Security Gate

| Field | Value |
|-------|-------|
| **Task ID** | IDP-014 |
| **Phase** | Phase 4 — Admin Radar & Migration |
| **Description** | Extend the CI/CD pipeline with an identity security static analysis gate. The gate asserts: (A) All `withDPoP`-decorated routes have corresponding unit tests. (B) No legacy JWT issuance without migration flag after `dpop_migration_complete` environment flag is set. (C) No hardcoded symmetric secrets in identity modules. (D) Revocation mesh smoke test passes. Add as a job in `.github/workflows/identity-security-gate.yml`. |
| **Files** | `scripts/identity/identity-coverage-scanner.ts` [NEW] · `.github/workflows/identity-security-gate.yml` [NEW] · `src/lib/__tests__/ci/identity-gate.test.ts` [NEW] |
| **Dependencies** | IDP-002, IDP-004, IDP-009 |
| **Acceptance Criteria** | (1) `pnpm identity:scan` exits 0 when all DPoP-decorated routes have tests. (2) `pnpm identity:scan` exits 1 with clear error when any DPoP route is untested. (3) GitHub Actions workflow runs on every PR targeting `main`. (4) Revocation mesh smoke test included as a workflow step. (5) Zero TypeScript errors in scanner. |
| **Verification Method** | Run `pnpm identity:scan` locally → exit 0. Temporarily remove a test → run again → exit 1 with error output. Review workflow YAML: job includes all 4 assertion steps. |
| **Estimated Complexity** | Medium |

---

### IDP-015 — Comprehensive Test Suite (Integration, E2E, Load)

| Field | Value |
|-------|-------|
| **Task ID** | IDP-015 |
| **Phase** | Phase 4 — Admin Radar & Migration |
| **Description** | Author the complete integration and E2E test suite for all Sprint-037 features: (1) Jest integration tests for full DPoP auth round-trip (IDP-001 → IDP-003). (2) Jest chaos tests for revocation mesh: simulate Redis failure → central fallback. (3) Playwright E2E: full zero-trust auth flow (login → DPoP token → risk event → step-up → resolution). (4) Playwright E2E: admin identity radar rendering and 10-second refresh cycle. (5) k6 load test: 1000 authentication requests/second with DPoP validation → p95 < 50ms. (6) k6 load test: 100 concurrent revocations → p95 propagation < 50ms. |
| **Files** | `src/lib/__tests__/integration/dpop-auth-flow.test.ts` [NEW] · `src/lib/__tests__/integration/revocation-chaos.test.ts` [NEW] · `e2e/identity/zero-trust-flow.spec.ts` [NEW] · `e2e/identity/admin-identity-radar.spec.ts` [NEW] · `k6/identity-load-test.js` [NEW] · `k6/revocation-load-test.js` [NEW] |
| **Dependencies** | IDP-001 through IDP-014 |
| **Acceptance Criteria** | (1) All Jest integration tests pass. (2) All Playwright E2E tests pass on chromium, firefox, webkit. (3) Zero `waitForTimeout` calls in E2E tests (zero-sleep compliant). (4) k6 auth load: p95 < 50ms at 1000 req/s; 0.00% error rate. (5) k6 revocation load: p95 propagation < 50ms; 0.00% error rate. (6) Chaos test confirms central fallback activates within 200ms of Redis failure. |
| **Verification Method** | `pnpm test` → all suites green. `pnpm test:e2e` → all Playwright suites pass on 3 browsers. `k6 run k6/identity-load-test.js` → metrics within SLA. |
| **Estimated Complexity** | High |

---

### IDP-016 — Operational Runbooks & Documentation

| Field | Value |
|-------|-------|
| **Task ID** | IDP-016 |
| **Phase** | Phase 4 — Admin Radar & Migration |
| **Description** | Author all operational runbooks and developer documentation for Sprint-037 deliverables. |
| **Files** | `docs/dpop-cryptographic-session-guide.md` [NEW] · `docs/risk-based-authentication-guide.md` [NEW] · `docs/edge-revocation-mesh-ops.md` [NEW] · `docs/webauthn-stepup-configuration-guide.md` [NEW] · `docs/dpop-migration-runbook.md` [NEW] |
| **Dependencies** | IDP-009, IDP-010, IDP-011, IDP-012, IDP-013 |
| **Acceptance Criteria** | (1) `docs/dpop-cryptographic-session-guide.md`: DPoP architecture, key generation, proof validation, client-side usage, troubleshooting. (2) `docs/risk-based-authentication-guide.md`: signal definitions, scoring algorithm, threshold calibration, alert response. (3) `docs/edge-revocation-mesh-ops.md`: mesh architecture, Prometheus metrics interpretation, failover procedures, bloom filter tuning. (4) `docs/webauthn-stepup-configuration-guide.md`: browser support matrix, credential registration, step-up flow, OTP fallback configuration. (5) `docs/dpop-migration-runbook.md`: migration phases, `pnpm identity:migration:status` usage, rollback procedure, deprecation timeline. (6) All 5 runbooks present with minimum 500 words each. |
| **Verification Method** | File existence check: all 5 docs present. Manual review: each runbook covers required sections. |
| **Estimated Complexity** | Low-Medium |

---

### IDP-017 — AIOS Documentation Update

| Field | Value |
|-------|-------|
| **Task ID** | IDP-017 |
| **Phase** | Phase 4 — Admin Radar & Migration |
| **Description** | Update AIOS governance documents to reflect Sprint-037 deliverables. Update `PROJECT_STATUS.md` to reflect v3.21.0 release state. |
| **Files** | `.ai/FEATURES.md` [MODIFY] · `.ai/CHANGELOG.md` [MODIFY] · `.ai/PROJECT_STATUS.md` [MODIFY] |
| **Dependencies** | IDP-016 — all implementation tasks complete |
| **Acceptance Criteria** | (1) `.ai/FEATURES.md` lists all 5 major Sprint-037 feature areas with status "DELIVERED". (2) `.ai/CHANGELOG.md` contains a `v3.21.0` entry with all Sprint-037 deliverables. (3) `.ai/PROJECT_STATUS.md` updated: Product Version → `3.21.0`, Sprint ID → `SPRINT-037`, all completion percentages maintained at 100%. (4) Zero Markdown lint errors. |
| **Verification Method** | Manual review of all 3 files for completeness and accuracy. |
| **Estimated Complexity** | Low |

---

## 4. Task Dependency Graph

```
IDP-001 (DPoP Primitives)
  ├── IDP-002 (DPoP Middleware)
  │     ├── IDP-003 (Session Token Service)
  │     │     ├── IDP-004 (Migration Layer)
  │     │     └── IDP-013 (Client Token Manager)
  │     └── IDP-008 (Audit Integration) ──────────────────────┐
  └── IDP-005 (Device Fingerprinting)                          │
        └── IDP-006 (Risk Engine)                              │
              ├── IDP-007 (WebAuthn Step-Up) ─────────────────►│
              └── IDP-008 (Audit Integration) ────────────────►│
                                                               │
                    IDP-009 (Revocation Mesh) ◄────────────────┘
                          ├── IDP-010 (Revocation Metrics)
                          └── IDP-011 (Identity Metrics)
                                    └── IDP-012 (Admin Radar)

IDP-002 + IDP-004 + IDP-009 ──► IDP-014 (CI Gate)
IDP-001 → IDP-014 ───────────► IDP-015 (Full Test Suite)
IDP-009 + IDP-012 ───────────► IDP-016 (Runbooks)
IDP-016 ─────────────────────► IDP-017 (AIOS Docs)
```

---

## 5. File Index

> All files touched by this sprint. `[NEW]` = created by Sprint-037. `[MODIFY]` = modified by Sprint-037.

### Source — Identity Infrastructure (`src/lib/identity/`)
| File | Status |
|------|--------|
| `src/lib/identity/dpop-engine.ts` | NEW |
| `src/lib/identity/dpop-types.ts` | NEW |
| `src/lib/identity/dpop-middleware.ts` | NEW |
| `src/lib/identity/index.ts` | NEW |
| `src/lib/identity/migration-layer.ts` | NEW |
| `src/lib/identity/device-fingerprint.ts` | NEW |
| `src/lib/identity/trust-scoring.ts` | NEW |
| `src/lib/identity/risk-engine.ts` | NEW |
| `src/lib/identity/risk-signals.ts` | NEW |
| `src/lib/identity/geo-lookup.ts` | NEW |
| `src/lib/identity/webauthn-service.ts` | NEW |
| `src/lib/identity/identity-audit-events.ts` | NEW |
| `src/lib/identity/revocation-store.ts` | NEW |
| `src/lib/identity/revocation-mesh.ts` | NEW |
| `src/lib/identity/revocation-metrics.ts` | NEW |
| `src/lib/identity/identity-metrics.ts` | NEW |

### Source — Auth Package (`packages/auth/`)
| File | Status |
|------|--------|
| `packages/auth/src/session-token-service.ts` | MODIFY |
| `packages/auth/src/token-types.ts` | MODIFY |
| `packages/auth/src/__tests__/session-token-service.test.ts` | MODIFY |

### Source — Database
| File | Status |
|------|--------|
| `src/db/schema.ts` | MODIFY (add: `device_fingerprints` table, `webauthn_credentials` table, `dpop_migrated` column on sessions) |

### Source — API Routes
| File | Status |
|------|--------|
| `src/app/api/auth/webauthn/challenge/route.ts` | NEW |
| `src/app/api/auth/webauthn/verify/route.ts` | NEW |
| `src/app/api/auth/stepup/otp/route.ts` | NEW |
| `src/app/api/auth/revoke/route.ts` | NEW |
| `src/app/api/admin/security/identity/metrics/route.ts` | NEW |

### Source — Pages & Components
| File | Status |
|------|--------|
| `src/app/(shell)/admin/security/identity/page.tsx` | NEW |
| `src/components/auth/device-fingerprint-collector.tsx` | NEW |
| `src/components/auth/stepup-challenge-dialog.tsx` | NEW |

### Source — Hooks & Client Utilities
| File | Status |
|------|--------|
| `src/lib/hooks/use-dpop.ts` | NEW |
| `src/lib/api-client.ts` | MODIFY |

### Source — Audit & Observability
| File | Status |
|------|--------|
| `src/lib/audit/audit-event-types.ts` | MODIFY |
| `src/lib/observability/metrics-registry.ts` | MODIFY |

### Tests
| File | Status |
|------|--------|
| `src/lib/__tests__/identity/dpop-engine.test.ts` | NEW |
| `src/lib/__tests__/identity/dpop-middleware.test.ts` | NEW |
| `src/lib/__tests__/identity/migration-layer.test.ts` | NEW |
| `src/lib/__tests__/identity/trust-scoring.test.ts` | NEW |
| `src/lib/__tests__/identity/risk-engine.test.ts` | NEW |
| `src/lib/__tests__/identity/geo-lookup.test.ts` | NEW |
| `src/lib/__tests__/identity/webauthn-service.test.ts` | NEW |
| `src/lib/__tests__/identity/identity-audit-events.test.ts` | NEW |
| `src/lib/__tests__/identity/revocation-store.test.ts` | NEW |
| `src/lib/__tests__/identity/revocation-mesh.test.ts` | NEW |
| `src/lib/__tests__/hooks/use-dpop.test.ts` | NEW |
| `src/lib/__tests__/admin/identity-radar.test.ts` | NEW |
| `src/lib/__tests__/integration/dpop-auth-flow.test.ts` | NEW |
| `src/lib/__tests__/integration/revocation-chaos.test.ts` | NEW |
| `src/lib/__tests__/ci/identity-gate.test.ts` | NEW |
| `e2e/identity/zero-trust-flow.spec.ts` | NEW |
| `e2e/identity/admin-identity-radar.spec.ts` | NEW |
| `k6/identity-load-test.js` | NEW |
| `k6/revocation-load-test.js` | NEW |

### Scripts & CI
| File | Status |
|------|--------|
| `scripts/identity/migration-status.ts` | NEW |
| `scripts/identity/identity-coverage-scanner.ts` | NEW |
| `.github/workflows/identity-security-gate.yml` | NEW |

### Documentation
| File | Status |
|------|--------|
| `docs/dpop-cryptographic-session-guide.md` | NEW |
| `docs/risk-based-authentication-guide.md` | NEW |
| `docs/edge-revocation-mesh-ops.md` | NEW |
| `docs/webauthn-stepup-configuration-guide.md` | NEW |
| `docs/dpop-migration-runbook.md` | NEW |

### AIOS Governance
| File | Status |
|------|--------|
| `.ai/FEATURES.md` | MODIFY |
| `.ai/CHANGELOG.md` | MODIFY |
| `.ai/PROJECT_STATUS.md` | MODIFY |

---

## 6. Risk Register

| Risk ID | Category | Description | Probability | Impact | Mitigation |
|---------|----------|-------------|-------------|--------|------------|
| R-001 | Technical | DPoP cryptographic operations add > 50ms latency to authentication | Medium | High | Use P-256 ECDSA; cache DPoP verification result per `jti` with 5-min TTL; validate under k6 load |
| R-002 | Technical | Device fingerprinting false positives cause excessive step-up prompts | Medium | Medium | Multi-attribute composite hash with configurable drift tolerance; trigger only at 3/7 attributes; tunable thresholds |
| R-003 | Technical | Redis PubSub propagation > 50ms under high revocation load | Low | High | Central fallback with < 200ms timeout; monitor with histogram; alert at 100ms |
| R-004 | Technical | WebAuthn not available in older browsers/environments | High | Low | OTP fallback mandatory; gracefully degrade when `PublicKeyCredential` absent |
| R-005 | Technical | Geographic impossibility false positives from VPN/proxy users | Medium | Medium | VPN detection as signal modifier (not blocklist); manual admin override available |
| R-006 | Operational | DPoP migration disrupts active user sessions | Medium | High | Dual-token mode (legacy JWT + DPoP) active throughout sprint; no forced migration until ops sets `dpop_migration_complete` flag |
| R-007 | Operational | Geolocation external API service outage | Low | Medium | TTL-cached geolocation data (24-hour TTL per IP); pure IP-velocity heuristics as fallback |
| R-008 | Implementation | Web Crypto API (SubtleCrypto) unavailable in non-secure contexts | Low | High | Enforce HTTPS in all environments; detect non-secure context and degrade to legacy JWT with audit warning |
| R-009 | Implementation | `indexedDB` quota exceeded on device key storage | Low | Low | Key storage < 1 KB per device; handle `QuotaExceededError` with key regeneration |
| R-010 | Implementation | Risk scoring calibration too aggressive in production | Medium | Medium | Start with conservative thresholds; collect telemetry for 2 weeks before tightening; admin configurable |

---

## 7. Rollback Plan

### Rollback Trigger Conditions
- DPoP validation overhead > 100ms p95 in production (measured by `identity_dpop_validation_ms`)
- Step-up false positive rate > 10% of total authentication events
- Revocation mesh propagation failures > 5% of revocation events
- Any P0/P1 security vulnerability discovered in DPoP implementation post-release

### Rollback Procedure

**Step 1 — Feature Flag Disable (< 5 minutes)**

Disable DPoP enforcement by setting `DPOP_ENFORCEMENT_ENABLED=false` — all existing legacy JWT sessions immediately continue functioning with zero user disruption.

Disable risk-based step-up by setting `RISK_STEPUP_ENABLED=false`.

**Step 2 — Revocation Mesh Isolation (if required)**

Switch revocation to central-only mode by setting `REVOCATION_MESH_ENABLED=false`. The central revocation API remains fully operational.

**Step 3 — Schema Rollback (if required)**

Run `pnpm db:rollback --steps=1` to remove `device_fingerprints`, `webauthn_credentials`, and `dpop_migrated` columns. Safe only after DPoP tokens have been disabled (Step 1 must precede this).

**Step 4 — Admin Dashboard Removal (if required)**

Revert `src/app/(shell)/admin/security/identity/page.tsx`. No other user-facing pages are affected.

**Rollback Verification**
- `pnpm typecheck` → 0 errors
- `pnpm test` → all test suites passing
- `pnpm compliance:verify` → audit chain intact
- Manual login test → legacy JWT flow fully operational

---

## 8. Definition of Done

A Sprint-037 task is complete when **all** of the following criteria are satisfied:

### Code Quality
- [ ] `pnpm typecheck` passes with zero TypeScript errors (all packages)
- [ ] `pnpm lint` passes with zero errors and zero new warnings
- [ ] No `console.log` statements in production code (`src/`, `packages/`)
- [ ] No hardcoded secrets or disabled security checks
- [ ] All new exported functions have JSDoc comments

### Testing
- [ ] Unit tests written for every new module
- [ ] All Jest test suites pass: `pnpm test` → 100% pass rate (249+ suites)
- [ ] `pnpm compliance:scan` → 100% mutation audit coverage maintained
- [ ] `pnpm compliance:verify` → cryptographic audit chain intact
- [ ] `pnpm security:tenants` → 0 tenant isolation leaks

### Verification
- [ ] `pnpm test:e2e` → all Playwright suites pass on chromium, firefox, webkit
- [ ] Zero `waitForTimeout` calls in E2E test files (zero-sleep compliant)
- [ ] k6 identity load test: p95 < 50ms at 1000 req/s; 0.00% error rate
- [ ] k6 revocation load test: p95 propagation < 50ms; 0.00% error rate
- [ ] WCAG 2.1 AA: 0 violations on step-up dialog and admin identity radar

### Security
- [ ] All new API routes wrapped with `requireAuth` and appropriate permission string
- [ ] `POST /api/auth/revoke` requires `system:security:revoke` permission
- [ ] `GET /admin/security/identity` requires `system:security:view` permission
- [ ] DPoP `jti` replay cache prevents replay attacks (unit tested)
- [ ] No cross-tenant data leakage in identity APIs (`pnpm security:tenants` clean)

### Documentation
- [ ] All 5 operational runbooks present in `docs/`
- [ ] `.ai/FEATURES.md` updated with Sprint-037 features
- [ ] `.ai/CHANGELOG.md` updated with v3.21.0 entry
- [ ] `.ai/PROJECT_STATUS.md` updated to v3.21.0

### Execution Log
- [ ] `.ai/execution/Sprint-037-Execution-Log.md` complete with all 17 tasks documented
- [ ] Files created/modified listed per task
- [ ] Any deviations from this contract documented with rationale

---

## 9. Verification Plan Summary

| Verification Type | Command / Method | Pass Threshold |
|-------------------|-----------------|----------------|
| TypeScript | `pnpm typecheck` | 0 errors |
| Linting | `pnpm lint` | 0 errors, 0 new warnings |
| Unit Tests | `pnpm test` | 100% pass (249+ suites) |
| Audit Coverage | `pnpm compliance:scan` | 100% mutation coverage |
| Audit Chain | `pnpm compliance:verify` | 100% chain integrity |
| Tenant Isolation | `pnpm security:tenants` | 0 leaks |
| E2E — Chromium | `pnpm test:e2e --project=chromium` | 100% pass |
| E2E — Firefox | `pnpm test:e2e --project=firefox` | 100% pass |
| E2E — WebKit | `pnpm test:e2e --project=webkit` | 100% pass |
| Load — Auth | `k6 run k6/identity-load-test.js` | p95 < 50ms; 0.00% errors |
| Load — Revocation | `k6 run k6/revocation-load-test.js` | p95 < 50ms; 0.00% errors |
| Accessibility | axe-core on step-up dialog + admin radar | 0 WCAG 2.1 AA violations |
| Migration Status | `pnpm identity:migration:status` | Exit 0, JSON output |
| CI Gate | `pnpm identity:scan` | Exit 0, 100% DPoP route coverage |

---

## 10. Sprint Metadata

| Field | Value |
|-------|-------|
| Sprint ID | SPRINT-037 |
| Sprint Name | Multi-Tenant Zero-Trust Edge Identity Mesh & Cryptographic Session Attestation |
| Target Version | v3.21.0 |
| Total Tasks | 17 (IDP-001 through IDP-017) |
| Estimated Duration | 5–6 weeks |
| Estimated Effort | ~37–46 engineering days |
| Team Size | 2–3 engineers |
| Complexity Rating | High |
| Predecessor Sprint | SPRINT-036 (v3.20.0 — Cryptographic Audit Telemetry) |
| Successor Artifact | `.ai/execution/Sprint-037-Execution-Log.md` |
| Release Artifact | `.ai/releases/Release-Sprint-037.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-19*  
*ThaibaHive Institution OS — Sprint-037 v3.21.0 Planning*
