# ThaibaHive Incident Runbook: Emergency Agent Kill-Switch & Blast Radius Containment

**Document ID**: RUNBOOK-AIG-003  
**Sprint**: Sprint-100 (Autonomous Multi-Agent Workflow Orchestration)  
**Audience**: Super Admins, Incident Commanders, Security Operations Center (SOC)  
**Classification**: Emergency Protocol  

---

## 1. Incident Triggers & Decision Matrix

Engage the Emergency Agent Kill-Switch immediately upon encountering any of the following scenarios:
1. **Unintended Mass Modification**: An agent is executing continuous unapproved writes or financial allocations.
2. **Looping Invocations**: An uncontrolled recursive agent loop flooding system resources.
3. **Security Boundary Breach**: Evidence of unauthorized prompt injection or tool execution across tenant boundaries.
4. **Physical Safety Hazard**: Erroneous security lockdown triggers or automated facility overrides.

---

## 2. Emergency Kill-Switch Engagement Procedure (D12)

The Kill-Switch immediately terminates all in-flight agent tasks, halts the workflow engine, and rejects all incoming execution requests for the targeted tenant (or globally).

### 2.1 Web Cockpit Engagement
1. Navigate to `/admin/agents` in the management console.
2. Click the red **Emergency Kill-Switch** button in the header.
3. Verify your re-authentication prompt (must have authenticated within the last **5 minutes**).
4. In the confirmation modal, type the exact confirmation phrase:
   ```text
   CONFIRM HALT ALL AGENTS
   ```
5. Enter the incident ticket number and reason (e.g., `INC-8821: Prompt loop detected in finance agent`).
6. Click **Engage Emergency Halt**.

### 2.2 CLI / Direct API Engagement
In the event of UI unavailability, execute an authenticated POST request:
```bash
curl -X POST https://<hive-domain>/api/agents/guardrails/killswitch \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "engage",
    "confirmationText": "CONFIRM HALT ALL AGENTS",
    "reason": "INC-8821: Emergency containment",
    "sessionAuthenticatedAt": "2026-10-01T14:30:00.000Z"
  }'
```

---

## 3. Containment & In-Flight Run Drain

Once engaged:
1. **All active agent execution workers pause instantly**.
2. **New workflow triggers return `403 Forbidden`** with reason `Emergency kill-switch is currently engaged`.
3. **In-Flight Run Rollback**:
   - Navigate to `/admin/agents/runs`.
   - Filter by status `running` or `awaiting_approval`.
   - Click **Cancel & Compensate** to trigger reverse-order saga rollbacks for affected runs.
   - Or call `POST /api/agents/runs/:id/cancel` with authorization.

---

## 4. Post-Incident Analysis & Merkle Audit Verification

Before releasing the kill-switch, SOC must verify ledger integrity:
1. Run cryptographic Merkle chain verification:
   ```bash
   pnpm test src/lib/agents/__tests__/agent-security-governance.test.ts
   ```
2. Inspect the audit log in the Cockpit (`/admin/agents/audit`) for broken links or tampered entries.
3. Review agent episodic memory entries around the incident timestamp:
   ```bash
   curl -X GET "https://<hive-domain>/api/agents/memory?agentId=finance-agent&limit=50" \
     -H "Authorization: Bearer <TOKEN>"
   ```

---

## 5. Safe Resumption Protocol (Release Procedure)

Only a **Super Admin** or **Regional Admin** with a fresh session (≤ 5 minutes old) can release the kill-switch:
1. Verify root cause remediation is deployed and tested.
2. Navigate to `/admin/agents/guardrails/killswitch`.
3. Type the exact resumption confirmation phrase:
   ```text
   CONFIRM RESUME AGENTS
   ```
4. Click **Disengage Kill-Switch**.
5. Monitor `/api/agents/metrics` for 15 minutes to verify normal operational baseline.
