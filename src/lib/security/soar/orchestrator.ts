/**
 * SOAR Workflow Orchestrator
 * Sprint-040 — Execution Runtime & State Machine
 */

import { randomUUID } from 'crypto';
import {
  SecurityPlaybook,
  SoarExecutionContext,
  SoarExecutionState,
  SoarStepExecution,
  SoarTargetEntity,
  PlaybookStep,
} from './soar-types';
import { actionRegistry } from './action-registry';
import { SoarAuditLogger } from './soar-audit-events';

export interface SoarOrchestratorConfig {
  defaultStepTimeoutMs?: number;
  maxConcurrentExecutions?: number;
  enabled?: boolean;
}

export class SoarOrchestrator {
  private static instance: SoarOrchestrator;
  private activeExecutions: Map<string, SoarExecutionContext> = new Map();
  private executionHistory: SoarExecutionContext[] = [];
  private maxHistorySize = 1000;
  private isEnabled = true;
  private defaultStepTimeoutMs = 10000;

  // Pluggable condition evaluator and interpolator hooks
  private conditionEvaluator?: (condition: any, context: Record<string, any>) => boolean;
  private contextInterpolator?: (params: Record<string, any>, context: Record<string, any>) => Record<string, any>;
  private compensationHandler?: (context: SoarExecutionContext) => Promise<boolean>;
  private eventListeners: ((context: SoarExecutionContext) => void)[] = [];

  private constructor(config?: SoarOrchestratorConfig) {
    if (config?.defaultStepTimeoutMs) this.defaultStepTimeoutMs = config.defaultStepTimeoutMs;
    if (config?.enabled !== undefined) this.isEnabled = config.enabled;
    if (process.env.SOAR_ENGINE_ENABLED === 'false') this.isEnabled = false;

    // Set default evaluators and interpolators
    this.conditionEvaluator = (condition, context) => {
      // Dynamic import or direct call to ConditionEvaluator
      const { ConditionEvaluator } = require('./condition-evaluator');
      return ConditionEvaluator.evaluate(condition, context);
    };

    this.contextInterpolator = (params, context) => {
      const { ContextInterpolator } = require('./context-interpolator');
      return ContextInterpolator.interpolate(params, context);
    };

    this.compensationHandler = async (context) => {
      const { CompensationHandler } = require('./compensation-handler');
      const result = await CompensationHandler.getInstance().rollback(context);
      return result.success;
    };
  }

  public static getInstance(config?: SoarOrchestratorConfig): SoarOrchestrator {
    if (!SoarOrchestrator.instance) {
      SoarOrchestrator.instance = new SoarOrchestrator(config);
    }
    return SoarOrchestrator.instance;
  }

  public setConditionEvaluator(evaluator: (condition: any, context: Record<string, any>) => boolean): void {
    this.conditionEvaluator = evaluator;
  }

  public setContextInterpolator(interpolator: (params: Record<string, any>, context: Record<string, any>) => Record<string, any>): void {
    this.contextInterpolator = interpolator;
  }

  public setCompensationHandler(handler: (context: SoarExecutionContext) => Promise<boolean>): void {
    this.compensationHandler = handler;
  }

  public addEventListener(listener: (context: SoarExecutionContext) => void): void {
    this.eventListeners.push(listener);
  }

  public isEngineEnabled(): boolean {
    return this.isEnabled;
  }

  public setEngineEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getActiveExecutions(): SoarExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  public getExecution(executionId: string): SoarExecutionContext | undefined {
    return this.activeExecutions.get(executionId) || this.executionHistory.find(e => e.execution_id === executionId);
  }

  public getExecutionHistory(limit = 50, filter?: { status?: SoarExecutionState; playbookId?: string }): SoarExecutionContext[] {
    let result = [...this.executionHistory];
    if (filter?.status) {
      result = result.filter(e => e.state === filter.status);
    }
    if (filter?.playbookId) {
      result = result.filter(e => e.playbook_id === filter.playbookId);
    }
    return result.slice(0, limit);
  }

