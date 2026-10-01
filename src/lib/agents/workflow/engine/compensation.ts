import { ToolRegistry, toolRegistry } from "../../tools/tool-registry";
import { TenantContext } from "../../tools/contract";

export interface ExecutedStepRecord {
  stepKey: string;
  toolName?: string;
  input: any;
  output: any;
  status: string;
}

export interface RollbackSummary {
  runId: string;
  compensatedSteps: string[];
  failedCompensations: Array<{ stepKey: string; error: string }>;
  success: boolean;
}

export class CompensationCoordinator {
  private registry: ToolRegistry;

  constructor(registry?: ToolRegistry) {
    this.registry = registry || toolRegistry;
  }

  public async rollbackRun(
    runId: string,
    executedSteps: ExecutedStepRecord[],
    tenant: TenantContext
  ): Promise<RollbackSummary> {
    const compensatedSteps: string[] = [];
    const failedCompensations: Array<{ stepKey: string; error: string }> = [];

    // Execute compensators in reverse order (Saga pattern)
    const reversed = [...executedSteps].reverse();

    for (const step of reversed) {
      if (step.status !== "completed" || !step.toolName) {
        continue;
      }

      const tool = this.registry.getTool(step.toolName, tenant.institutionId);
      if (tool && typeof tool.compensate === "function") {
        try {
          const compRes = await tool.compensate(step.input, step.output, {
            tenant,
            toolName: step.toolName,
            invokedAt: new Date().toISOString(),
          });

          if (compRes.success) {
            compensatedSteps.push(step.stepKey);
          } else {
            failedCompensations.push({ stepKey: step.stepKey, error: compRes.error || "Compensator returned false" });
          }
        } catch (err: any) {
          failedCompensations.push({ stepKey: step.stepKey, error: err?.message || String(err) });
        }
      }
    }

    return {
      runId,
      compensatedSteps,
      failedCompensations,
      success: failedCompensations.length === 0,
    };
  }
}

export const compensationCoordinator = new CompensationCoordinator();
