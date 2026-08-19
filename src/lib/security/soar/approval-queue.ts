/**
 * SOAR Human-in-the-Loop Approval Queue
 * Sprint-040 — Pending Action Management & Review
 */

import { randomUUID } from 'crypto';
import { SoarApprovalItem, SoarTargetEntity } from './soar-types';
import { SoarAuditLogger } from './soar-audit-events';

export interface EnqueueApprovalOptions {
  ttlHours?: number;
}

export class ApprovalQueue {
  private static instance: ApprovalQueue;
  private pendingApprovals: Map<string, SoarApprovalItem> = new Map();
  private approvalHistory: SoarApprovalItem[] = [];
  private defaultTtlHours = 24; // 24-hour TTL default

  private constructor() {}

  public static getInstance(): ApprovalQueue {
    if (!ApprovalQueue.instance) {
      ApprovalQueue.instance = new ApprovalQueue();
    }
    return ApprovalQueue.instance;
  }

  /**
   * Enqueue a mitigation action for human review
   */
  public enqueue(
    executionId: string,
    playbookId: string,
    playbookName: string,
    targetEntity: SoarTargetEntity,
    confidenceScore: number,
    triggerPayload: Record<string, any>,
    options?: EnqueueApprovalOptions
  ): SoarApprovalItem {
    const id = `appr_${randomUUID()}`;
    const requestedAt = new Date().toISOString();
    const ttlMs = (options?.ttlHours || this.defaultTtlHours) * 3600 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    const item: SoarApprovalItem = {
      id,
      execution_id: executionId,
      playbook_id: playbookId,
      playbook_name: playbookName,
      target_entity: targetEntity,
      confidence_score: confidenceScore,
      trigger_payload: triggerPayload,
      status: 'PENDING',
      requested_at: requestedAt,
      expires_at: expiresAt,
    };

    this.pendingApprovals.set(id, item);
    SoarAuditLogger.logApproval(item, 'REQUESTED').catch(() => {});
    return item;
  }

  /**
   * Get all active pending approval items (filtering out expired)
   */
  public getPendingApprovals(): SoarApprovalItem[] {
    const now = new Date().toISOString();
    const active: SoarApprovalItem[] = [];

    for (const [id, item] of this.pendingApprovals.entries()) {
      if (item.expires_at <= now) {
        item.status = 'EXPIRED';
        this.pendingApprovals.delete(id);
        this.approvalHistory.unshift(item);
      } else {
        active.push(item);
      }
    }

    return active;
  }

  public getApproval(id: string): SoarApprovalItem | undefined {
    return this.pendingApprovals.get(id) || this.approvalHistory.find(a => a.id === id);
  }

  /**
   * Resolve an approval item with APPROVED or REJECTED status
   */
  public resolve(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    resolvedBy: string,
    reason?: string
  ): SoarApprovalItem | null {
    const item = this.pendingApprovals.get(id);
    if (!item) return null;

    item.status = decision;
    item.resolved_at = new Date().toISOString();
    item.resolved_by = resolvedBy;
    item.reason = reason;

    this.pendingApprovals.delete(id);
    this.approvalHistory.unshift(item);

    SoarAuditLogger.logApproval(item, 'RESOLVED').catch(() => {});

    return item;
  }

  public clear(): void {
    this.pendingApprovals.clear();
    this.approvalHistory = [];
  }
}

export const approvalQueue = ApprovalQueue.getInstance();
