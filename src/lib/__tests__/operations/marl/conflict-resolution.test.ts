import { ConflictResolutionProtocol, ResourceClaim } from '@/lib/operations/marl/conflict-resolution-protocol';

describe('AIMS-002 — ConflictResolutionProtocol', () => {
  it('should resolve competing resource claims using utility priority and VCG pricing', () => {
    const protocol = new ConflictResolutionProtocol();

    const claims: ResourceClaim[] = [
      {
        id: 'claim_1',
        agentId: 'agent_lab_climate',
        domain: 'hvac_energy',
        resourceId: 'substation_grid_1',
        requestedCapacity: 40,
        bidValue: 10,
        priorityTier: 'CRITICAL_SAFETY',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'claim_2',
        agentId: 'agent_dorm_curtail',
        domain: 'hvac_energy',
        resourceId: 'substation_grid_1',
        requestedCapacity: 30,
        bidValue: 25,
        priorityTier: 'OPERATIONAL_EFFICIENCY',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'claim_3',
        agentId: 'agent_ev_fleet_charger',
        domain: 'fleet_logistics',
        resourceId: 'substation_grid_1',
        requestedCapacity: 50,
        bidValue: 30,
        priorityTier: 'COST_SAVINGS',
        timestamp: new Date().toISOString(),
      },
    ];

    const result = protocol.resolveResourceConflict('substation_grid_1', 60, claims);

    expect(result.resourceId).toBe('substation_grid_1');
    expect(result.allocatedCapacity).toBe(60);
    // CRITICAL_SAFETY claim_1 (40 kW) must win first
    expect(result.winners[0].agentId).toBe('agent_lab_climate');
    expect(result.winners[0].allocatedAmount).toBe(40);
    // OPERATIONAL_EFFICIENCY claim_2 gets the remaining 20 kW partial
    expect(result.winners[1].agentId).toBe('agent_dorm_curtail');
    expect(result.winners[1].allocatedAmount).toBe(20);
    // COST_SAVINGS claim_3 gets rejected due to capacity limit
    expect(result.rejectedClaims.length).toBe(1);
    expect(result.rejectedClaims[0].agentId).toBe('agent_ev_fleet_charger');
  });
});
