import { CampusResource, CapacityAllocation } from './mesh-types';

/**
 * Cross-Campus Capacity Optimization Engine
 * Calculates asset utilization and proposes inter-campus load balancing.
 */
export class CapacityOptimizer {
  /**
   * Identifies underutilized resources and matches them to requesting campuses
   */
  public optimizeAllocations(
    resources: CampusResource[],
    requestingCampusId: string
  ): CapacityAllocation[] {
    const allocations: CapacityAllocation[] = [];

    for (const res of resources) {
      if (res.campusId !== requestingCampusId && res.isShareableCrossCampus) {
        // Calculate utilization based on confirmed bookings
        const totalHoursBooked = res.activeReservations.length * 2; // Approx 2 hours per reservation
        const totalAvailableHours = 10 * 5; // 50 hours/week
        const utilization = Math.min(100, Math.round((totalHoursBooked / totalAvailableHours) * 100));

        if (utilization < 60) {
          // Underutilized asset candidate for cross-campus sharing
          const estimatedCostSavings = res.hourlyCostRateDollars * 20; // 20 hours shared/month
          allocations.push({
            resourceId: res.resourceId,
            resourceName: res.name,
            hostCampusId: res.campusId,
            allocatedToCampusId: requestingCampusId,
            utilizationRatePercent: utilization,
            costSavingsDollars: estimatedCostSavings,
          });
        }
      }
    }

    return allocations;
  }
}
