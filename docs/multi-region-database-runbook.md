# Multi-Region Read-Replica & Failover Architecture Runbook

**Sprint Reference:** Sprint-034 (v3.18.0)  
**Classification:** Enterprise Platform Operations Runbook  
**Target Audience:** DevOps, Platform Engineers, Site Reliability Engineers

---

## 1. Architecture Topology

ThaibaHive utilizes an intelligent dual-pool database connection model:

```
                  ┌─────────────────────────────────────────┐
                  │          Next.js / Node.js API          │
                  │  (ReplicaQueryRouter @thaiba/db)        │
                  └───────────────┬─────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │ (Write Mutations / Sticky Reads)                │ (Read-Only SELECTs)
         ▼                                                 ▼
┌─────────────────┐                               ┌─────────────────┐
│ Primary Database│ ═══════ WAL Streaming ══════> │  Read Replicas  │
│  (Read/Write)   │   (Synchronous/Async Rep)     │  (Replica 1..N) │
└─────────────────┘                               └─────────────────┘
```

### Key Components:
- **`ReplicaQueryRouter` (`packages/db/replica-router.ts`):** Dynamically splits `INSERT`/`UPDATE`/`DELETE` mutations to Primary and `SELECT` queries across healthy read-replicas.
- **Read-Your-Own-Writes Session Pinning:** Automatically routes read queries to the Primary database for 2000ms after any mutation from the active session to eliminate replication lag staleness.
- **`ReplicaHealthTracker` (`src/lib/db/replica-health.ts`):** Measures WAL replay lag across replicas. Automatically isolates nodes exceeding the 5000ms threshold.
- **`FailoverDetector` (`src/lib/db/failover-detector.ts`):** Evaluates Primary health pings. Trips circuit breaker to `OPEN` after 3 consecutive failures and designates the replica with least WAL lag for promotion.

---

## 2. Environment Variables & Configuration

```bash
# Primary database connection string (Required)
DATABASE_URL="postgres://user:password@primary-db.internal:5432/thaibahive"

# Comma-separated list of read-replica endpoints (Optional)
DB_REPLICA_URLS="postgres://user:password@replica-us-east.internal:5432/thaibahive,postgres://user:password@replica-eu-central.internal:5432/thaibahive"

# Global read-replica kill switch (default: true)
DB_READ_REPLICAS_ENABLED="true"

# Emergency failover alert webhook (Optional)
DATABASE_FAILOVER_WEBHOOK_URL="https://alerts.thaibahive.com/webhooks/db-failover"

# Shared secret for replica status monitoring
REPLICA_SECRET="<SECURE_RANDOM_SECRET>"
```

---

## 3. Operational Health Checks & Monitoring

### Check Cluster Health
```bash
curl -H "x-replica-secret: $REPLICA_SECRET" https://thaibahive.com/api/system/replica-status
```

Expected JSON response:
```json
{
  "timestamp": "2026-08-19T12:00:00.000Z",
  "clusterStatus": "healthy",
  "primaryHealthy": true,
  "totalReplicas": 2,
  "healthyReplicas": 2,
  "replicas": [
    {
      "id": "replica-1",
      "url": "postgres://replica-us-east",
      "isHealthy": true,
      "lagMs": 18,
      "totalQueriesRouted": 2450
    }
  ]
}
```

---

## 4. Disaster Recovery & Manual Failover Procedures

### Step 1: Query Failover Circuit Status
```bash
curl -H "Cookie: thaibahive_session=$ADMIN_TOKEN" https://thaibahive.com/api/system/failover
```

### Step 2: Manually Promote Candidate Replica
```bash
curl -X POST https://thaibahive.com/api/system/failover \
  -H "Cookie: thaibahive_session=$ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "promote", "replicaId": "replica-1"}'
```

### Step 3: Reset Circuit after Primary Recovery
```bash
curl -X POST https://thaibahive.com/api/system/failover \
  -H "Cookie: thaibahive_session=$ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'
```
