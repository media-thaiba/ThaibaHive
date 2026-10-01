# ThaibaHive Operations Runbook: Workflow Governance, DSL Versioning & Approvals

**Document ID**: RUNBOOK-AIG-002  
**Sprint**: Sprint-100 (Autonomous Multi-Agent Workflow Orchestration)  
**Audience**: Institutional Admins, Department Chairs, Compliance Officers, DevSecOps  
**Classification**: Institutional Policy & Operational Guide  

---

## 1. Overview & Purpose

ThaibaHive Workflows are declarative, directed acyclic graph (DAG) pipelines orchestrating cross-domain autonomous agent activities. This runbook establishes governance policies for:
- Workflow authoring, validation, and promotion.
- DSL schema versioning and backward compatibility.
- Human-in-the-Loop (HITL) approval gate life cycle, expiry policies, and 409 conflict handling.
- Saga compensation rollback guarantees.

---

## 2. Workflow DSL Lifecycle & Schema Governance

Workflows are defined using JSON/YAML DSL conforming to `WorkflowDslSchema` (`src/lib/agents/workflow/dsl/schema.ts`).

### 2.1 DSL Version Routing
- **Current Version**: `dslVersion: 1`
- The parser (`parseWorkflowDsl`) reads `dslVersion` and dispatches to the corresponding validator.
- Deprecated DSL versions trigger an automatic warning log and schema migration hint.

### 2.2 Structural DAG Validation Rules
Before any workflow is saved to `agenticWorkflows` DB, it must pass `validateWorkflowDsl`:
1. **Uniqueness**: All step keys must be unique within the workflow.
2. **Cycle-Free (Acyclic)**: Depth-First Search (DFS) traversal validates that no branch or sequential step creates an infinite execution loop.
3. **Step Reachability**: Target steps specified in `then` and `else` branch properties must exist in the workflow definition.
4. **Compensation Pairing**: Any write action step must reference a tool with a verified compensating undo function.

---

## 3. Human-in-the-Loop (HITL) Approval Gates

Certain sensitive operations (financial transfers > \$500, disciplinary grade alterations, campus lockdowns) mandate human review before execution proceeds.

### 3.1 Approval Gate Configuration
```json
{
  "key": "step-disburse-grant",
  "type": "action",
  "agent": "finance-agent",
  "tool": "finance.grants.disburse",
  "input": { "grantId": "gr-902", "amount": 12500 },
  "approval": {
    "required": true,
    "permission": "agent:workflows:approve",
    "severity": "high",
    "onExpiry": "escalate",
    "timeoutMs": 86400000
  }
}
```

### 3.2 Expiry Policies (`onExpiry`)
When a gate times out without human interaction:
| Policy | Behavior |
| :--- | :--- |
| `escalate` | Dispatches escalation notification to institution Owner/Super-Admin; gate status remains `pending_escalated`. |
| `hold` | Freezes workflow indefinitely until explicit administrative intervention. |
| `reject` | Automatically rejects the gate and initiates saga rollback across previously executed steps. |

### 3.3 Conflict Resolution (Design Decision D14)
If an approval is submitted concurrently from multiple devices or after the gate has expired/been resolved:
- The API returns **`409 Conflict`**:
  ```json
  {
    "error": "Approval conflict: gate has already been resolved or expired.",
    "result": { "status": "conflict" }
  }
  ```
- The client UI invalidates local state and prompts the user to refresh the gate list.

---

## 4. Saga Compensation & Rollback Audit

If any downstream step encounters an unrecoverable failure or is rejected by an approver:
1. `WorkflowExecutionEngine` pauses forward progression.
2. It transitions the run status to `compensating`.
3. It iterates backwards through all completed steps in **strict reverse chronological order**.
4. For each completed write tool, it invokes `tool.compensate(input, context)`.
5. Each compensation invocation produces a SHA-256 Merkle audit record.
6. Once complete, the run status updates to `rolled_back`.

---

## 5. Standard Operating Procedures (SOP)

### SOP-01: Publishing a New Institutional Workflow Template
1. Draft the workflow definition in the visual designer (`/admin/agents/workflows`).
2. Run validation dry-run via `POST /api/agents/workflows` with dry-run headers.
3. Obtain dual-authorization from Principal and Compliance Officer.
4. Promote template status to `active`.

### SOP-02: Reviewing Pending Approval Gates
1. Navigate to `/admin/agents` (Pending Approvals badge).
2. Inspect step input, agent reasoning trace, and financial/academic impact.
3. Click **Approve** or **Reject** with mandatory justification reason.
