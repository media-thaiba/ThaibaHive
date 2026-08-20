# ThaibaHive EngageOS — System Operator & Incident Response Runbook

## 1. Subsystem Overview & Health Checks

EngageOS operators monitor system performance and dispatch rates via:
- **Admin Control Center**: `/admin/operations/engage-os`
- **Prometheus Telemetry**: `/api/metrics` scraping `engage_*` series
- **CLI Simulation**: `pnpm engage:simulate`

---

## 2. Common Operational Procedures

### 2.1 Provider Delivery Outage (Twilio / AWS SES)
- **Symptom**: `engage_delivery_failures_total` counter spiking; delivery rate drops below 95%.
- **Action**:
  1. Inspect `/api/engage/analytics` for provider response codes.
  2. The `FallbackEngine` automatically routes traffic to secondary channels (e.g. Email &rarr; Push/In-App, SMS &rarr; Voice/Push).
  3. If persistent carrier outage, adjust priority threshold in `routing-engine.ts`.

### 2.2 Unsubscribe & Consent Inquiries (GDPR DSAR Request)
- **Procedure**:
  1. Navigate to `/portal/engagement` or call `ComplianceAuditLogger.exportDsarPackage(recipientId)`.
  2. Export JSON/PDF compliance bundle and verify Merkle root consistency via `pnpm compliance:verify`.

### 2.3 Emergency Campus Broadcast
- **Procedure**:
  1. Set `priority: "critical"` on dispatch payload.
  2. System bypasses non-emergency opt-outs, frequency caps, and quiet hours to broadcast via Voice IVR, Push, and SMS simultaneously.
