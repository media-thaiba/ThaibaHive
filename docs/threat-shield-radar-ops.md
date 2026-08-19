# Admin Threat Shield Radar Operations Guide

**Version:** 1.0 (Sprint-038)  
**Author:** Implementation Engineer  
**Classification:** Operational Runbook  

---

## 1. Overview

The Admin Threat Shield Radar provides security administrators with real-time visibility into traffic volume, 429 throttling rates, active IP/subnet quarantines, and circuit breaker status.

Location: `/admin/security/gateway`

---

## 2. Dashboard Features

1. **Core Metric Cards:**
   - **Total Requests Tracked:** Aggregate multi-tenant volume.
   - **Rate Limit Throttles (429):** Cumulative requests throttled due to quota violations.
   - **Active IP Quarantines:** Current count of temporary and permanent IP bans.
   - **Edge Latency (p95):** Synthetic probe latency with health indicator.

2. **Circuit Breaker Controls:**
   - Visual badge displaying current state (`CLOSED`, `HALF_OPEN`, `OPEN`).
   - Emergency 1-click **Trip to Degraded Mode** button during critical incidents.
   - 1-click **Restore Normal Mode (Reset)** button once traffic normalizes.

3. **Active IP Quarantines Table:**
   - List of all quarantined IPs and `/24` subnets.
   - Threat score, reason, banned by, and expiration countdown.
   - 1-click **Unban** button for immediate remediation of false positives.
   - **+ Add IP Quarantine** dialog for manual operator bans.

---

## 3. RBAC Permissions Required

- `system:security:view`: View dashboard metrics and active quarantines.
- `system:security:manage`: Apply manual IP bans, remove quarantines, and override circuit breaker.
