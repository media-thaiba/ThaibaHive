# Disaster Recovery Drill & Chaos Engineering Operational Runbook

**Sprint Reference:** SPRINT-035 (v3.19.0)  
**Classification:** Enterprise Platform Reliability & Operations Manual  
**Last Updated:** 2026-08-19  

---

## 1. Overview & Architecture

ThaibaHive includes an enterprise-grade automated Chaos Engineering and Disaster Recovery Drill Harness. This framework enables continuous validation of multi-region resilience, failover automation, and tenant data isolation.

### Key Objectives
- **Zero Data Loss (RPO = 0s):** Validates that no committed transactions are lost during unexpected outages or failovers.
- **Sub-30s Recovery (MTTR < 30s):** Validates that service disruption, promotion of standby replicas, and read/write recovery complete in under 30 seconds.
- **Tenant Isolation:** Ensures zero cross-tenant query bleeding during regional disasters.

---

## 2. Safety Guardrails & Environment Fencing

Disaster recovery failure injection is strictly fenced to prevent unintended disruption:
1. **Feature Flag Fencing:** `DR_CHAOS_ENABLED=true` must be explicitly configured in the environment.
2. **Auto-Expiring Faults:** All injected faults (primary drops, network partitions, replica lag) automatically expire after their configured TTL (default: 60,000ms).
3. **Emergency Abort:** Calling `POST /api/system/dr/drill` with `{ "action": "abort" }` instantly terminates active drills and restores normal routing circuits.

---

## 3. Supported Drill Scenarios

| Scenario ID | Description | Injected Fault | Success Criteria |
| :--- | :--- | :--- | :--- |
| `PRIMARY_OUTAGE` | Simulates primary database crash / network drop | `DATABASE_PRIMARY_DROP` on primary node | Auto-failover circuit trips after 3 probes, candidate promoted, MTTR < 30s, RPO = 0s. |
| `REGIONAL_PARTITION` | Simulates geographic network partition in a region | `NETWORK_PARTITION` on `eu-central` | Geo-affinity router falls back to default pool; zero cross-tenant bleeding. |
| `CACHE_DESYNC` | Simulates Redis mesh disconnect between regions | `REDIS_MESH_PARTITION` on regional cluster | Vector clocks detect causal divergence; LWW resolves concurrent mutations. |
| `MULTI_TENANT_ISOLATION_DRILL` | Injects synthetic un-scoped tenant queries | Synthetic test query | Runtime `TenantGuard` blocks queries; 0 data leaks detected. |

---

## 4. CLI Execution Guide

### Running a Disaster Recovery Drill
```bash
# Execute dry run simulation
pnpm dr:drill --scenario=primary-outage --dry-run

# Execute live primary outage drill
pnpm dr:drill --scenario=primary-outage

# Execute regional partition drill
pnpm dr:drill --scenario=regional-partition

# Output formatted JSON report
pnpm dr:drill --scenario=primary-outage --json
```

---

## 5. Incident Response & Troubleshooting

If a drill encounters an unexpected failure or hangs:
1. Trigger the emergency abort:
   ```bash
   curl -X POST http://localhost:3000/api/system/dr/drill \
     -H "Content-Type: application/json" \
     -H "x-dr-secret: $DR_DRILL_SECRET" \
     -d '{"action": "abort"}'
   ```
2. Inspect the latest drill report at `reports/dr-drill-report.json`.
3. Check the failover circuit state at `GET /api/system/failover`.
