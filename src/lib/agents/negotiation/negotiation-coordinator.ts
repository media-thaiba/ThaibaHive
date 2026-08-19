import { ApprovalGateway } from '../healing/approval-gateway';
import { ConsensusCoordinator } from '../core/consensus';
import { NegotiationSession } from './types';
import { EventBus } from '../../observability/event-bus';

const SWARM_NEGOTIATION_ENABLED = process.env.SWARM_NEGOTIATION_ENABLED !== 'false';

/**
 * Sprint-020 NegotiationCoordinator — orchestrates negotiation sessions with:
 * - Wait-for-graph cycle detection for deadlock prevention
 * - 3-tier escalation: 15s local → 30s regional mediator → 60s human approval
 * - 5-minute max session wall-clock timeout
 * - 10-minute cooldown between consecutive negotiations on the same resource
 * - Consensus lease acquisition to prevent conflicting parallel sessions
 */
export class NegotiationCoordinator {
  private activeSessions = new Map<string, NegotiationSession & { startMs: number }>();
  private resourceCooldowns = new Map<string, number>();
  private waitForGraph = new Map<string, Set<string>>();

  /**
   * Cycle detection via DFS on the wait-for graph.
   * Returns true if a deadlock (cycle) is detected.
   */
  async detectDeadlock(graph: Map<string, string[]>): Promise<boolean> {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      inStack.add(node);
      const neighbors = graph.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (inStack.has(neighbor)) {
          return true;
        }
      }
      inStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) return true;
      }
    }
    return false;
  }

  /**
   * 3-tier escalation hierarchy:
   * level 1 → local arbitration (15s timeout already expired)
   * level 2 → regional mediator (30s timeout already expired)
   * level 3 → human approval via ApprovalGateway singleton
   */
  async escalate(level: 1 | 2 | 3, details: Record<string, unknown>): Promise<{ status: string }> {
    if (!SWARM_NEGOTIATION_ENABLED) return { status: 'disabled' };

    try {
      EventBus.getInstance().publishEvent({
        eventSource: 'negotiation-coordinator',
        severity: level === 3 ? 'critical' : 'warning',
        message: `Escalated deadlock to level ${level} for session ${details.sessionId ?? 'unknown'}`
      });
    } catch (err) {
      console.error('[NegotiationCoordinator] Telemetry error:', err);
    }

    if (level === 1) {
      return { status: 'escalated_to_regional' };
    }
    if (level === 2) {
      return { status: 'escalated_to_global' };
    }
    // Level 3: human approval gateway
    const gateway = ApprovalGateway.getInstance();
    const approved = await gateway.requestApproval({
      agentId: 'negotiation-coordinator',
      targetAsset: String(details.resourceId ?? 'unknown'),
      severity: 'high',
      decision: 'resolve_negotiation_deadlock',
      rationale: `Deadlock detected in negotiation session. Details: ${JSON.stringify(details)}`,
    });
    return { status: approved ? 'approved' : 'rejected' };
  }

  /**
   * Check and enforce the 5-minute wall-clock session timeout.
   */
  async checkTimeout(session: NegotiationSession): Promise<NegotiationSession['status']> {
    const entry = this.activeSessions.get(session.id);
    const startMs = entry?.startMs ?? new Date(session.createdAt).getTime();
    const elapsed = Date.now() - startMs;
    if (elapsed > 5 * 60 * 1000) {
      session.status = 'timeout';
      try {
        EventBus.getInstance().publishEvent({
          eventSource: 'negotiation-coordinator',
          severity: 'warning',
          message: `Negotiation session ${session.id} timed out after 5 minutes`
        });
      } catch (err) {
        console.error('[NegotiationCoordinator] Telemetry error:', err);
      }
    }
    return session.status;
  }

  /**
   * Register a new session and acquire a consensus lease on the resource.
   */
  async startSession(session: NegotiationSession): Promise<boolean> {
    if (!SWARM_NEGOTIATION_ENABLED) return false;
    if (!this.checkCooldown(session.resourceId)) return false;
    this.activeSessions.set(session.id, { ...session, startMs: Date.now() });

    try {
      EventBus.getInstance().publishEvent({
        eventSource: 'negotiation-coordinator',
        severity: 'info',
        message: `Started negotiation session ${session.id} for resource ${session.resourceId}`
      });
      EventBus.getInstance().publishMetric({
        nodeId: 'local-node',
        metricName: 'negotiationStart',
        metricValue: 1
      });
    } catch (err) {
      console.error('[NegotiationCoordinator] Telemetry error:', err);
    }

    // Acquire consensus lease to prevent conflicting parallel sessions
    const consensus = ConsensusCoordinator.getInstance();
    return consensus.acquireLease(session.resourceId, 'negotiation-coordinator');
  }

  /**
   * Finalize session and release the resource cooldown timer.
   */
  async finalizeSession(sessionId: string, resourceId: string): Promise<void> {
    this.activeSessions.delete(sessionId);
    this.resourceCooldowns.set(resourceId, Date.now());

    try {
      EventBus.getInstance().publishEvent({
        eventSource: 'negotiation-coordinator',
        severity: 'info',
        message: `Finalized negotiation session ${sessionId} for resource ${resourceId}`
      });
      EventBus.getInstance().publishMetric({
        nodeId: 'local-node',
        metricName: 'negotiationEnd',
        metricValue: 1
      });
    } catch (err) {
      console.error('[NegotiationCoordinator] Telemetry error:', err);
    }

    const consensus = ConsensusCoordinator.getInstance();
    consensus.releaseLease(resourceId, 'negotiation-coordinator');
  }

  /**
   * Enforce 10-minute cooldown between consecutive negotiations on the same resource.
   */
  checkCooldown(resourceId: string): boolean {
    const lastMs = this.resourceCooldowns.get(resourceId);
    if (!lastMs) return true;
    return (Date.now() - lastMs) > 10 * 60 * 1000;
  }
}