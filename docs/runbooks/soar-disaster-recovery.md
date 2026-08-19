# Runbook: SOAR Engine Disaster Recovery & Multi-Node Resynchronization

## Overview
This runbook guides platform engineers in recovering the SOAR engine and synchronizing state across cluster nodes following Redis outages, database partitions, or catastrophic failover.

---

## 1. Failure Modes & Graceful Fallbacks

### A. Redis Cluster Partition
- **Impact**: Distributed locks fall back to local in-process concurrency control. Multi-node PubSub sync degrades to localized in-memory broadcasting.
- **Recovery**:
  1. Once Redis connectivity is restored, `DistributedLock` automatically attempts Redis locks on subsequent operations.
  2. `SoarMeshSync` resynchronizes active execution state.

### B. Database Outage
- **Impact**: In-memory state machine and active executions continue uninterrupted. Async persistence failures are captured non-blockingly.
- **Recovery**:
  1. Once database is accessible, historical execution logs are written.
  2. Run `pnpm tsx scripts/compliance/snapshot-reconstruct.ts` if forensic verification is needed.

---

## 2. Cluster Resynchronization Procedure
1. Verify node connectivity across Redis cluster.
2. Trigger health check probe: `GET /api/admin/security/soar/metrics`.
3. Verify `soar_pending_approvals_total` and `soar_playbook_executions_total` match across nodes.
4. Execute `pnpm tsx scripts/security/soar-simulation-runner.ts` to perform end-to-end operational verification across all 4 disaster recovery scenarios.
