import { AgentRegistry } from "../core/registry";
import { AgentDbStore } from "../../db/agent-store";
import { AgentKillSwitch } from "../guardrails/kill-switch";

export class AgentMetricsExporter {
  private static instance: AgentMetricsExporter;

  public static getInstance(): AgentMetricsExporter {
    if (!AgentMetricsExporter.instance) {
      AgentMetricsExporter.instance = new AgentMetricsExporter();
    }
    return AgentMetricsExporter.instance;
  }

  public async exportOpenMetrics(tenantId: string = "global"): Promise<string> {
    const registry = AgentRegistry.getInstance();
    const store = AgentDbStore.getInstance();
    const killSwitch = AgentKillSwitch.getInstance();

    const agents = registry.listAgents(tenantId);
    const runs = await store.listWorkflowRuns(tenantId);
    const invocations = await store.listToolInvocations(tenantId);
    const approvalGates = await store.listApprovalGates(tenantId);

    const activeRuns = runs.filter((r) => r.status === "running").length;
    const completedRuns = runs.filter((r) => r.status === "completed").length;
    const failedRuns = runs.filter((r) => r.status === "failed").length;
    const rolledBackRuns = runs.filter((r) => r.status === "rolled_back").length;
    const pendingApprovals = approvalGates.filter((g) => g.status === "pending").length;
    const isKillSwitchEngaged = killSwitch.isEngaged(tenantId) ? 1 : 0;

    let totalDurationMs = 0;
    invocations.forEach((inv) => {
      totalDurationMs += inv.durationMs || 0;
    });
    const avgDurationSeconds = invocations.length > 0 ? totalDurationMs / invocations.length / 1000 : 0;

    const lines: string[] = [
      "# HELP agent_count Total registered autonomous domain agents",
      "# TYPE agent_count gauge",
      `agent_count{tenant="${tenantId}"} ${agents.length}`,
      "",
      "# HELP agent_workflow_runs_total Total workflow runs processed by status",
      "# TYPE agent_workflow_runs_total counter",
      `agent_workflow_runs_total{tenant="${tenantId}",status="running"} ${activeRuns}`,
      `agent_workflow_runs_total{tenant="${tenantId}",status="completed"} ${completedRuns}`,
      `agent_workflow_runs_total{tenant="${tenantId}",status="failed"} ${failedRuns}`,
      `agent_workflow_runs_total{tenant="${tenantId}",status="rolled_back"} ${rolledBackRuns}`,
      "",
      "# HELP agent_pending_approvals_count Current pending human-in-the-loop approval gates",
      "# TYPE agent_pending_approvals_count gauge",
      `agent_pending_approvals_count{tenant="${tenantId}"} ${pendingApprovals}`,
      "",
      "# HELP agent_killswitch_engaged State of emergency killswitch (0=nominal, 1=halted)",
      "# TYPE agent_killswitch_engaged gauge",
      `agent_killswitch_engaged{tenant="${tenantId}"} ${isKillSwitchEngaged}`,
      "",
      "# HELP agent_tool_invocations_total Total tool executions recorded in Merkle audit ledger",
      "# TYPE agent_tool_invocations_total counter",
      `agent_tool_invocations_total{tenant="${tenantId}"} ${invocations.length}`,
      "",
      "# HELP agent_tool_execution_duration_seconds_avg Average tool execution latency in seconds",
      "# TYPE agent_tool_execution_duration_seconds_avg gauge",
      `agent_tool_execution_duration_seconds_avg{tenant="${tenantId}"} ${avgDurationSeconds.toFixed(4)}`,
      "",
    ];

    // Per-agent metrics
    for (const agent of agents) {
      lines.push(
        `agent_load_concurrency{tenant="${tenantId}",agent="${agent.id}",domain="${agent.domain}"} ${agent.currentLoad}`,
        `agent_max_concurrency{tenant="${tenantId}",agent="${agent.id}",domain="${agent.domain}"} ${agent.maxConcurrency}`
      );
    }

    return lines.join("\n") + "\n";
  }
}

export const agentMetricsExporter = AgentMetricsExporter.getInstance();
