/**
 * SOAR Compensation Transaction Engine
 * Sprint-040 — SAGA Reverse Action Orchestration
 */

import { SoarExecutionContext } from './soar-types';
import { actionRegistry } from './action-registry';
import { CompensationResult, CompensationStepResult } from './compensation-types';

export class CompensationHandler {
  private static instance: CompensationHandler;

  private constructor() {}

  public static getInstance(): CompensationHandler {
    if (!CompensationHandler.instance) {
      CompensationHandler.instance = new CompensationHandler();
    }
    return CompensationHandler.instance;
  }

  /**
   * Execute reverse compensation for all completed steps in LIFO order
   */
  public async rollback(context: SoarExecutionContext): Promise<CompensationResult> {
    const results: CompensationStepResult[] = [];
    let allSucceeded = true;

    // Get list of completed steps in reverse order (LIFO)
    const completedStepIds = [...context.step_order]
      .reverse()
      .filter(stepId => {
        const step = context.steps[stepId];
        return step && step.state === 'COMPLETED' && !step.compensated;
      });

    for (const stepId of completedStepIds) {
      const step = context.steps[stepId];
      const action = actionRegistry.getAction(step.action);

      const startTime = Date.now();
      const stepResult: CompensationStepResult = {
        step_id: stepId,
        action: step.action,
        success: false,
        duration_ms: 0,
      };

      if (!action) {
        stepResult.error = `Action handler '${step.action}' not found in registry for compensation`;
        allSucceeded = false;
      } else if (typeof action.compensate !== 'function') {
        // No compensation handler defined - treated as safe non-reversible action (e.g. notification)
        stepResult.success = true;
        step.compensated = true;
      } else {
        try {
          step.state = 'COMPENSATING';
          await action.compensate(step.input_params, step.output, context);
          stepResult.success = true;
          step.state = 'COMPENSATED';
          step.compensated = true;
        } catch (err: any) {
          stepResult.success = false;
          stepResult.error = err?.message || String(err);
          step.error = stepResult.error;
          step.state = 'FAILED';
          allSucceeded = false;
        }
      }

      stepResult.duration_ms = Date.now() - startTime;
      results.push(stepResult);
    }

    return {
      execution_id: context.execution_id,
      success: allSucceeded,
      total_compensated: results.filter(r => r.success).length,
      total_failed: results.filter(r => !r.success).length,
      steps: results,
    };
  }
}

export const compensationHandler = CompensationHandler.getInstance();
