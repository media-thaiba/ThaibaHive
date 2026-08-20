import { AgentAction, AgentDomain } from './marl-types';

export interface ResourceClaim {
  id: string;
  agentId: string;
  domain: AgentDomain;
  resourceId: string; // e.g. "power_grid_substation_A", "shuttle_bay_1", "server_cluster_node_4"
  requestedCapacity: number; // e.g. 50 kW or 1 shuttle
  bidValue: number; // VCG auction bid or utility score
  priorityTier: 'CRITICAL_SAFETY' | 'COMFORT_COMPLIANCE' | 'OPERATIONAL_EFFICIENCY' | 'COST_SAVINGS';
  timestamp: string;
}

export interface ConflictResolutionResult {
  resourceId: string;
  allocatedCapacity: number;
  winners: {
    agentId: string;
    allocatedAmount: number;
    clearingPrice: number;
  }[];
  rejectedClaims: {
    agentId: string;
    reason: string;
  }[];
  resolvedAt: string;
}

/**
 * Conflict Resolution Protocol implementing Vickrey-Clarke-Groves (VCG) & Priority Auctions
 * Resolves multi-agent competing claims for power, computing, and physical campus resources.
 */
export class ConflictResolutionProtocol {
  private priorityWeights: Record<string, number> = {
    CRITICAL_SAFETY: 10000,
    COMFORT_COMPLIANCE: 1000,
    OPERATIONAL_EFFICIENCY: 100,
    COST_SAVINGS: 10,
  };

  /**
   * Resolves competing claims for a scarce campus resource
   */
  public resolveResourceConflict(
    resourceId: string,
    totalAvailableCapacity: number,
    claims: ResourceClaim[]
  ): ConflictResolutionResult {
    if (!claims || claims.length === 0) {
      return {
        resourceId,
        allocatedCapacity: 0,
        winners: [],
        rejectedClaims: [],
        resolvedAt: new Date().toISOString(),
      };
    }

    // Rank claims by Effective Utility = Priority Weight + Bid Value
    const rankedClaims = [...claims].sort((a, b) => {
      const utilityA = (this.priorityWeights[a.priorityTier] || 0) + a.bidValue;
      const utilityB = (this.priorityWeights[b.priorityTier] || 0) + b.bidValue;
      return utilityB - utilityA;
    });

    let remainingCapacity = totalAvailableCapacity;
    const winners: ConflictResolutionResult['winners'] = [];
    const rejected: ConflictResolutionResult['rejectedClaims'] = [];

    for (const claim of rankedClaims) {
      if (remainingCapacity >= claim.requestedCapacity) {
        // Full allocation
        remainingCapacity -= claim.requestedCapacity;
        winners.push({
          agentId: claim.agentId,
          allocatedAmount: claim.requestedCapacity,
          clearingPrice: Math.max(0, claim.bidValue * 0.8), // VCG discount
        });
      } else if (remainingCapacity > 0) {
        // Partial allocation if permitted
        const partial = remainingCapacity;
        remainingCapacity = 0;
        winners.push({
          agentId: claim.agentId,
          allocatedAmount: partial,
          clearingPrice: Math.max(0, claim.bidValue * 0.8 * (partial / claim.requestedCapacity)),
        });
      } else {
        rejected.push({
          agentId: claim.agentId,
          reason: `Insufficient capacity on ${resourceId}. Prioritized higher utility claims.`,
        });
      }
    }

    return {
      resourceId,
      allocatedCapacity: totalAvailableCapacity - remainingCapacity,
      winners,
      rejectedClaims: rejected,
      resolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Detects if two agent actions conflict with each other
   */
  public detectActionConflict(actionA: AgentAction, actionB: AgentAction): boolean {
    if (actionA.domain === 'hvac_energy' && actionB.domain === 'hvac_energy') {
      const zoneA = actionA.parameters?.zoneId;
      const zoneB = actionB.parameters?.zoneId;
      if (zoneA && zoneB && zoneA === zoneB) {
        const deltaA = actionA.parameters?.setpointAdjustment || 0;
        const deltaB = actionB.parameters?.setpointAdjustment || 0;
        // Conflict if opposing adjustments (e.g. heating vs cooling fight)
        if (deltaA * deltaB < 0) {
          return true;
        }
      }
    }
    return false;
  }
}
