# DPoP Dual-Mode Migration & Zero-Downtime Rollout Runbook

## 1. Migration Overview & Strategic Objectives

The transition to Demonstrating Proof of Possession (DPoP, RFC 9449) represents a major security advancement in ThaibaHive v3.21.0. DPoP cryptographically binds user access tokens to client-side public keys, rendering stolen or intercepted bearer tokens completely useless to adversaries.

However, in an enterprise ecosystem with thousands of faculty, administrative staff, and student mobile/desktop clients, enforcing DPoP instantaneously would cause widespread session disruption. This runbook establishes the formal, multi-stage dual-mode migration strategy to achieve 100% cryptographic token attestation with zero user downtime.

---

## 2. Four-Phase Phased Rollout Schedule

```
Phase 1: Dual-Mode Non-Blocking   ────────► Phase 2: Monitoring & Telemetry
- DPoP tokens issued if supported           - Live adoption tracking
- Legacy JWTs accepted everywhere           - Performance & error analysis
                 │                                      │
                 ▼                                      ▼
Phase 3: Progressive Route Enforcement ───► Phase 4: Deprecation of Legacy JWT
- Sensitive endpoints require DPoP          - Full strict DPoP enforcement
- Low-privilege endpoints open              - Removal of legacy bearer code
```

### Phase 1 — Dual-Mode Non-Blocking Rollout (Current Release: v3.21.0)
- **Status**: ACTIVE
- **Behavior**:
  - Web clients utilizing `useDPoP` generate P-256 key pairs stored in IndexedDB and attach DPoP headers to requests.
  - Route handlers wrapped with `withDPoP(handler, { required: false })` validate DPoP proofs when present, attaching `x-dpop-thumbprint` to request headers.
  - Legacy clients transmitting standard `Authorization: Bearer <token>` headers continue to authenticate without error.
  - `identity_sessions` tracks migrated vs legacy sessions in real-time.

### Phase 2 — Telemetry & Adoption Threshold Evaluation (Weeks 1 – 4)
- **Goal**: Reach $\ge 80\%$ DPoP adoption across active institutional sessions.
- **Monitoring Tools**:
  - Run CLI status: `pnpm identity:migration:status`.
  - Admin Dashboard: Monitor adoption graphs at `/admin/security/identity`.
  - Prometheus Metric: Track `identity_dpop_validation_ms` (target $p95 < 50\text{ ms}$).

### Phase 3 — Progressive Route-Level Enforcement (Sprint-038)
- **Behavior**:
  - High-privilege API routes (Finance, Admin Operations, User Management, Examination Grading) switch to `withDPoP(handler, { required: true })`.
  - Requests lacking valid DPoP proofs on these specific routes receive `401 {"error": "DPoP proof required"}`.
  - Standard read-only endpoints remain in dual mode.

### Phase 4 — Strict Enforcement & Legacy Deprecation (Sprint-039+)
- **Behavior**:
  - Global `withDPoP` default set to `required: true` across all API routes.
  - Legacy JWT issuance disabled in `@thaiba/auth`.
  - Migration complete: 100% of campus API interactions cryptographically attested.

---

## 3. Operational CLI Commands & Health Checks

### Check Real-Time Migration Status via CLI
```bash
# Execute CLI migration reporter
pnpm identity:migration:status

# Sample Output:
# {
#   "total": 1240,
#   "migrated": 1054,
#   "legacy": 186,
#   "percentage": 85.0
# }
```

### Verify DPoP Validation Overhead
```bash
# Query Prometheus OpenMetrics
curl -s "http://localhost:3000/api/system/metrics?format=prometheus" | grep identity_dpop
```

---

## 4. Rollback & Emergency Contingency Procedures

If unanticipated client incompatibility or network proxy interference causes widespread `401 DPoP proof invalid` errors, execute the following emergency rollback sequence:

### Step 1: Disable Strict Enforcement via Environment Variable
Set the emergency bypass environment variable:
```bash
# In production environment / Kubernetes ConfigMap:
DPOP_ENFORCE_STRICT="false"
```
The `withDPoP` middleware immediately falls back to optional verification, allowing all valid legacy JWT bearers to authenticate normally.

### Step 2: Clear Client-Side Corrupted Key Stores
If a browser extension or corrupted IndexedDB state prevents key generation, users or support staff can execute the following console command:
```javascript
// Browser developer console recovery
indexedDB.deleteDatabase("thaibahive_identity");
location.reload();
```
The `useDPoP` hook will automatically regenerate a fresh, non-extractable key pair on subsequent page load.

---

## 5. Security & Audit Verification Matrix

| Verification Check | Target Standard | Operational Evidence |
|---|---|---|
| Access Token Expiration | 10 Minutes (`10m`) | Verified in `packages/auth/session.ts` |
| Replay Cache Window | 5 Minutes (`300s`) | Verified in `src/lib/identity/dpop-engine.ts` |
| Key Storage Security | Non-Extractable IndexedDB | Verified in `src/lib/hooks/use-dpop.ts` |
| Tamper-Proof Audit | Cryptographic Append-Only | Verified in `identity-audit-events.ts` |
| Rollback Impact | Zero User Disruption | Validated in dual-mode fallback testing |
