# Failover & Rollback Standard Operating Procedure (SOP)

**Sprint Reference:** SPRINT-035 (v3.19.0)  
**Classification:** Incident Response & Operational Runbook  
**Last Updated:** 2026-08-19  

---

## 1. Automated vs. Manual Failover Decision Matrix

| Condition | Action | Automation |
| :--- | :--- | :--- |
| Primary database fails 3 consecutive health probes (15s total) | Circuit breaker trips to `OPEN`, alert dispatched, candidate replica elected | Automated via `FailoverDetector` |
| Scheduled maintenance / planned primary migration | Operator promotes standby node via `POST /api/system/failover` | Manual / Scheduled |
| Split-brain mitigation or transient network flap | Circuit breaker switches to `HALF_OPEN` for canary probe verification | Automated |

---

## 2. Automated Failover Verification Procedure

To run an end-to-end automated failover test:
```bash
pnpm dr:verify:failover
```
This executes:
1. Pre-failure canary transaction batch write
2. Primary fault injection
3. Automated circuit breaker tripping and replica promotion
4. Post-failover write validation
5. RPO = 0s (zero lost transactions) and MTTR < 30s assertions.

---

## 3. Post-Incident Rollback & Demotion SOP

When the original primary node is restored following an incident:
```bash
pnpm dr:verify:rollback
```

### Steps:
1. Reconfigure original primary node as a replica/follower.
2. Allow WAL replay offsets to catch up with promoted primary.
3. Verify 100% table and schema checksum parity using `scripts/db/replica-parity-check.ts`.
4. Perform graceful switchback during maintenance window.
5. Reset circuit breaker state:
   ```bash
   curl -X POST http://localhost:3000/api/system/failover \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <super_admin_jwt>" \
     -d '{"action": "reset"}'
   ```
