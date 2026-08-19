# Runbook: Human-in-the-Loop Approval Queue Operations

## Overview
This runbook covers administrative operations, triage guidelines, and resolution procedures for the Human-in-the-Loop Security Approval Queue (`ApprovalQueue`).

---

## 1. When Approvals Are Required
An incoming security threat triggers the approval workflow when:
1. **Confidence Score 60% - 79%**: The threat reputation engine detected suspicious behavior with medium confidence.
2. **High-Impact Flag (`high_impact: true`)**: Actions such as subnet-wide CIDR containment (`/24`) or full account lockouts that could impact legitimate campus operations require mandatory administrative confirmation.
3. **Manual Execution Policy**: Playbooks configured with `auto_execute: false`.

---

## 2. Review & Resolution Workflow
1. Access `/admin/security/orchestration`.
2. Review items in the **Pending Security Approvals** card.
3. Check the target entity type, confidence score, and trigger details:
   - **Approve**: Dispatches the playbook execution immediately with the logged administrator ID.
   - **Reject**: Cancels the pending mitigation and logs the rejection reason to the Merkle audit trail.
4. **TTL Expiration**: Pending items automatically expire after 24 hours (86,400s) if not resolved.

---

## 3. Escalation Matrix
- **Critical Subnet Containments**: Lead SOC Analyst or System Administrator.
- **VIP Account Security Holds**: Campus CISO or Security Director.
- **Threat Intel Feed Anomaly Holds**: Platform Engineering Team.
