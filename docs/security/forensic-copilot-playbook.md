# Advanced Forensic Root-Cause Analysis Copilot Playbook

## 1. Objective
Automate post-incident root cause analysis by correlating heterogeneous signals across edge WAF, authentication logs, device posture telemetry, micro-segmentation events, and SOAR containment actions.

---

## 2. ATT&CK Stage Mapping & Correlation Matrix

| Source Layer | Event Type Signature | Inferred MITRE ATT&CK Stage |
|---|---|---|
| Device Trust Telemetry | `IMPOSSIBLE_TRAVEL`, `GEO_VELOCITY` | **Initial Access (TA0001)** |
| Auth Logs | `AUTH_FAIL_BURST`, `BRUTE_FORCE` | **Credential Access (TA0006)** |
| Device Trust Telemetry | `TRUST_DROP_UNTRUSTED`, `AGENT_SPOOF` | **Defense Evasion (TA0005)** |
| Micro-Segmentation | `PORT_SCAN_QUARANTINED`, `VLAN_QUARANTINE` | **Lateral Movement (TA0008)** |
| SOAR Playbooks | `LOCKDOWN_COMPLETED`, `CONTAINMENT_ACTIVE` | **Impact / Remediation (TA0040)** |

---

## 3. Incident Investigation Workflow
1. **Signal Ingestion**: `ForensicCopilot.analyze(signals)` aggregates multi-layer events for an actor or entity.
2. **Timeline Synthesis**: Synthesizes millisecond-ordered chronological attack progression.
3. **DAG Reconstruction**: Produces node/edge directed acyclic graph connecting Actor $\to$ Stage $\to$ Signal $\to$ Containment.
4. **Executive Reporting**: Generates markdown and JSON investigation reports with recommended remediations in $< 30$ seconds.
5. **Merkle Audit Integrity**: Every generated investigation report is hashed with SHA-256 and appended to the immutable audit chain.
