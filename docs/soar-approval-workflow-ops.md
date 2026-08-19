# Operational Guide: Human-in-the-Loop Security Approval Workflow Operations

## 1. Trigger Conditions for Approval Staging
Security playbooks are diverted to the Human-in-the-Loop Approval Queue (`ApprovalQueue`) under any of the following conditions:
1. **Confidence Score 60% to 79%**: Threat indicators with intermediate credibility require administrative confirmation before containment actions take effect.
2. **High-Impact Operations (`high_impact: true`)**: Actions with wide blast radiuses (such as `/24` subnet containment or VIP account lockout) always require human authorization.
3. **Manual Policy Mode**: Playbooks configured with `auto_execute: false`.

## 2. Review and Resolution Process
1. Navigate to `/admin/security/orchestration`.
2. Inspect the **Pending Security Approvals** panel.
3. Review the trigger event metadata, target entity (IP, Subnet, User), and confidence rating.
4. **Approve**: Dispatches the playbook execution pipeline immediately with the logged administrator ID.
5. **Reject**: Cancels the pending mitigation and writes a rejection record to the SHA-256 Merkle audit chain.
6. **TTL Auto-Expiry**: Any approval item untouched after 24 hours (86,400s) automatically transitions to `EXPIRED` status.
