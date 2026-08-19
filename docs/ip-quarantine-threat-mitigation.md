# Automated IP Quarantine & Threat Mitigation Guide

**Version:** 1.0 (Sprint-038)  
**Author:** Implementation Engineer  
**Classification:** Operational Runbook  

---

## 1. Overview

The Automated IP Quarantine subsystem actively calculates reputation scores for client IPs based on sliding-window security threat signals.
When threat thresholds are violated, the system automatically isolates the offending IP or entire `/24` subnet and broadcasts the ban across all edge nodes within < 50ms.

---

## 2. Threat Signal Weighting

| Threat Signal | Weight | Description |
| :--- | :--- | :--- |
| `cross_tenant_probe` | +30 | Attempting to access resources belonging to another tenant |
| `dpop_replay` | +25 | Replaying cryptographic DPoP proof JTI |
| `stepup_failure` | +20 | Failing WebAuthn or MFA step-up verification |
| `invalid_jwt` | +15 | Sending malformed or forged JWT credentials |
| `not_found_scan` | +5 | Probing non-existent endpoints (404 scan) |
| `rate_limit_violation` | +5 | Repeated 429 rate limit breaches |

---

## 3. Threat Classifications

- **0–29:** `clean` (Normal operations)
- **30–69:** `suspicious` (Soft scrutiny, lower rate limit thresholds)
- **70–89:** `malicious` (Strict rate limits, mandatory step-up prompts)
- **90–100:** `banned` (Automatic quarantine ban triggered)

---

## 4. Subnet Auto-Containment

If **3 or more distinct IP addresses** within the same `/24` CIDR block (e.g. `198.51.100.0/24`) trigger quarantine within a 10-minute window, the system automatically expands the quarantine mask to the entire `/24` subnet to prevent distributed IP hopping.

---

## 5. Administrative Unban & Allowlisting

Operators can manage bans via `/admin/security/gateway` or using the Quarantine API:
```bash
# Unban IP
DELETE /api/admin/security/gateway/quarantines?ip=198.51.100.45
```
