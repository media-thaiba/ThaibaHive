# Autonomous Federated Governance & Multi-Campus Operational Resilience
### ThaibaHive v2.4.0 — Architecture Guide (Sprint-013)

---

## 1. Overview

Sprint-013 transforms ThaibaHive into an **autonomous federated governance ecosystem** with:
- Cross-institutional policy synchronization
- Self-healing infrastructure (circuit breakers, DLQ retry, index tuning)
- Mobile offline-first sync with LWW conflict resolution
- Executive voice intelligence copilot layer

All 4 phases operate under strict **multi-tenant isolation** guarantees.

---

## 2. Architecture Diagram

```
                          ┌──────────────────────────────────────────┐
                          │     ThaibaHive Federated Control Plane   │
                          └──────────────────────────────────────────┘
                                           │
          ┌────────────────┬───────────────┼───────────────┬────────────────┐
          ▼                ▼               ▼               ▼                ▼
 ┌──────────────┐  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 │ Policy Sync  │  │  Audit Agg.  │ │ Circuit Bkr  │ │  DLQ Retry   │ │ Voice Copilot│
 │ Engine       │  │  & PII Mask  │ │  (per-inst.) │ │  Handler     │ │  (STT+NLP)   │
 └──────┬───────┘  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        │
        ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │              Database Tier (SQLite dev / PostgreSQL prod)            │
 │  federated_policies │ policy_versions │ cross_tenant_role_mappings   │
 │  federated_audit_logs │ circuit_breaker_states │ dlq_retry_queue    │
 │  database_index_metrics │ offline_sync_outbox │ voice_query_logs    │
 └──────────────────────────────────────────────────────────────────────┘
        ▲
        │  Mobile Offline Push/Pull
 ┌──────────────────────┐
 │  Flutter Mobile App   │
 │  OfflineSyncQueue     │
 │  ConflictResolver     │
 │  NetworkStateDetector │
 │  VoiceCopilotScreen  │
 └──────────────────────┘
```

---

## 3. Phase 1: Federated Governance Foundation

### 3.1 Policy Lifecycle

```
Admin creates policy → PolicySyncEngine.createPolicy()
   → SHA-256 content hash stored (PolicyVersionManager)
   → propagatePolicy() → multicasts to target institutions
   → receiveReplicatedPolicy() → hash verified → ACTIVE
```

**Conflict Resolution:** If `version` collision with different hash → `CONFLICT` status. Admin must call `resolveConflict()` to produce a new version.

### 3.2 Key Services

| Service | File | Responsibility |
|---|---|---|
| `PolicySyncEngine` | `src/lib/federated/policy-sync-engine.ts` | Policy CRUD, propagation, conflict resolution |
| `PolicyVersionManager` | `src/lib/federated/policy-version-manager.ts` | SHA-256 versioning, history, integrity verification |
| `FederatedAuditAggregator` | `src/lib/federated/federated-audit-aggregator.ts` | Immutable audit logging, PII masking |
| `CrossTenantRoleMapper` | `src/lib/federated/cross-tenant-role-mapper.ts` | Privilege-validated cross-institution role mappings |

### 3.3 RBAC Permissions Added

| Permission | Granted To |
|---|---|
| `federated:policies` | `super_admin`, `admin` |
| `federated:audit` | `super_admin`, `admin`, `principal` |
| `resilience:manage` | `super_admin`, `admin` |
| `voice:copilot` | `super_admin`, `admin`, `principal`, `hod` |

---

## 4. Phase 2: Self-Healing Infrastructure

### 4.1 Circuit Breaker Pattern

```
Request → QueryCircuitBreaker.execute(fn)
  [CLOSED]  → execute fn → success → stay CLOSED
  [CLOSED]  → execute fn → failure (n >= threshold) → OPEN
  [OPEN]    → reject immediately or fallback
  [OPEN]    → cooldown expires → HALF_OPEN
  [HALF_OPEN] → success × 3 → CLOSED
  [HALF_OPEN] → failure → OPEN (re-trip)
```

**State isolation** — Each circuit breaker instance is per-institution. `generateBypassToken()` produces tokens scoped to the instance; `validateBypassToken()` rejects foreign tokens.

### 4.2 DLQ Retry with Exponential Backoff

$$T_{wait}(n) = 2^n \times 1000\text{ms} + \text{jitter}(0\text{–}200\text{ms})$$

Jobs escalate: `PENDING → SUCCESS` or `QUARANTINED` when `maxAttempts` is exhausted.

### 4.3 Database Index Tuner

`DatabaseIndexTuner` collects `p99` latencies from `QueryMetricsCollector`, runs anomaly scoring, and generates `CREATE INDEX CONCURRENTLY` DDL recommendations — never executing directly.

---

## 5. Phase 3: Mobile Offline Engine

### 5.1 Sync Architecture

```
Mobile → OfflineSyncQueue (SQLite outbox)
       → NetworkStateDetector (connectivity events)
       → AutoSyncService.triggerSync() on reconnect
       → POST /api/mobile/v1/sync/push
       → SyncConflictResolver.resolveMutation() [server]
       → Response: merged record or conflict marker
       → GET  /api/mobile/v1/sync/pull
       → Flutter ConflictResolver (Dart LWW)
```

