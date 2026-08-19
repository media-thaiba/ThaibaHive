import { SwarmTopology, TopologyNode } from './swarm-topology';
import { EventBus } from '../../observability/event-bus';

const HEARTBEAT_TIMEOUT_MS = 30_000; // 30 seconds
const SWARM_NEGOTIATION_ENABLED = process.env.SWARM_NEGOTIATION_ENABLED !== 'false';

export type PartitionEvent = {
  event: 'partition_detected' | 'partition_recovered';
  nodeId: string;
  tier: TopologyNode['tier'];
  timestamp: string;
};

/**
 * Sprint-020 PartitionHandler — monitors swarm tier heartbeats and manages split-brain recovery.
 *
 * Partition detection: 30s without heartbeat → declare partition, switch to autonomy-fallback mode.
 * Recovery: on reconnect, replay buffered local-autonomous decisions in causal order (LWW).
 * Emits structured partition events to registered SSE listeners (admin dashboard).
 */
export class PartitionHandler {
  private localAutonomousBuffer: Array<{ decision: unknown; timestamp: string }> = [];
  private sseListeners: Set<(event: PartitionEvent) => void> = new Set();
  private partitionedNodes = new Set<string>();

  constructor(private topology: SwarmTopology) {}

  /**
   * Register an SSE listener for partition events (admin dashboard notification).
   */
  onPartitionEvent(listener: (event: PartitionEvent) => void): () => void {
    this.sseListeners.add(listener);
    return () => this.sseListeners.delete(listener);
  }

  /**
   * Check heartbeats for all node IDs. Nodes silent for >30s are declared partitioned.
   */
  checkHeartbeats(nodes: string[]): string[] {
    if (!SWARM_NEGOTIATION_ENABLED) return [];
    const now = Date.now();
    const newlyPartitioned: string[] = [];

    for (const id of nodes) {
      const view = this.topology.getGlobalView().find((n) => n.id === id);
      if (!view) continue;

      const lastSeen = new Date(view.lastSeen).getTime();
      if (now - lastSeen > HEARTBEAT_TIMEOUT_MS && !this.partitionedNodes.has(id)) {
        this.partitionedNodes.add(id);
        this.topology.updateStatus(id, 'partitioned');
        newlyPartitioned.push(id);

        try {
          EventBus.getInstance().publishEvent({
            eventSource: 'partition-handler',
            severity: 'warning',
            message: `Network partition detected for node ${id} (${view.tier})`
          });
        } catch (err) {
          console.error('[PartitionHandler] Telemetry error:', err);
        }

        this.emitPartitionEvent({
          event: 'partition_detected',
          nodeId: id,
          tier: view.tier,
          timestamp: new Date().toISOString(),
        });
      }
    }
    return newlyPartitioned;
  }

  /**
   * Buffer a decision made in autonomy-fallback mode (during partition).
   * These are replayed in causal order on reconnection.
   */
  bufferLocalDecision(decision: unknown): void {
    this.localAutonomousBuffer.push({
      decision,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * On reconnection: replay buffered decisions in causal timestamp order.
   * Conflicts resolved via Last-Write-Wins.
   */
  replaySyncBuffer(): Array<{ decision: unknown; timestamp: string }> {
    const sorted = [...this.localAutonomousBuffer].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    this.localAutonomousBuffer = [];
    return sorted;
  }

  /**
   * Mark a node as recovered, restore its status, and emit recovery event.
   */
  handleRecovery(nodeId: string): void {
    const view = this.topology.getGlobalView().find((n) => n.id === nodeId);
    if (!view) return;

    this.partitionedNodes.delete(nodeId);
    this.topology.updateStatus(nodeId, 'active');

    try {
      EventBus.getInstance().publishEvent({
        eventSource: 'partition-handler',
        severity: 'info',
        message: `Network partition recovered for node ${nodeId} (${view.tier})`
      });
    } catch (err) {
      console.error('[PartitionHandler] Telemetry error:', err);
    }

    this.emitPartitionEvent({
      event: 'partition_recovered',
      nodeId,
      tier: view.tier,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * LWW conflict resolution for replayed autonomous decisions.
   */
  resolveConflict<T extends { timestamp: string }>(a: T, b: T): T {
    return new Date(a.timestamp).getTime() >= new Date(b.timestamp).getTime() ? a : b;
  }

  private emitPartitionEvent(event: PartitionEvent): void {
    for (const listener of this.sseListeners) {
      try {
        listener(event);
      } catch (err) {
        // Swallow listener errors to prevent one broken listener from disrupting others
      }
    }
  }
}