import { AgentMessageBus } from '../core/message-bus';
import { SwarmTopology, TopologyNode } from './swarm-topology';
import { EventBus } from '../../observability/event-bus';

const SWARM_NEGOTIATION_ENABLED = process.env.SWARM_NEGOTIATION_ENABLED !== 'false';

/**
 * Sprint-020 SwarmCoordinator — manages 3-tier (local/regional/global) agent hierarchy.
 * Routes cross-tier coordination messages via the Sprint-019 AgentMessageBus singleton.
 */
export class SwarmCoordinator {
  private topology = new SwarmTopology();
  private bus = AgentMessageBus.getInstance();

  constructor(private tier: TopologyNode['tier']) {}

  /**
   * Route a message to agents at a target tier via the pub-sub message bus.
   */
  async routeMessage(destTier: TopologyNode['tier'], payload: Record<string, unknown>): Promise<void> {
    if (!SWARM_NEGOTIATION_ENABLED) return;

    try {
      EventBus.getInstance().publishEvent({
        eventSource: 'swarm-coordinator',
        severity: 'info',
        message: `Routed swarm message from ${this.tier} to ${destTier}`
      });
    } catch (err) {
      console.error('[SwarmCoordinator] Telemetry error:', err);
    }

    this.bus.publish(
      `swarm-${this.tier}`,
      `swarm-${destTier}`,
      `cross_tier_${destTier}`,
      { ...payload, sourceTier: this.tier, destTier },
      destTier === 'global' ? 'high' : 'normal'
    );
  }

  /**
   * Sync topology state — only global-tier coordinator has full write visibility.
   */
  async syncTopology(nodes: TopologyNode[]): Promise<void> {
    if (!SWARM_NEGOTIATION_ENABLED) return;
    if (this.tier === 'global') {
      for (const n of nodes) {
        this.topology.register(n);
      }
      
      try {
        EventBus.getInstance().publishEvent({
          eventSource: 'swarm-coordinator',
          severity: 'info',
          message: `Synced swarm topology with ${nodes.length} nodes at ${this.tier} tier`
        });
        EventBus.getInstance().publishMetric({
          nodeId: 'local-node',
          metricName: 'topologyNodesCount',
          metricValue: nodes.length
        });
      } catch (err) {
        console.error('[SwarmCoordinator] Telemetry error:', err);
      }
    }
  }

  getTopology(): TopologyNode[] {
    return this.topology.getGlobalView();
  }

  getTier(): TopologyNode['tier'] {
    return this.tier;
  }
}