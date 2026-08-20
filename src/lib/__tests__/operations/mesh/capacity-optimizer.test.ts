import { CapacityOptimizer } from '@/lib/operations/mesh/capacity-optimizer';
import { CampusResource } from '@/lib/operations/mesh/mesh-types';

describe('AIMS-016 — CapacityOptimizer', () => {
  it('should identify underutilized resources and compute cross-campus cost savings', () => {
    const optimizer = new CapacityOptimizer();

    const resources: CampusResource[] = [
      {
        resourceId: 'cluster_gpu_1',
        campusId: 'campus_east',
        name: 'AI High Performance Computing Cluster',
        category: 'COMPUTE_CLUSTER',
        capacityUnits: 64,
        isShareableCrossCampus: true,
        hourlyCostRateDollars: 40,
        activeReservations: [], // 0 hours booked -> Underutilized
        institutionId: 'inst_001',
      },
    ];

    const allocations = optimizer.optimizeAllocations(resources, 'campus_west');

    expect(allocations.length).toBe(1);
    expect(allocations[0].resourceId).toBe('cluster_gpu_1');
    expect(allocations[0].costSavingsDollars).toBeGreaterThan(0);
    expect(allocations[0].utilizationRatePercent).toBe(0);
  });
});
