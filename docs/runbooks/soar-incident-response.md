# Runbook: SOAR Incident Response & Autonomous Triage

## Overview
This runbook guides Security Operations Center (SOC) engineers and platform administrators through automated incident triage, playbook activation, and manual intervention when autonomous mitigations trigger across the ThaibaHive cluster.

---

## 1. Architecture & Execution Flow
1. **Threat Detection**: Feed ingesters (STIX 2.1, AbuseIPDB, AlienVault OTX) and real-time gateway monitors emit structured threat events.
2. **Trigger Matching**: `TriggerMatcher` filters active playbooks by event type, severity, and attribute conditions.
3. **Confidence Gating**:
   - **$\ge 80\%$ Confidence**: Autonomous execution.
   - **$60 - 79\%$ Confidence / High-Impact**: Queued into `ApprovalQueue`.
   - **$< 60\%$ Confidence**: Logged to Merkle audit chain without active mitigation.
4. **Execution Pipeline**: Steps run sequentially. If any step fails without `continue_on_error: true`, SAGA compensation rolls back previous actions in reverse LIFO order.

---

## 2. Standard Operating Procedures (SOP)

### SOP-01: Monitoring Live Playbook Executions
1. Navigate to `/admin/security/orchestration`.
2. Inspect the **Live Playbook Execution Feed**.
3. Click **Inspect** on any execution to review individual step durations, input parameters, and output results.

### SOP-02: Handling False Positives & Compensation
1. If an IP or subnet was quarantined erroneously:
   - Identify the execution ID in the Execution Feed.
   - If autonomous compensation did not trigger, manually unban the entity via `/admin/security/quarantines` or trigger the corresponding unblock playbook.
2. Review feed confidence scoring rules to adjust trigger thresholds if necessary.

---

## 3. Emergency Killswitch Activation
If abnormal orchestration loops or cascading false positives occur:
1. Access the **SOAR Automation Engine Status** card on `/admin/security/orchestration`.
2. Click **Engage Killswitch** (Requires `system:soar:emergency`).
3. This sets `soarOrchestrator.setEngineEnabled(false)` and broadcasts a cluster-wide mesh notification halting all new automated actions immediately.
