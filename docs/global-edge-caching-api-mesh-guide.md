# Global Edge Caching & Federated API Mesh Architecture Guide

This guide details the design, configuration, and operation of the Edge Caching, dynamic query routing, and federated GraphQL gateway infrastructure introduced in Sprint-018.

---

## 1. Executive Edge Architecture

ThaibaHive's edge layer intercepts client HTTP traffic at geographic zones nearest to the caller. This architecture consists of three core components:

```
[User Request] 
      │
      ▼
┌──────────────┐
│  Cloudflare  │ (Anycast Routing / SSL termination)
│  Edge Node   │
└──────┬───────┘
       │ (Geo IP, Client IP Headers)
       ▼
┌──────────────┐
│ Edge Worker  │ ──► [Edge memory / KV Cache check (HIT: sub-100ms response)]
│ (worker.ts)  │ ──► [Rate-limiter window validation]
└──────┬───────┘
       │ (Cache MISS / Mutating writes)
       ▼
┌──────────────┐
│  Federated   │ (Splits query fields via AST query-planner)
│ GraphQL Gate │ (Proxy calls to regional nodes in parallel)
└──────┬───────┘
       │ (Geo routing logic)
       ▼
┌──────────────┐
│ Regional DB  │ (Routing reads to Standby replica, writes to Primary node)
│ Read Replica │ (Connection pools recycled using hyperdrive shims)
└──────────────┘
```

---

## 2. Dynamic Query Routing Settings

The query router (`src/lib/database/edge-router.ts`) monitors standby read-replica lag using the `clusterNodes` registry.
- **Write Operations:** Directed exclusively to `PRIMARY` postgres nodes.
- **Read Operations:** Directed to the closest regional `READ_REPLICA` standbys.
- **Replication Lag Fallback Threshold:** If a replica's replication lag exceeds **2,000ms** or it becomes unreachable, queries failback to the `PRIMARY` database node to prevent dirty reads.

---

## 3. Distributed Rate Limiting

The token-bucket rate limiter (`src/lib/edge/rate-limiter.ts`) runs on edge nodes:
- **Authenticated users:** Bounded to **100 requests per minute**.
- **Anonymous requests:** Bounded to **20 requests per minute**.
- Limits are checked locally in worker memory with asynchronous updates to regional Redis clusters to keep latencies at sub-1ms.

---

## 4. Multi-Tier Cache Eviction Pipeline

Stale data is prevented through Drizzle hook-triggered invalidation paths:
- Cache keys use the format `thaiba:{tenantId}:domain:key` to align cluster slots by tenant boundaries.
- **Global cache evictions:** Propagate within **5 seconds** via `/api/admin/cache/invalidate` webhook listeners.

---

## 5. Dynamic Schema Federation

Microservice GraphQL schemas are stitched together dynamically. If schema registry merges fail, the gateway rolls back to the last stable schema configuration to guarantee uptime.
- Endpoint: `/api/graphql/federated`
- Status check: `/api/admin/federation/status`
- Hot reload config: `/api/admin/federation/schema/reload`