  public clearHistory(): void {
    this.executionHistory = [];
    this.activeExecutions.clear();
  }

  /**
   * Execute a playbook deterministically through the state machine pipeline
   */
  public async executePlaybook(
    playbook: SecurityPlaybook,
    triggerPayload: Record<string, any>,
    targetEntity: SoarTargetEntity,
    options?: { actorId?: string; tenantId?: string; approvalId?: string }
  ): Promise<SoarExecutionContext> {
    if (!this.isEnabled) {
      const disabledContext: SoarExecutionContext = {
        execution_id: randomUUID(),
        playbook_id: playbook.id,
        playbook_name: playbook.name,
        trigger_payload: triggerPayload,
        target_entity: targetEntity,
        state: 'CANCELLED',
        steps: {},
        step_order: [],
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error: 'SOAR Engine is disabled platform-wide via kill-switch',
        tenant_id: options?.tenantId,
        actor_id: options?.actorId,
        approval_id: options?.approvalId,
      };
      this.recordExecution(disabledContext);
      return disabledContext;
    }

    if (!playbook.enabled) {
      const disabledPlaybookContext: SoarExecutionContext = {
        execution_id: randomUUID(),
        playbook_id: playbook.id,
        playbook_name: playbook.name,
        trigger_payload: triggerPayload,
        target_entity: targetEntity,
        state: 'CANCELLED',
        steps: {},
        step_order: [],
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error: `Playbook ${playbook.name} (${playbook.id}) is disabled`,
        tenant_id: options?.tenantId,
        actor_id: options?.actorId,
        approval_id: options?.approvalId,
      };
      this.recordExecution(disabledPlaybookContext);
      return disabledPlaybookContext;
    }

    const executionId = randomUUID();
    const context: SoarExecutionContext = {
      execution_id: executionId,
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      trigger_payload: triggerPayload,
      target_entity: targetEntity,
      state: 'RUNNING',
      steps: {},
      step_order: [],
      started_at: new Date().toISOString(),
      tenant_id: options?.tenantId,
      actor_id: options?.actorId,
      approval_id: options?.approvalId,
      compensation_status: 'NONE',
    };

    this.activeExecutions.set(executionId, context);
    this.notifyListeners(context);
    SoarAuditLogger.logPlaybookTriggered(context).catch(() => {});

    try {
      // Execute steps in sequence
      for (const step of playbook.steps) {
        context.step_order.push(step.id);
        const stepSuccess = await this.executeStep(step, context);
        if (!stepSuccess && !step.continue_on_error) {
          context.state = 'FAILED';
          context.error = context.steps[step.id]?.error || `Step ${step.name} (${step.id}) failed`;
          break;
        }
      }

      // If failed and rollback strategy is COMPENSATE, trigger compensation
      if (context.state === 'FAILED' && playbook.rollback_strategy === 'COMPENSATE') {
        context.state = 'COMPENSATING';
        context.compensation_status = 'IN_PROGRESS';
        this.notifyListeners(context);

        let compensationSuccess = false;
        if (this.compensationHandler) {
          try {
            const { CompensationHandler } = require('./compensation-handler');
            const compResult = await CompensationHandler.getInstance().rollback(context);
            compensationSuccess = compResult.success;
            SoarAuditLogger.logCompensation(context, compResult).catch(() => {});
          } catch (err: any) {
            context.error = `${context.error} | Compensation error: ${err?.message || String(err)}`;
          }
        }

        if (compensationSuccess) {
          context.state = 'COMPENSATED';
          context.compensation_status = 'COMPLETED';
        } else {
          context.state = 'COMPENSATION_FAILED';
          context.compensation_status = 'FAILED';
        }
      } else if (context.state === 'RUNNING') {
        context.state = 'COMPLETED';
      }
    } catch (err: any) {
      context.state = 'FAILED';
      context.error = err?.message || String(err);
    } finally {
      context.completed_at = new Date().toISOString();
      this.activeExecutions.delete(executionId);
      this.recordExecution(context);
      this.notifyListeners(context);
      SoarAuditLogger.logPlaybookFinished(context).catch(() => {});
    }

    return context;
  }

