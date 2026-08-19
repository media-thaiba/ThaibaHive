# Cross-Region Redis Synchronization & Mesh Operations Manual

**Sprint Reference:** SPRINT-035 (v3.19.0)  
**Classification:** Distributed Cache Infrastructure & Operations Manual  
**Last Updated:** 2026-08-19  

---

## 1. Cross-Region Invalidation Mesh Architecture

ThaibaHive employs a distributed cache invalidation mesh across geographic regions. When a tenant mutates data in one region, cache purge events are broadcast across Redis Pub/Sub channels to invalidate peer cache nodes within < 100ms.

### Invalidation Event Envelope:
```json
{
  "id": "inval_eu-central_1787126000000_a1b2",
  "sourceRegion": "eu-central",
  "keys": ["user:101", "dept:math"],
  "tags": ["tag:inst-101"],
  "vectorClock": {
    "region": "eu-central",
    "counter": 42,
    "logicalTimestamp": 1787126000000
  },
  "timestamp": "2026-08-19T12:00:00.000Z"
}
```

---

## 2. Vector Clocks & Last-Write-Wins (LWW) Conflict Resolution

When concurrent mutations occur in distinct regions for the same cache entry:
1. **Vector Clock Comparison:** `VectorClock.compare(other)` evaluates whether an event strictly happened before, happened after, or is concurrent.
2. **Deterministic Resolution:** If concurrent (`CONCURRENT`), `CacheConflictResolver` applies Last-Write-Wins (LWW) arbitration using hybrid logical timestamps.
3. **Causal Anomaly Invalidation:** If a causal violation is detected, the cache key is purged entirely, forcing a clean reload from the primary database.

---

## 3. Telemetry & Observability

### Endpoint: `GET /api/system/cache-sync-status`
Returns real-time cluster health:
- `meshStatus`: `healthy` | `degraded` | `partitioned`
- `averageLatencyMs`: Average cross-region sync latency (< 100ms SLA)
- `totalEventsBroadcast`: Total invalidation messages dispatched
- `totalConflictsResolved`: Count of concurrent updates resolved via LWW

### Prometheus Metrics:
- `thaibahive_cache_sync_mesh_status`
- `thaibahive_cache_sync_latency_ms`
- `thaibahive_cache_sync_events_total`
- `thaibahive_cache_conflicts_total`

---

## 4. Operational Troubleshooting

If a regional Redis cluster becomes unreachable:
- The local node gracefully degrades to local caching with zero thrown unhandled rejections.
- Upon network healing, the node resynchronizes and clears stale cached entries.
