import { TechnicianCandidate, SpatialRoutePlan, SpatialWaypoint } from './work-order-types';

export interface SpatialLocation {
  buildingId: string;
  floorId: string;
  roomId?: string;
  x: number;
  y: number;
  z: number; // Floor level (e.g. -1 for basement, 0 for ground, 1 for 1st floor, etc.)
}

export class SpatialTechnicianRouter {
  private static instance: SpatialTechnicianRouter;

  public static getInstance(): SpatialTechnicianRouter {
    if (!SpatialTechnicianRouter.instance) {
      SpatialTechnicianRouter.instance = new SpatialTechnicianRouter();
    }
    return SpatialTechnicianRouter.instance;
  }

  /**
   * Calculates 3D indoor distance with floor penalty:
   * Dist = sqrt((x2 - x1)^2 + (y2 - y1)^2) + |z2 - z1| * 15 (meters per vertical floor level)
   */
  public calculateDistance(start: SpatialLocation, end: SpatialLocation): number {
    const isSameBuilding = start.buildingId === end.buildingId;
    const buildingPenalty = isSameBuilding ? 0 : 150; // 150 meters between buildings

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const horizontalDist = Math.sqrt(dx * dx + dy * dy);

    const verticalDist = Math.abs(end.z - start.z) * 15.0;

    return Number((horizontalDist + verticalDist + buildingPenalty).toFixed(1));
  }

  /**
   * Generates step-by-step 3D indoor waypoint route.
   */
  public computeRoute(
    technicianId: string,
    start: SpatialLocation,
    equipmentId: string,
    target: SpatialLocation
  ): SpatialRoutePlan {
    const totalDist = this.calculateDistance(start, target);
    const estimatedWalkTimeMinutes = Math.max(1, Math.round(totalDist / 70)); // approx 70 meters/minute walking pace
    const crossFloorTransit = start.floorId !== target.floorId || start.z !== target.z;

    const waypoints: SpatialWaypoint[] = [
      {
        stepIndex: 1,
        buildingId: start.buildingId,
        floorId: start.floorId,
        roomId: start.roomId,
        coordinates: { x: start.x, y: start.y, z: start.z },
        instruction: `Start at ${start.buildingId} ${start.floorId} (${start.roomId || 'Current Location'})`,
      },
    ];

    if (crossFloorTransit) {
      waypoints.push({
        stepIndex: 2,
        buildingId: target.buildingId,
        floorId: start.floorId,
        coordinates: { x: 50, y: 50, z: start.z },
        instruction: `Proceed to central elevator/stairwell B in ${target.buildingId}`,
      });
      waypoints.push({
        stepIndex: 3,
        buildingId: target.buildingId,
        floorId: target.floorId,
        coordinates: { x: 50, y: 50, z: target.z },
        instruction: `Transit to ${target.floorId} via elevator/stairs`,
      });
    }

    waypoints.push({
      stepIndex: waypoints.length + 1,
      buildingId: target.buildingId,
      floorId: target.floorId,
      roomId: target.roomId,
      coordinates: { x: target.x, y: target.y, z: target.z },
      instruction: `Arrive at target equipment ${equipmentId} in room ${target.roomId || 'Equipment Area'}`,
    });

    return {
      technicianId,
      equipmentId,
      totalDistanceMeters: totalDist,
      estimatedWalkTimeMinutes,
      waypoints,
      crossFloorTransit,
    };
  }

  /**
   * Ranks candidates by skill match, proximity, and current active caseload.
   */
  public rankTechnicians(
    candidates: {
      technicianId: string;
      name: string;
      skills: string[];
      location: SpatialLocation;
      activeCaseload: number;
    }[],
    targetLocation: SpatialLocation,
    requiredSkill: string
  ): TechnicianCandidate[] {
    const results: TechnicianCandidate[] = candidates.map((cand) => {
      const distanceMeters = this.calculateDistance(cand.location, targetLocation);

      // Proximity score: closer = higher score (0 - 1.0)
      const proximityScore = Math.max(0, 1.0 - distanceMeters / 500);

      // Skill match score: exact match = 1.0, general = 0.5, mismatch = 0.1
      const hasExactSkill = cand.skills.includes(requiredSkill);
      const hasGeneral = cand.skills.includes('general');
      const skillScore = hasExactSkill ? 1.0 : hasGeneral ? 0.5 : 0.1;

      // Caseload score: 0 tickets = 1.0, 5+ tickets = 0.0
      const caseloadScore = Math.max(0, 1.0 - cand.activeCaseload / 5);

      // Composite Rank: 40% Skill + 40% Proximity + 20% Caseload
      const compositeRankScore = Number(
        (0.4 * skillScore + 0.4 * proximityScore + 0.2 * caseloadScore).toFixed(3)
      );

      return {
        technicianId: cand.technicianId,
        name: cand.name,
        specializations: cand.skills,
        currentBuildingId: cand.location.buildingId,
        currentFloorId: cand.location.floorId,
        distanceMeters,
        activeCaseload: cand.activeCaseload,
        compositeRankScore,
      };
    });

    return results.sort((a, b) => b.compositeRankScore - a.compositeRankScore);
  }
}

export const spatialTechnicianRouter = SpatialTechnicianRouter.getInstance();
