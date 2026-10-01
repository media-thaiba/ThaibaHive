# ThaibaHive Operations Runbook: Agent Lifecycle & Telemetry Operations

**Document ID**: RUNBOOK-AIG-001  
**Sprint**: Sprint-100 (Autonomous Multi-Agent Workflow Orchestration)  
**Audience**: DevOps Engineers, Platform Administrators, Site Reliability Engineers (SRE)  
**Classification**: Internal / Operational  

---

## 1. Overview & Architecture

ThaibaHive's Agentic OS orchestrates five autonomous domain agents across institutional boundaries:
- **AcademicAgent** (`academic-agent`): Attendance reconciliation, grade sheet validation, timetable conflict resolution.
- **FinanceAgent** (`finance-agent`): Fee balance reconciliation, grant milestone validation, payroll disbursement batches.
- **SecurityAgent** (`security-agent`): Emergency physical lockdown triggers, automated security patrol dispatch, license plate recognition (ALPR) alert processing.
- **FacilitiesAgent** (`facilities-agent`): HVAC & smart energy optimization, preventive maintenance scheduling, work order dispatch.
- **HRAgent** (`hr-agent`): Faculty leave balancing, substitute lecturer assignment, compliance credential audits.

Each agent operates under tenant isolation, capability scoping, and rate-limited sandboxing.

---

## 2. Agent Registration & Activation

### 2.1 Viewing Active Agents
Admins can inspect the status and load of all registered agents via:
- **Cockpit UI**: `https://<hive-domain>/admin/agents`
- **REST Endpoint**: `GET /api/agents` (requires `agent:workflows:view` permission)

### 2.2 Agent Concurrency & Load Gates
Each agent has a configured `maxConcurrency` (default: 5 concurrent actions). If `currentLoad >= maxConcurrency`, incoming tasks are queued on the agent's internal message bus queue or rejected if the bus DLQ is full.

To adjust concurrency limits dynamically:
```typescript
import { AgentRegistry } from '@/lib/agents/core/registry';

const registry = AgentRegistry.getInstance();
const agent = registry.getAgent('academic-agent', tenantId);
if (agent) {
  agent.maxConcurrency = 10;
}
```

---

## 3. LLM Reasoning Port & Circuit Breaker Failover

The reasoning subsystem routes agent decisions through the `ReasoningPort` interface:
1. **Primary Port**: `OllamaReasoningPort` (Local Ollama inference, model `qwen2.5-coder:7b` / `qwen3.6`).
2. **Fallback Port**: `StubReasoningPort` (Rule-based heuristics and deterministic decision matrices).

### 3.1 Circuit Breaker Dynamics
- **Failure Threshold**: 3 consecutive failed requests or network timeouts (10s threshold).
- **State Transition**: Moves from `CLOSED` to `OPEN` state.
- **Cooldown Window**: 60 seconds before probing (`HALF_OPEN` state).
- **Graceful Degradation**: When circuit is open, requests automatically fall back to deterministic stub execution without crashing running institutional workflows.

### 3.2 Troubleshooting Ollama Connectivity
If the circuit breaker trips:
1. Verify the local Ollama daemon is running:
   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```
2. Check Ollama memory usage and restart service if stuck:
   ```powershell
   Get-Process ollama | Restart-Service
   ```
3. Test inference manually:
   ```bash
   ollama run qwen2.5-coder:7b "ping"
   ```

---

## 4. Telemetry & OpenMetrics Monitoring

ThaibaHive exposes an OpenMetrics (Prometheus-compatible) endpoint:
- **Endpoint**: `GET /api/agents/metrics?tenantId=<tenant_id>`
- **Permission**: `agent:telemetry:view`
- **Format**: `text/plain; version=0.0.4; charset=utf-8`

### 4.1 Key Prometheus Metrics
| Metric Name | Type | Description | Alert Threshold |
| :--- | :--- | :--- | :--- |
| `thaibahive_agent_active_count` | Gauge | Currently registered agents | `< 5` during business hours |
| `thaibahive_agent_active_runs` | Gauge | Workflow runs in progress | `> 50` sustained |
| `thaibahive_agent_tool_executions_total` | Counter | Total sandboxed tool invocations | Rate drop > 80% indicates bus issue |
| `thaibahive_agent_tool_duration_seconds` | Histogram | Execution latency per tool | p95 `> 5.0s` |
| `thaibahive_agent_circuit_breaker_state` | Gauge | 0 = Closed (Normal), 1 = Open (Tripped) | `> 0` triggers warning |

### 4.2 Prometheus Scrape Configuration
```yaml
scrape_configs:
  - job_name: 'thaibahive-agents'
    scrape_interval: 15s
    metrics_path: '/api/agents/metrics'
    bearer_token: '${AGENT_METRICS_TOKEN}'
    static_configs:
      - targets: ['app.thaibahive.internal']
```

---

## 5. Token & Cost Budget Enforcement

Every reasoning port enforces strict institutional cost governance:
- `maxTokens`: Per-step token cap (default: 4,096 tokens).
- `maxCostUsd`: Per-run dollar threshold (default: $0.10).
- Exceeding either budget raises `TokenBudgetExceededError` or `CostBudgetExceededError` and transitions the workflow run to `budget_exceeded` state.
