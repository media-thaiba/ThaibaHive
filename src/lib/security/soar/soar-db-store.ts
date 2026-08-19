/**
 * SOAR Database Persistence Store
 * Sprint-040 — Dual-Store Playbook, Execution, and Approval Persistence
 */

import { db } from '@/db';
import { soarPlaybooks, soarExecutions, soarExecutionSteps, soarApprovals } from '@thaiba/db';
import { eq, desc, and } from 'drizzle-orm';
import { SecurityPlaybook, SoarExecutionContext, SoarApprovalItem } from './soar-types';

export class SoarDbStore {
  private static instance: SoarDbStore;

  private constructor() {}

  public static getInstance(): SoarDbStore {
    if (!SoarDbStore.instance) {
      SoarDbStore.instance = new SoarDbStore();
    }
    return SoarDbStore.instance;
  }

  // ─── Playbooks ───

  public async savePlaybook(playbook: SecurityPlaybook): Promise<void> {
    const record = {
      id: playbook.id,
      name: playbook.name,
      version: playbook.version || '1.0.0',
      description: playbook.description || null,
      category: playbook.category || 'NETWORK',
      enabled: playbook.enabled !== false,
      autoExecute: playbook.auto_execute !== false,
      minConfidence: playbook.min_confidence || 80,
      highImpact: !!playbook.high_impact,
      definition: JSON.stringify({ triggers: playbook.triggers, steps: playbook.steps }),
      rollbackStrategy: playbook.rollback_strategy || 'COMPENSATE',
      updatedAt: new Date().toISOString(),
    };

    try {
      const existing = await db.select().from(soarPlaybooks).where(eq(soarPlaybooks.id, playbook.id)).limit(1);
      if (existing.length > 0) {
        await db.update(soarPlaybooks).set(record).where(eq(soarPlaybooks.id, playbook.id));
      } else {
        await db.insert(soarPlaybooks).values({
          ...record,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Database failure fallback / non-blocking
    }
  }

  public async getPlaybook(id: string): Promise<SecurityPlaybook | null> {
    try {
      const rows = await db.select().from(soarPlaybooks).where(eq(soarPlaybooks.id, id)).limit(1);
      if (rows.length === 0) return null;
      const row = rows[0];
      const def = JSON.parse(row.definition || '{}');
      return {
        id: row.id,
        name: row.name,
        version: row.version,
        description: row.description || undefined,
        category: row.category as any,
        enabled: row.enabled,
        auto_execute: row.autoExecute,
        min_confidence: row.minConfidence,
        high_impact: row.highImpact,
        triggers: def.triggers || [],
        steps: def.steps || [],
        rollback_strategy: row.rollbackStrategy as any,
      };
    } catch {
      return null;
    }
  }

  public async listPlaybooks(): Promise<SecurityPlaybook[]> {
    try {
      const rows = await db.select().from(soarPlaybooks).orderBy(desc(soarPlaybooks.createdAt));
      return rows.map(row => {
        const def = JSON.parse(row.definition || '{}');
        return {
          id: row.id,
          name: row.name,
          version: row.version,
          description: row.description || undefined,
          category: row.category as any,
          enabled: row.enabled,
          auto_execute: row.autoExecute,
          min_confidence: row.minConfidence,
          high_impact: row.highImpact,
          triggers: def.triggers || [],
          steps: def.steps || [],
          rollback_strategy: row.rollbackStrategy as any,
        };
      });
    } catch {
      return [];
    }
  }

  // ─── Executions ───

  public async saveExecution(context: SoarExecutionContext): Promise<void> {
    try {
      await db.insert(soarExecutions).values({
        id: context.execution_id,
        playbookId: context.playbook_id,
        playbookName: context.playbook_name,
        targetType: context.target_entity.type,
        targetValue: context.target_entity.value,
        state: context.state,
        triggerPayload: JSON.stringify(context.trigger_payload || {}),
        tenantId: context.tenant_id || 'default',
        actorId: context.actor_id || null,
        approvalId: context.approval_id || null,
        error: context.error || null,
        compensationStatus: context.compensation_status || 'NONE',
        startedAt: context.started_at,
        completedAt: context.completed_at || null,
      });

      // Save step executions
      for (const stepId of context.step_order) {
        const step = context.steps[stepId];
        if (step) {
          await db.insert(soarExecutionSteps).values({
            id: `${context.execution_id}_${stepId}`,
            executionId: context.execution_id,
            stepId: step.step_id,
            name: step.name,
            action: step.action,
            state: step.state,
            inputParams: JSON.stringify(step.input_params || {}),
            output: JSON.stringify(step.output || {}),
            error: step.error || null,
            compensated: !!step.compensated,
            startedAt: step.started_at,
            completedAt: step.completed_at || null,
          });
        }
      }
    } catch {
      // Async log insertion error ignored for fast path
    }
  }

  public async listExecutions(limit = 50): Promise<any[]> {
    try {
      return await db.select().from(soarExecutions).orderBy(desc(soarExecutions.startedAt)).limit(limit);
    } catch {
      return [];
    }
  }

  // ─── Approvals ───

  public async saveApproval(item: SoarApprovalItem): Promise<void> {
    try {
      await db.insert(soarApprovals).values({
        id: item.id,
        executionId: item.execution_id,
        playbookId: item.playbook_id,
        playbookName: item.playbook_name,
        targetType: item.target_entity.type,
        targetValue: item.target_entity.value,
        confidenceScore: item.confidence_score,
        triggerPayload: JSON.stringify(item.trigger_payload || {}),
        status: item.status,
        reason: item.reason || null,
        resolvedBy: item.resolved_by || null,
        requestedAt: item.requested_at,
        expiresAt: item.expires_at,
        resolvedAt: item.resolved_at || null,
      });
    } catch {}
  }
}

export const soarDbStore = SoarDbStore.getInstance();
