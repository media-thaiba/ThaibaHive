import { AgentRegistry } from "../core/registry";
import { AgentMessageBus } from "../core/message-bus";
import { ReasoningPort, StubReasoningPort, ReasoningRequest, ReasoningResponse } from "./reasoning-port";
import { agentDbStore, AgentDbStore } from "../../db/agent-store";

export interface TaskDelegationRequest {
  taskId?: string;
  agentId: string;
  taskName: string;
  input: Record<string, any>;
  institutionId?: string;
  traceId?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface TaskDelegationResult {
  taskId: string;
  agentId: string;
  status: "completed" | "failed" | "timed_out" | "escalated_to_hitl";
  output?: any;
  error?: string;
  attempts: number;
  durationMs: number;
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number; costEstimateUsd?: number };
}

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private registry: AgentRegistry;
  private bus: AgentMessageBus;
  private store: AgentDbStore;
  private reasoningPort: ReasoningPort;

  constructor(options?: {
    registry?: AgentRegistry;
    bus?: AgentMessageBus;
    store?: AgentDbStore;
    reasoningPort?: ReasoningPort;
  }) {
    this.registry = options?.registry || AgentRegistry.getInstance();
    this.bus = options?.bus || AgentMessageBus.getInstance();
    this.store = options?.store || agentDbStore;
    this.reasoningPort = options?.reasoningPort || new StubReasoningPort();
  }

  public static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  public setReasoningPort(port: ReasoningPort): void {
    this.reasoningPort = port;
  }

  /**
   * Boot-time recovery scan: Finds any runs in 'running' state and recovers or re-queues them.
   */
  public async recoverStuckRuns(tenantId: string = "global"): Promise<{ recoveredCount: number; resumedRunIds: string[] }> {
    const runningRuns = await this.store.listWorkflowRuns(tenantId, undefined, "running");
    const resumedRunIds: string[] = [];

    for (const run of runningRuns) {
      // Mark as resumed or re-evaluate status
      await this.store.updateWorkflowRun(run.id, {
        status: "pending",
        contextJson: JSON.stringify({
          ...JSON.parse(run.contextJson || "{}"),
          recoveredAt: new Date().toISOString(),
          recoveryReason: "Boot-time crash recovery scan",
        }),
      }, tenantId);
      resumedRunIds.push(run.id);
    }

    return {
      recoveredCount: resumedRunIds.length,
      resumedRunIds,
    };
  }

  /**
   * Delegate a task to a specialized agent with timeout, retry, and LLM fallback.
   */
  public async delegateTask(request: TaskDelegationRequest): Promise<TaskDelegationResult> {
    const taskId = request.taskId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tenantId = request.institutionId || "global";
    const timeoutMs = request.timeoutMs || 10000;
    const maxRetries = request.maxRetries ?? 2;

    const agent = this.registry.getAgent(request.agentId, tenantId);
    if (!agent) {
      return {
        taskId,
        agentId: request.agentId,
        status: "failed",
        error: `Agent ${request.agentId} is not registered in tenant ${tenantId}`,
        attempts: 0,
        durationMs: 0,
      };
    }

    this.registry.adjustLoad(request.agentId, 1);
    this.registry.updateStatus(request.agentId, "active");

    const startTime = Date.now();
    let attempts = 0;
    let lastError = "";

    while (attempts <= maxRetries) {
      attempts++;
      try {
        const reasoningPromise = this.reasoningPort.reason({
          prompt: `Task: ${request.taskName}\nInput: ${JSON.stringify(request.input)}`,
          systemPrompt: `You are ${agent.role} (Agent ID: ${agent.id}). Execute domain reasoning.`,
          institutionId: tenantId,
          traceId: request.traceId,
        });

        // Wrap with timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Task execution timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const response: ReasoningResponse = await Promise.race([reasoningPromise, timeoutPromise]);

        this.registry.adjustLoad(request.agentId, -1);
        this.registry.updateStatus(request.agentId, "idle");

        return {
          taskId,
          agentId: request.agentId,
          status: "completed",
          output: {
            content: response.content,
            toolCalls: response.toolCalls,
          },
          attempts,
          durationMs: Date.now() - startTime,
          tokenUsage: response.tokenUsage,
        };
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (attempts <= maxRetries) {
          // Exponential backoff
          await new Promise((res) => setTimeout(res, Math.pow(2, attempts) * 50));
        }
      }
    }

    this.registry.adjustLoad(request.agentId, -1);
    this.registry.updateStatus(request.agentId, "idle");

    const isTimeout = lastError.includes("timed out");
    return {
      taskId,
      agentId: request.agentId,
      status: isTimeout ? "timed_out" : "escalated_to_hitl",
      error: lastError,
      attempts,
      durationMs: Date.now() - startTime,
    };
  }
}

export const agentOrchestrator = AgentOrchestrator.getInstance();
