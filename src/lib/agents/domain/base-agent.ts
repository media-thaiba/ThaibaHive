import { ReasoningPort, ReasoningRequest, ReasoningResponse } from "../orchestrator/reasoning-port";
import { ToolExecutor } from "../tools/executor";
import { ToolRegistry } from "../tools/tool-registry";
import { TenantContext } from "../tools/contract";
import { AgentDomain } from "../core/types";

export interface AgentExecutionContext {
  tenant: TenantContext;
  goal: string;
  context?: Record<string, any>;
  maxIterations?: number;
  confidenceThreshold?: number;
}

export interface AgentExecutionStep {
  iteration: number;
  thought: string;
  toolCall?: { name: string; input: any };
  toolResult?: any;
}

export interface AgentExecutionResult {
  agentId: string;
  domain: AgentDomain;
  status: "success" | "requires_approval" | "failed";
  finalResponse: string;
  steps: AgentExecutionStep[];
  confidence: number;
  durationMs: number;
  requiresApproval?: {
    toolName: string;
    input: any;
    severity: "low" | "medium" | "high" | "critical";
    reason: string;
  };
}

export abstract class BaseAgent {
  public abstract readonly id: string;
  public abstract readonly role: string;
  public abstract readonly domain: AgentDomain;
  public abstract readonly allowedTools: string[];
  public abstract readonly defaultSystemPrompt: string;

  protected reasoningPort: ReasoningPort;
  protected executor: ToolExecutor;
  protected registry: ToolRegistry;

  constructor(options: {
    reasoningPort: ReasoningPort;
    executor?: ToolExecutor;
    registry?: ToolRegistry;
  }) {
    this.reasoningPort = options.reasoningPort;
    this.executor = options.executor || ToolExecutor.getInstance();
    this.registry = options.registry || ToolRegistry.getInstance();
  }

  public async run(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const maxIterations = context.maxIterations || 5;
    const confidenceThreshold = context.confidenceThreshold || 0.75;
    const steps: AgentExecutionStep[] = [];

    // Filter tools for this agent
    const availableTools = this.allowedTools
      .map((name) => this.registry.getTool(name, context.tenant.institutionId))
      .filter(Boolean);

    const toolDefs = availableTools.map((t) => ({
      name: t!.name,
      description: t!.description,
      parameters: {}, // schema parameters
    }));

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const prompt = `Goal: ${context.goal}\nContext: ${JSON.stringify(context.context || {})}\nPrior steps: ${JSON.stringify(steps)}`;
      
      const response: ReasoningResponse = await this.reasoningPort.reason({
        prompt,
        systemPrompt: this.defaultSystemPrompt,
        tools: toolDefs,
        institutionId: context.tenant.institutionId,
        traceId: context.tenant.traceId,
      });

      const thought = response.content;

      // If the LLM requests a tool execution
      if (response.toolCalls && response.toolCalls.length > 0) {
        const call = response.toolCalls[0];
        const tool = this.registry.getTool(call.name, context.tenant.institutionId);

        // Pre-flight check: if high/critical risk or requires explicit approval, stop and request approval
        if (tool && (tool.riskLevel === "critical" || tool.riskLevel === "high")) {
          return {
            agentId: this.id,
            domain: this.domain,
            status: "requires_approval",
            finalResponse: `Action requires human-in-the-loop approval: ${call.name}`,
            steps,
            confidence: 0.95,
            durationMs: Date.now() - startTime,
            requiresApproval: {
              toolName: call.name,
              input: call.arguments,
              severity: tool.riskLevel,
              reason: `High risk tool '${call.name}' requires authorization`,
            },
          };
        }

        const toolRes = await this.executor.executeTool(this.id, call.name, call.arguments, context.tenant);
        steps.push({
          iteration,
          thought,
          toolCall: { name: call.name, input: call.arguments },
          toolResult: toolRes.output || toolRes.error,
        });

        if (toolRes.status !== "success") {
          return {
            agentId: this.id,
            domain: this.domain,
            status: "failed",
            finalResponse: `Tool execution failed: ${toolRes.error}`,
            steps,
            confidence: 0.2,
            durationMs: Date.now() - startTime,
          };
        }
      } else {
        // Completed reasoning loop
        steps.push({ iteration, thought });
        return {
          agentId: this.id,
          domain: this.domain,
          status: "success",
          finalResponse: thought,
          steps,
          confidence: 0.9,
          durationMs: Date.now() - startTime,
        };
      }
    }

    return {
      agentId: this.id,
      domain: this.domain,
      status: "success",
      finalResponse: steps[steps.length - 1]?.thought || "Completed max iterations.",
      steps,
      confidence: confidenceThreshold,
      durationMs: Date.now() - startTime,
    };
  }
}
