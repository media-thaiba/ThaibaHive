# Operational Runbook: Hardened Redis PubSub Quarantine Mesh

## Overview
The Quarantine Mesh propagates IP quarantines, subnet containments, and circuit breaker trip states across all active edge nodes in real time (< 50ms propagation latency) using Redis PubSub channel `security:quarantine:events`.

## Architecture
- **Transport**: Redis PubSub with LRU message deduplication window (1,000 message IDs).
- **Dual-Store Persistence**: In-memory hash table + Bloom filter for sub-millisecond route checks, with asynchronous dual-write persistence to SQLite (`ip_quarantines` table) / PostgreSQL.
- **Cold-Start Warming**: Upon node bootstrap, active unexpired quarantines are loaded into the Bloom filter and memory cache within 5ms.

## Operational Procedures
1. **Verify Mesh Latency**: Monitor OpenMetrics series `mesh_pubsub_sync_latency_seconds` and `mesh_pubsub_events_total`.
2. **Redis Disconnection Recovery**: If Redis fails, the adapter seamlessly falls back to local in-process event dispatching without throwing unhandled exceptions.
3. **Emergency Cluster Purge**: In the event of a false-positive flood, use `/api/admin/security/gateway/quarantines` to unban specific subnets or reset the quarantine manager.
