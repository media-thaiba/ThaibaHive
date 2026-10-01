import { WorkflowDsl, DslStep } from "./schema";
import { toolRegistry, ToolRegistry } from "../../tools/tool-registry";

export interface AstValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class WorkflowAstValidator {
  private registry: ToolRegistry;

  constructor(registry?: ToolRegistry) {
    this.registry = registry || toolRegistry;
  }

  public validate(workflow: WorkflowDsl, institutionId: string = "global"): AstValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const stepKeys = new Set<string>();
    const outgoingEdges = new Map<string, string[]>();

    // 1. Collect all steps and check duplicate keys
    function collectSteps(steps: DslStep[]) {
      for (const step of steps) {
        if (stepKeys.has(step.key)) {
          errors.push(`Duplicate step key detected: '${step.key}'`);
        }
        stepKeys.add(step.key);

        const nextTargets: string[] = [];
        if (step.then) nextTargets.push(step.then);
        if (step.else) nextTargets.push(step.else);
        if (step.onFailure?.goto) nextTargets.push(step.onFailure.goto);

        outgoingEdges.set(step.key, nextTargets);

        if (step.steps && Array.isArray(step.steps)) {
          collectSteps(step.steps);
        }
      }
    }

    collectSteps(workflow.steps);

    // 2. Validate target step keys exist (no dangling gotos)
    for (const [source, targets] of outgoingEdges.entries()) {
      for (const target of targets) {
        if (!stepKeys.has(target)) {
          errors.push(`Step '${source}' references non-existent target step '${target}'`);
        }
      }
    }

    // 3. Cycle Detection using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function isCyclic(node: string): boolean {
      visited.add(node);
      recStack.add(node);

      const neighbors = outgoingEdges.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (isCyclic(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    }

    for (const key of stepKeys) {
      if (!visited.has(key)) {
        if (isCyclic(key)) {
          errors.push(`Cycle detected in workflow graph involving step '${key}'`);
          break;
        }
      }
    }

    // 4. Validate tool bindings
    for (const step of workflow.steps) {
      if (step.tool) {
        const tool = this.registry.getTool(step.tool, institutionId);
        if (!tool) {
          warnings.push(`Tool '${step.tool}' specified in step '${step.key}' is not currently registered in institution '${institutionId}'`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const workflowAstValidator = new WorkflowAstValidator();

export function validateWorkflowDsl(workflow: WorkflowDsl, institutionId: string = "global"): AstValidationResult {
  return workflowAstValidator.validate(workflow, institutionId);
}

