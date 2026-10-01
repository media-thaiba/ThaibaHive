import { DslStep } from "../dsl/schema";
import { interpolateStepInput, interpolateTemplateString } from "../dsl/parser";
import { ToolExecutor, toolExecutor } from "../../tools/executor";
import { TenantContext } from "../../tools/contract";

export interface StepExecutionResult {
  stepKey: string;
  status: "completed" | "failed" | "awaiting_approval" | "skipped";
  output?: any;
  error?: string;
  nextStepKey?: string;
  approvalRequired?: {
    permission: string;
    severity: "critical" | "high" | "medium" | "low";
  };
}

export class StepRunner {
  private executor: ToolExecutor;

  constructor(executor?: ToolExecutor) {
    this.executor = executor || toolExecutor;
  }

  public async runStep(
    step: DslStep,
    scope: Record<string, any>,
    tenant: TenantContext
  ): Promise<StepExecutionResult> {
    const stepType = step.type || "action";

    // 1. Action Node
    if (stepType === "action") {
      if (!step.tool) {
        return {
          stepKey: step.key,
          status: "failed",
          error: `Action step '${step.key}' missing tool property.`,
        };
      }

      // Check step-level approval gate
      if (step.approval && step.approval.required) {
        return {
          stepKey: step.key,
          status: "awaiting_approval",
          approvalRequired: {
            permission: step.approval.permission || "agent:workflows:approve",
            severity: step.approval.severity || "medium",
          },
        };
      }

      const interpolatedInput = interpolateStepInput(step.input || {}, scope);
      const agentId = step.agent || "system-agent";

      const toolRes = await this.executor.executeTool(agentId, step.tool, interpolatedInput, tenant);
      if (toolRes.status === "success") {
        return {
          stepKey: step.key,
          status: "completed",
          output: toolRes.output,
        };
      } else {
        return {
          stepKey: step.key,
          status: "failed",
          error: toolRes.error || "Tool execution failed",
        };
      }
    }

    // 2. Branch Node
    if (stepType === "branch") {
      const conditionStr = step.condition ? interpolateTemplateString(step.condition, scope) : "true";
      const isTrue = this.evaluateCondition(conditionStr, scope);

      const nextStepKey = isTrue ? (step.then || (step as any).thenStep) : (step.else || (step as any).elseStep);
      return {
        stepKey: step.key,
        status: "completed",
        output: { conditionResult: isTrue },
        nextStepKey,
      };
    }

    // 3. Parallel Node
    if (stepType === "parallel") {
      const childSteps = step.steps || [];
      const childResults = await Promise.all(
        childSteps.map((child: DslStep) => this.runStep(child, scope, tenant))
      );

      const failedChild = childResults.find((r) => r.status === "failed");
      if (failedChild) {
        return {
          stepKey: step.key,
          status: "failed",
          error: `Parallel branch child '${failedChild.stepKey}' failed: ${failedChild.error}`,
          output: childResults,
        };
      }

      return {
        stepKey: step.key,
        status: "completed",
        output: childResults,
      };
    }

    // 4. Wait Node
    if (stepType === "wait") {
      const waitMs = step.waitMs || 10;
      await new Promise((res) => setTimeout(res, waitMs));
      return {
        stepKey: step.key,
        status: "completed",
        output: { waitedMs: waitMs },
      };
    }

    return {
      stepKey: step.key,
      status: "completed",
      output: {},
    };
  }

  private evaluateCondition(condition: string, scope?: Record<string, any>): boolean {
    try {
      // Safe regex evaluation for basic operators: ==, !=, >=, <=, >, <
      const match = condition.match(/(.+?)\s*(===|==|!=|>=|<=|>|<)\s*(.+)/);
      if (!match) {
        return condition.trim().toLowerCase() === "true";
      }

      const left = this.parseValue(match[1].trim(), scope);
      const op = match[2].trim();
      const right = this.parseValue(match[3].trim(), scope);

      switch (op) {
        case "==":
        case "===":
          return left == right;
        case "!=":
        case "!==":
          return left != right;
        case ">":
          return left > right;
        case "<":
          return left < right;
        case ">=":
          return left >= right;
        case "<=":
          return left <= right;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private parseValue(val: string, scope?: Record<string, any>): any {
    if (val === "true") return true;
    if (val === "false") return false;
    if (val === "null") return null;
    if (val === "undefined") return undefined;

    // Quoted string literal
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }

    // Number literal
    if (!isNaN(Number(val)) && val !== "") {
      return Number(val);
    }

    // Scope variable lookup (e.g. runMode or trigger.runMode)
    if (scope) {
      if (scope.trigger && scope.trigger[val] !== undefined) {
        return scope.trigger[val];
      }
      if (scope[val] !== undefined) {
        return scope[val];
      }
      if (val.includes(".")) {
        const parts = val.split(".");
        let curr: any = scope;
        for (const p of parts) {
          if (curr === undefined || curr === null) break;
          curr = curr[p];
        }
        if (curr !== undefined) return curr;
      }
    }

    return val;
  }
}

export const stepRunner = new StepRunner();
