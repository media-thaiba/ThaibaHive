# Autonomous Forensic Copilot & Threat Investigation Runbook
**Sprint-041 Operational Runbook | AIOS Forensics Architecture**

---

## 1. Overview
The Autonomous Forensic Copilot performs multi-stage threat correlation across disjoint security telemetry layers (Device Trust, WebAuthn/DPoP auth logs, Edge WAF, and Micro-Segmentation ACLs), constructing attack DAGs and root-cause timelines in $< 30$ seconds.

---

## 2. MITRE ATT&CK Stage Mapping
Signals ingested by the copilot are automatically mapped into MITRE ATT&CK tactical stages:
1. **INITIAL_ACCESS:** Impossible travel anomalies, unknown device fingerprints, suspicious ASN logins.
2. **CREDENTIAL_ACCESS:** High-frequency authentication failure storms, credential stuffing patterns.
3. **DEFENSE_EVASION:** User-agent tampering, disabled firewalls, unencrypted local disks.
4. **LATERAL_MOVEMENT:** Unauthorized micro-segmentation service cross-calls, port scans.
5. **IMPACT:** Data exfiltration bursts, destructive payload attempts.

---

## 3. Investigation Workflow
1. Navigate to `/admin/security/zero-trust` $\to$ **Supply Chain & Forensics** tab.
2. Click **Run Forensic Investigation** or submit telemetry payload via API (`POST /api/admin/security/zero-trust/forensics`).
3. Inspect the synthesized Directed Acyclic Graph (DAG) for parent-child relationship causality.
4. Review the auto-generated executive summary and recommended SOAR containment playbooks.
5. Verify that the incident report is permanently sealed into the SHA-256 Merkle audit trail.
