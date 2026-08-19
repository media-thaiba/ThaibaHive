# Real-Time Compliance Monitoring & Anomaly Response Guide

## Overview

ThaibaHive Institution OS provides a real-time compliance telemetry and anomaly detection engine that intercepts mutations and evaluates them against regulatory guardrails in sub-millisecond timeframes.

---

## Core Detection Rules

| Rule ID | Name | Severity | Condition & Trigger |
| :--- | :--- | :--- | :--- |
| `UNAUTHORIZED_PRIVILEGE_ESCALATION` | Unauthorized Privilege Escalation | `CRITICAL` | Non-super-admin assigns `super_admin` or `admin` role without elevation token. |
| `BULK_DATA_EXPORT_SPIKE` | Bulk Data Export Spike | `HIGH` | Single actor/IP performs > 5 exports in 10 minutes or exports > 500 records in one action. |
| `FINANCIAL_THRESHOLD_BYPASS` | Dual-Authorization Bypass | `HIGH` | Mutation exceeding $50,000 without verified secondary approver signature. |
| `OFF_HOURS_ADMIN_MUTATION` | Off-Hours Config Mutation | `MEDIUM` | Destructive configuration changes executed between 23:00 and 05:00 UTC. |
| `CROSS_TENANT_QUERY_ANOMALY` | Cross-Tenant Access Anomaly | `CRITICAL` | Queries attempting access outside assigned tenant partition boundary. |

---

## Observability & Prometheus Metrics

The compliance engine exports standard Prometheus metrics on `/api/system/metrics`:

```prometheus
# HELP thaibahive_compliance_violations_total Total detected compliance violations
# TYPE thaibahive_compliance_violations_total counter
thaibahive_compliance_violations_total{severity="CRITICAL",rule="UNAUTHORIZED_PRIVILEGE_ESCALATION"} 0
thaibahive_compliance_violations_total{severity="HIGH",rule="BULK_DATA_EXPORT_SPIKE"} 1

# HELP thaibahive_compliance_score_gauge Real-time compliance health score (0-100)
# TYPE thaibahive_compliance_score_gauge gauge
thaibahive_compliance_score_gauge 92

# HELP thaibahive_audit_crypto_latency_ms Average cryptographic audit hashing latency in ms
# TYPE thaibahive_audit_crypto_latency_ms gauge
thaibahive_audit_crypto_latency_ms 0.450
```

---

## Violation Triage & Resolution Workflow

1. **Monitor Admin Compliance Dashboard:** Navigate to `/admin/compliance` to view live violation radar and severity breakdown.
2. **Review Violation Context:** Click **Triage** on any open incident to review the event payload, actor IP, user agent, and timestamp.
3. **Update Status:**
   - `ACKNOWLEDGED`: Incident is actively under investigation by the security team.
   - `RESOLVED`: Legitimate justification verified or remedial rollback applied.
   - `FALSE_POSITIVE`: Authorized maintenance action or approved load drill.
4. **Document Resolution Notes:** Always provide clear audit notes explaining the resolution rationale.
