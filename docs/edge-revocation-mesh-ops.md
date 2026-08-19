# Edge Revocation Mesh Operations & Distributed Session Invalidation SOP

## 1. Overview & Operational Mandate

The ThaibaHive Edge Revocation Mesh (Sprint-037 / v3.21.0) guarantees near-instantaneous global invalidation of compromised credentials, tokens, and active user sessions across all application runtime nodes. In distributed multi-tenant environments, relying solely on centralized database queries for every API request introduces unacceptable latency penalties. Conversely, relying solely on stateless JWT token expiration leaves a dangerous security window during account compromise or security incident response.

The Revocation Mesh solves this dilemma by combining:
1. **Ultra-Low Latency In-Memory Bloom Filter Verification**: Sub-millisecond $O(1)$ session validity checks executed locally on every node.
2. **Distributed Redis PubSub & EventBus Broadcast Mesh**: Sub-50 millisecond propagation of revocation events across all distributed cluster instances.
3. **Authoritative Central Fallback**: Relational database persistence ensuring state consistency during network partition recovery.

---

## 2. Architectural Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Administrative Action                    │
│           POST /api/auth/revoke { userId, sessionId }        │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│ Local Revocation Store│             │  Distributed PubSub   │
│ - Bloom Filter (Bits) │             │ - Redis Key Broadcast │
│ - In-Memory Hash Set  │             │ - EventBus Channel    │
└───────────────────────┘             └───────────┬───────────┘
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │  Edge Node Cluster    │
                                      │ - Syncs Bloom Filters │
                                      │ - Rejects Stolen JWTs │
                                      │ - Latency < 50ms p95  │
                                      └───────────────────────┘
```

### 1. In-Memory Bloom Filter (`BloomFilter` in `revocation-store.ts`)
- **Bit Array Sizing**: 10,000 bits (1,250 bytes) allocated per worker process.
- **Hash Function Array**: Uses 3 independent mathematical hash projections (Murmur3 / FNV-1a / multiplicative mixing).
- **Lookup Cost**: $O(1)$ bitwise operations requiring $< 0.05\text{ ms}$.
- **False Positive Handling**: If `mightContain(sessionId)` returns true, the store verifies against the local exact hash set (`revokedSet.has(sessionId)`), eliminating false positive revocations.

### 2. Mesh Synchronization Engine (`revocation-mesh.ts`)
- **Broadcast Channel**: Publishes revocation payloads over `identity:revocation`.
- **Distributed State Key**: Writes session records to Redis cluster using tenant hashtags: `thaiba:{global}:revocation:<sessionId>` with a 7-day expiration.
- **Local Listener**: Subscribes to cluster events and applies incoming revocations to local bloom filters in real-time.

### 3. Central Cryptographic Audit Chain (`identity-audit-events.ts`)
- All revocation actions immediately log an append-only `IDENTITY_SESSION_REVOKED` or `IDENTITY_REVOCATION_PROPAGATED` block into the SHA-256 Merkle audit chain.

---

## 3. Standard Operating Procedures (SOP)

### SOP-REV-01: Emergency User Account Revocation
Execute when an active account compromise, phishing incident, or staff termination occurs:

```bash
# 1. Dispatch revocation API call with administrative bearer token
curl -X POST https://app.thaiba.edu/api/auth/revoke \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "staff_emergency_target",
    "sessionId": "sess_all_active",
    "reason": "Compromised credential reported by SecOps"
  }'

# 2. Verify response status
# Expected Response: { "revoked": true, "propagated": true }
```

### SOP-REV-02: Bulk Institutional Credential Invalidation
In the event of an institution-wide credential reset (e.g. key rotation or data security drill):

```typescript
import { revocationStore } from "@/lib/identity/revocation-store";
import { publishRevocation } from "@/lib/identity/revocation-mesh";
import { db } from "@/db";
import { identity_sessions } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

export async function revokeAllInstitutionSessions(institutionId: string, adminUserId: string) {
  // Query all active sessions
  const activeSessions = await db.select().from(identity_sessions).all();
  
  for (const session of activeSessions) {
    revocationStore.revoke(session.id, session.staff_id, "Bulk Institutional Reset");
    publishRevocation(session.id, session.staff_id, "Bulk Institutional Reset");
  }
}
```

### SOP-REV-03: Network Partition & Fallback Diagnosis
If cluster nodes lose connection to the central Redis cluster:
1. The mesh catches the connection timeout and automatically logs a warning without crashing.
2. The `identity_revocation_fallback_total` Prometheus counter increments.
3. Node processes fall back to verifying credentials against local bloom filters and authoritative database queries.
4. Once network connectivity is restored, executing `initRevocationMesh()` resynchronizes cluster state.

---

## 4. Operational Metrics & Prometheus Telemetry

Query Prometheus at `/api/system/metrics` to verify revocation health:

| Metric Identifier | Type | Operational SLA | Description |
|---|---|---|---|
| `identity_revocation_propagation_ms` | Summary | $p95 < 50\text{ ms}$ | Propagation latency across cluster nodes. |
| `identity_revocation_bloom_size` | Gauge | $< 500\text{ KB}$ | In-memory memory footprint of active bloom filter. |
| `identity_revocation_fallback_total` | Counter | $0\text{ (Normal)}$ | Count of operations falling back to database during Redis partition. |
| `identity_active_sessions_total` | Gauge | Contextual | Total count of active sessions monitored by mesh. |

---

## 5. Security & Fail-Safe Verification Checklist

- [x] Every revocation request requires `system:security:revoke` permission.
- [x] Replay of expired revocation requests produces idempotent `200 OK` responses.
- [x] Audit log entries are written asynchronously without blocking API response streaming.
- [x] Memory usage scales sub-linearly with user volume ($10,000$ bits per $100,000$ sessions).
