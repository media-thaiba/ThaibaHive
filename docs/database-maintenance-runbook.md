# Database Maintenance & Cold Storage Archival Runbook

**Sprint Reference:** Sprint-034 (v3.18.0)  
**Classification:** Enterprise Platform Operations Runbook  
**Target Audience:** Database Administrators, Site Reliability Engineers

---

## 1. Automated Maintenance Schedule

Database maintenance is automated via `scripts/db/maintenance-orchestrator.ts` running during off-peak windows (02:00-04:00 UTC):

- **Non-blocking Vacuuming:** `VACUUM (ANALYZE, SKIP_LOCKED)` reclaims space and updates query planner statistics without locking active production tables.
- **WAL Checkpointing:** Passive checkpointing safely flushes transaction logs.
- **Table Bloat Monitoring:** Measures dead tuples and logs fragmentation status.

### Running Maintenance Manually
```bash
# Dry-run inspection
pnpm db:maintenance --dry-run

# Force execution outside off-peak window
pnpm db:maintenance --force
```

---

## 2. Historical Audit Log Cold Storage Archival

Audit logs older than 180 days are exported to compressed gzip archives (`archives/audit-archive-YYYY-MM.jsonl.gz`) with SHA-256 integrity hashes, and safely deleted in batches of 500:

```bash
# Archive records older than 180 days
pnpm db:archive:audit --days=180

# Dry-run simulation
pnpm db:archive:audit --dry-run
```
