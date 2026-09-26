/**
 * SOAR Threat Intelligence Bridge
 * Sprint-040 — Ingestion Bridge Linking Threat Feeds & Webhooks to SOAR Engine
 */

import { SecurityPlaybook, SoarTargetEntity } from './soar-types';
import { TriggerMatcher, SoarIncomingEvent } from './trigger-matcher';
import { triggerDeduplicator } from './trigger-deduplicator';
import { confidenceGate } from './confidence-gate';
import { approvalQueue } from './approval-queue';
import { distributedLock } from './distributed-lock';
import { soarOrchestrator } from './orchestrator';
import { soarMeshSync } from './soar-mesh-sync';
import { CANONICAL_SECURITY_PLAYBOOKS } from './playbooks/definitions';

export interface ThreatIntelBridgeDispatchResult {
  event_type: string;
  target: SoarTargetEntity;
  matched_playbooks: number;
  auto_executed: string[];
  queued_for_approval: string[];
  logged_only: string[];
  deduplicated: boolean;
}

export class ThreatIntelBridge {
  private static instance: ThreatIntelBridge;
  private registeredPlaybooks: SecurityPlaybook[] = [...CANONICAL_SECURITY_PLAYBOOKS];

  private constructor() {}

  public static getInstance(): ThreatIntelBridge {
    if (!ThreatIntelBridge.instance) {
      ThreatIntelBridge.instance = new ThreatIntelBridge();
    }
    return ThreatIntelBridge.instance;
  }

  public setPlaybooks(playbooks: SecurityPlaybook[]): void {
    this.registeredPlaybooks = playbooks;
  }

  public registerPlaybook(playbook: SecurityPlaybook): void {
    this.registeredPlaybooks.push(playbook);
  }

  public clearPlaybooks(): void {
    this.registeredPlaybooks = [];
  }

  /**
   * Process an incoming threat event through deduplication, trigger matching, confidence gating, and SOAR execution
   */
  public async handleThreatEvent(
    event: SoarIncomingEvent,
    target: SoarTargetEntity,
    playbooksOverride?: SecurityPlaybook[]
  ): Promise<ThreatIntelBridgeDispatchResult> {
    const playbooks = playbooksOverride || this.registeredPlaybooks;
    const deduplicationKey = `${event.event_type}:${target.type}:${target.value}`;

    const result: ThreatIntelBridgeDispatchResult = {
      event_type: event.event_type,
      target,
      matched_playbooks: 0,
      auto_executed: [],
      queued_for_approval: [],
      logged_only: [],
      deduplicated: false,
    };

    // 1. Deduplication check
    if (triggerDeduplicator.isDuplicate(deduplicationKey)) {
      result.deduplicated = true;
      return result;
    }

    // 2. Find matching playbooks
    const matched = TriggerMatcher.findMatchingPlaybooks(event, playbooks);
    result.matched_playbooks = matched.length;

    if (matched.length === 0) {
      return result;
    }

    // 3. Process each matched playbook
    for (const playbook of matched) {
      const decision = confidenceGate.evaluate(event.confidence || 0, playbook);

      if (decision.decision === 'AUTO_EXECUTE') {
        // Acquire distributed lock to prevent multi-node race conditions
        const lockKey = `lock:soar:${target.type}:${target.value}`;
        const lockHandle = await distributedLock.acquire(lockKey, { ttlMs: 30000 });

        if (!lockHandle) {
          // Lock held by another node / execution
          continue;
        }

        try {
          soarMeshSync.publish('EXECUTION_STARTED', { reason: 'auto_execute' }, {
            playbook_id: playbook.id,
            target_entity: target,
          });

          await soarOrchestrator.executePlaybook(playbook, event.payload, target);
          result.auto_executed.push(playbook.id);
        } finally {
          await distributedLock.release(lockHandle);
        }
      } else if (decision.decision === 'REQUIRE_APPROVAL') {
        const approvalItem = approvalQueue.enqueue(
          `pending_${Math.random().toString(36).substring(2, 9)}`,
          playbook.id,
          playbook.name,
          target,
          event.confidence || 0,
          event.payload
        );

        soarMeshSync.publish('APPROVAL_REQUESTED', { approval_id: approvalItem.id }, {
          playbook_id: playbook.id,
          target_entity: target,
        });

        result.queued_for_approval.push(playbook.id);
      } else {
        result.logged_only.push(playbook.id);
      }
    }

    return result;
  }
}

export const threatIntelBridge = ThreatIntelBridge.getInstance();