  /**
   * Execute a single step with timeout and error containment
   */
  private async executeStep(step: PlaybookStep, context: SoarExecutionContext): Promise<boolean> {
    const stepExecution: SoarStepExecution = {
      step_id: step.id,
      name: step.name,
      action: step.action,
      state: 'RUNNING',
      started_at: new Date().toISOString(),
      input_params: {},
    };
    context.steps[step.id] = stepExecution;

    // Evaluate step condition if present
    if (step.condition) {
      const conditionPassed = this.conditionEvaluator
        ? this.conditionEvaluator(step.condition, this.buildEvaluationContext(context))
        : true;

      if (!conditionPassed) {
        stepExecution.state = 'SKIPPED';
        stepExecution.completed_at = new Date().toISOString();
        return true;
      }
    }

    const action = actionRegistry.getAction(step.action);
    if (!action) {
      stepExecution.state = 'FAILED';
      stepExecution.error = `Action '${step.action}' is not registered in ActionRegistry`;
      stepExecution.completed_at = new Date().toISOString();
      return false;
    }

    // Interpolate parameters
    let params = step.params || {};
    if (this.contextInterpolator) {
      params = this.contextInterpolator(params, this.buildEvaluationContext(context));
    }
    stepExecution.input_params = params;

    const timeoutMs = step.timeout_ms || this.defaultStepTimeoutMs;

    try {
      const output = await this.executeWithTimeout(
        action.execute(params, context),
        timeoutMs,
        `Step '${step.name}' timed out after ${timeoutMs}ms`
      );
      stepExecution.state = 'COMPLETED';
      stepExecution.output = output;
      stepExecution.completed_at = new Date().toISOString();
      SoarAuditLogger.logStepExecuted(context, stepExecution).catch(() => {});
      return true;
    } catch (err: any) {
      stepExecution.state = 'FAILED';
      stepExecution.error = err?.message || String(err);
      stepExecution.completed_at = new Date().toISOString();
      SoarAuditLogger.logStepExecuted(context, stepExecution).catch(() => {});
      return false;
    }
  }

  private executeWithTimeout<T>(promise: Promise<T>, ms: number, timeoutErrorMsg: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(timeoutErrorMsg));
      }, ms);

      promise
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private buildEvaluationContext(context: SoarExecutionContext): Record<string, any> {
    return {
      trigger: context.trigger_payload,
      target: context.target_entity,
      steps: context.steps,
      execution_id: context.execution_id,
      playbook_id: context.playbook_id,
      tenant_id: context.tenant_id,
      actor_id: context.actor_id,
    };
  }

  private recordExecution(context: SoarExecutionContext): void {
    this.executionHistory.unshift(context);
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.pop();
    }
  }

  private notifyListeners(context: SoarExecutionContext): void {
    for (const listener of this.eventListeners) {
      try {
        listener(context);
      } catch (err) {
        // Suppress listener error from crashing orchestrator
      }
    }
  }

  /**
   * ZASM Device Trust Integration Handler
   */
  public async handleLowDeviceTrustEvent(deviceId: string, score: number, reasons: string[]): Promise<SoarExecutionContext | null> {
    const { CANONICAL_SECURITY_PLAYBOOKS } = require('./playbooks/definitions');
    const playbook =
      CANONICAL_SECURITY_PLAYBOOKS.find((p: any) => p.name === 'COMPROMISED_ACCOUNT_LOCKDOWN') ||
      CANONICAL_SECURITY_PLAYBOOKS[0];

    if (!playbook) return null;

    return this.executePlaybook(
      playbook,
      {
        source: 'zasm:device_trust_engine',
        event_type: 'LOW_DEVICE_TRUST_DETECTED',
        confidence: 90,
        deviceId,
        score,
        reasons,
      },
      {
        type: 'IP',
        value: deviceId,
      }
    );
  }
}

export const soarOrchestrator = SoarOrchestrator.getInstance();

