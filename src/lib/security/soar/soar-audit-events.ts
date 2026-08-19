/**
 * SOAR Cryptographic Merkle Audit Trail Integration
 * Sprint-040 — Immutable SHA-256 Audit Event Logging
 */

import { cryptoAuditWriter } from '../../audit/crypto-writer';
import { SoarExecutionContext, SoarStepExecution, SoarApprovalItem } from './soar-types';
import { CompensationResult } from './compensation-types';

export class SoarAuditLogger {
  /**
   * Log playbook execution trigger to the Merkle audit chain
   */
  public static async logPlaybookTriggered(context: SoarExecutionContext): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId: context.tenant_id || 'default',
        userId: context.actor_id || 'system:soar',
        action: 'SOAR_PLAYBOOK_TRIGGERED',
        entityType: 'SOAR_PLAYBOOK',
        entityId: context.playbook_id,
        payload: {
          execution_id: context.execution_id,
          playbook_name: context.playbook_name,
          target_entity: context.target_entity,
          trigger_payload: context.trigger_payload,
        },
        timestamp: context.started_at,
      });
    } catch {}
  }

  /**
   * Log completed or compensated step execution
   */
  public static async logStepExecuted(context: SoarExecutionContext, step: SoarStepExecution): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId: context.tenant_id || 'default',
        userId: context.actor_id || 'system:soar',
        action: 'SOAR_STEP_EXECUTED',
        entityType: 'SOAR_STEP',
        entityId: `${context.execution_id}_${step.step_id}`,
        payload: {
          execution_id: context.execution_id,
          playbook_id: context.playbook_id,
          step_id: step.step_id,
          step_name: step.name,
          action: step.action,
          state: step.state,
          error: step.error,
        },
        timestamp: step.completed_at || new Date().toISOString(),
      });
    } catch {}
  }

  /**
   * Log SAGA compensation outcome
   */
  public static async logCompensation(context: SoarExecutionContext, result: CompensationResult): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId: context.tenant_id || 'default',
        userId: context.actor_id || 'system:soar',
        action: 'SOAR_ACTION_COMPENSATED',
        entityType: 'SOAR_COMPENSATION',
        entityId: context.execution_id,
        payload: {
          execution_id: context.execution_id,
          playbook_id: context.playbook_id,
          success: result.success,
          total_compensated: result.total_compensated,
          total_failed: result.total_failed,
          steps: result.steps,
        },
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }

  /**
   * Log final playbook execution state
   */
  public static async logPlaybookFinished(context: SoarExecutionContext): Promise<void> {
    const action = context.state === 'COMPLETED' ? 'SOAR_PLAYBOOK_COMPLETED' : 'SOAR_PLAYBOOK_FAILED';
    try {
      await cryptoAuditWriter.log({
        tenantId: context.tenant_id || 'default',
        userId: context.actor_id || 'system:soar',
        action,
        entityType: 'SOAR_PLAYBOOK',
        entityId: context.playbook_id,
        payload: {
          execution_id: context.execution_id,
          playbook_name: context.playbook_name,
          target_entity: context.target_entity,
          final_state: context.state,
          error: context.error,
          compensation_status: context.compensation_status,
          duration_ms: context.completed_at && context.started_at
            ? new Date(context.completed_at).getTime() - new Date(context.started_at).getTime()
            : 0,
        },
        timestamp: context.completed_at || new Date().toISOString(),
      });
    } catch {}
  }

  /**
   * Log approval queue request and resolution
   */
  public static async logApproval(item: SoarApprovalItem, eventType: 'REQUESTED' | 'RESOLVED'): Promise<void> {
    const action = eventType === 'REQUESTED' ? 'SOAR_APPROVAL_REQUESTED' : 'SOAR_APPROVAL_RESOLVED';
    try {
      await cryptoAuditWriter.log({
        tenantId: 'default',
        userId: item.resolved_by || 'system:soar',
        action,
        entityType: 'SOAR_APPROVAL',
        entityId: item.id,
        payload: {
          approval_id: item.id,
          execution_id: item.execution_id,
          playbook_id: item.playbook_id,
          target_entity: item.target_entity,
          status: item.status,
          reason: item.reason,
        },
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }
}
