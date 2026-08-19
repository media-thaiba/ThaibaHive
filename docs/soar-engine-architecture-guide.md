# Architecture Guide: SOAR Engine Architecture & Execution Runtime

## 1. Overview
The ThaibaHive Security Orchestration, Automation, and Response (SOAR) engine provides autonomous, deterministic threat response across network, identity, and edge infrastructure.

```mermaid
graph TD
    Trigger[Threat Event Ingestion] --> Matcher[TriggerMatcher]
    Matcher --> Gate[ConfidenceGate]
    Gate -->|Confidence >= 80%| Orchestrator[SoarOrchestrator]
    Gate -->|60% <= Confidence < 80%| Approval[ApprovalQueue]
    Gate -->|Confidence < 60%| LogOnly[Merkle Chain Log]
    Approval -->|SOC Admin Approves| Orchestrator
    Orchestrator --> Actions[Action Execution Pipeline]
    Actions -->|Step Failure| SAGA[SAGA Compensation Handler (LIFO)]
    Orchestrator --> Audit[SoarAuditLogger (SHA-256 Merkle Chain)]
    Orchestrator --> Metrics[SoarMetricsTracker (OpenMetrics)]
```

## 2. Core Engine Components
- **State Machine**: Supports `IDLE`, `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `COMPENSATING`, `COMPENSATED`, `COMPENSATION_FAILED`, and `CANCELLED`.
- **Condition Evaluator**: Safe evaluation of relational, regex, and CIDR subnet containment expressions without `eval()`.
- **Context Interpolation**: Dynamic variable binding using JSONPath syntax (`{{trigger.ip}}`, `{{steps.step_1.output.rule_id}}`).
- **SAGA Compensation Handler**: Automatic reverse execution in Last-In First-Out (LIFO) order upon downstream step failures.
- **Distributed Concurrency**: Redis Redlock mutex locking with in-memory fallback, preventing race conditions on shared network targets.
- **Multi-Node Sync**: Event broadcasting across cluster nodes via PubSub mesh channels.
