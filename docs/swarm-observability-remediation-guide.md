# Swarm Observability & Self-Healing Remediation Runbook

## Overview
This runbook guides administrators in managing the real-time agent swarm topology, performance telemetry metrics, compliance monitors, and automated healing workflows in ThaibaHive.

---

## 1. Navigating the Swarm Console

Access the console via: `/admin/swarm-intelligence`

### Dashboard Widgets:
1. **Swarm Node Topology:**
   - Visualizes the 3-tier Global -> Regional -> Local coordinator mapping.
   - Highlights partitioned (disconnected) node communication links with animated warning styles.
   - Click nodes to view individual heartbeats, tiers, and health telemetry indexes.
2. **Vector-Mesh Sync Telemetry:**
   - Real-time line graph plotting sync latencies and batch sizes.
   - Use the timeframe toggle (1h, 24h, 7d) to filter historical values.
3. **Continuous Compliance Monitor:**
   - Displays real-time checks matching GDPR, HIPAA, SOC2, FERPA, and MoE standards.
   - Click failed metrics to inspect details and manually trigger self-healing remediation.
4. **Remediation Workflows History:**
   - Timeline log tracking state transitions for healing actions.
   - Gated high-severity remediations wait under `PENDING_APPROVAL` status. Click "Approve" or "Reject" to resume execution.

---

## 2. Telemetry Configuration

Set filters dynamically inside `event-bus.ts` to control log levels and CPU utilization:

```typescript
import { EventBus } from "@/lib/observability/event-bus";

// Adjust telemetry filter configuration
EventBus.getInstance().setFilters({
  minSeverity: "error", // Emit warning and critical events only
  metricsEnabled: true
});
```

---

## 3. Troubleshooting & Rollbacks

If a self-healing healer fails during execution, the remediation engine automatically triggers compensation actions.

- **Check History API:** `GET /api/admin/remediation/history`
- **Replay CLI:** Run `npx ts-node src/scripts/swarm-playback.ts` to execute a chronological playback of events and diagnose conflicts.
- **Visual Replay Control:** Access `/admin/swarm-intelligence` and toggle "Enter Playback Mode" to visually pause, play, step-forward, and scrub trace history chronologically.
- **Edge Telemetry Compression:** Edge nodes transmit compressed batches (gzip/brotli) to the ingestion endpoint `/api/admin/swarm/telemetry` under `Content-Encoding: gzip/br` to reduce network overhead. Outbound SSE text streams also support automatic gzip encoding.
- **Index Parity Checker:** Run `npx tsx scripts/sync-sqlite-indexes.ts` to automate index comparisons between SQLite and PostgreSQL schemas.