### 5.2 Last-Write-Wins (LWW) Rules

| Field | Behaviour |
|---|---|
| `id` | Always from server (immutable) |
| `institutionId` | Always from server (immutable — prevents cross-tenant escalation) |
| `tenantId` | Always from server (immutable) |
| `createdAt` | Always from server (immutable) |
| All other fields | Client wins if `clientTimestamp > serverUpdatedAt` |

### 5.3 Conflict Status Codes

| Status | Meaning |
|---|---|
| `SYNCED` | Clean merge, no conflicts |
| `CONFLICT` | 1–2 field conflicts; auto-resolved to server |
| `NEEDS_REVIEW` | 3+ fields conflict; admin intervention required |

---

## 6. Phase 4: Executive Voice Intelligence

### 6.1 Voice Pipeline

```
Push-to-Talk / Audio Buffer
  → SpeechToTextAdapter.processAudioInput()
    → AudioStreamParser (PCM/WAV metadata extraction)
    → STT Engine (Web Speech API / provider)
  → VoiceQueryParser.parseTranscript()
    → Keyword + phonetic entity extraction
    → Intent classification
  → Synthesized voice response (TTS)
  → POST /api/admin/voice/query (guarded: voice:copilot)
```

### 6.2 Recognized Intents

| Intent | Trigger Keywords |
|---|---|
| `GET_ATTENDANCE_SUMMARY` | attendance, absent |
| `GET_FINANCIAL_MARGIN` | financial, margin, revenue, budget |
| `SIMULATE_BUDGET` | simulate, what if + budget/financial |
| `GET_RISK_ALERT` | risk, alert, retention |
| `GENERAL_QUERY` | (fallback) |

### 6.3 Campus Entity Extraction

Recognizes: `north`, `south`, `main`, `west`, `east` → maps to `campus-{name}`.

---

## 7. Database Schema (9 New Tables)

| Table | Purpose |
|---|---|
| `federated_policies` | Cross-institution governance rules |
| `policy_versions` | Versioned policy history with SHA-256 hashes |
| `cross_tenant_role_mappings` | Validated inter-institution role grants |
| `federated_audit_logs` | Immutable compliance audit trail |
| `database_index_metrics` | Query latency + index recommendation records |
| `circuit_breaker_states` | Per-service circuit state persistence |
| `dlq_retry_queue` | Dead-letter queue with exponential backoff |
| `offline_sync_outbox` | Mobile client mutation staging |
| `voice_query_logs` | Voice copilot query audit trail |

---

## 8. API Endpoints Reference

### Federated Governance

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET/POST/PATCH/DELETE` | `/api/admin/federated/policies` | `federated:policies` | Policy CRUD |
| `GET` | `/api/admin/federated/audit-logs` | `federated:audit` | Compliance audit logs |
| `GET/POST/DELETE` | `/api/admin/federated/role-mappings` | `federated:policies` | Role mapping management |

### Self-Healing Infrastructure

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET/POST` | `/api/admin/resilience/index-tuning` | `resilience:manage` | Index recommendations |
| `GET/POST/DELETE` | `/api/admin/resilience/circuit-breaker` | `resilience:manage` | Circuit breaker state management |
| `GET/POST/PATCH` | `/api/admin/resilience/dlq-retry` | `resilience:manage` | DLQ retry management |

### Mobile Sync

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/api/mobile/v1/sync/push` | Authenticated | Push offline mutations |
| `GET` | `/api/mobile/v1/sync/pull` | Authenticated | Pull latest server state |

### Voice Intelligence

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/api/admin/voice/query` | `voice:copilot` | Submit voice query for NLP resolution |

---

## 9. Security Guarantees

| Category | Guarantee |
|---|---|
| Policy Sync | SHA-256 integrity verification on all replicated payloads |
| Tenant Isolation | `institutionId` is immutable in LWW merge — no cross-tenant escalation |
| PII Masking | Email/phone/SSN/salary fields auto-redacted in audit exports |
| Circuit Breakers | Instance-scoped — Tenant A OPEN state never affects Tenant B |
| Bypass Tokens | Scoped to single circuit breaker instance; cross-instance tokens rejected |
| Role Mappings | `super_admin` cross-tenant target is a hard-blocked forbidden operation |
| DLQ Queues | Each handler maintains independent queue — no cross-tenant job access |

---

## 10. Rollback Strategy

| Component | Rollback Procedure |
|---|---|
| DB Schema | Run `DROP TABLE IF EXISTS` in reverse order; Drizzle migration rollback |
| API Routes | Remove route files; clear Next.js cache |
| Flutter Files | Revert via Git; `flutter clean && flutter pub get` |
| Feature Flags | Disable `federated:policies` / `voice:copilot` permissions in `roles.ts` |

---

*Generated: Sprint-013 | ThaibaHive v2.4.0 | 2026-08-01*
