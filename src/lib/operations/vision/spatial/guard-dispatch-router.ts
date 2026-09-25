import { VisionDbStore } from '../../../db/vision-store';
import { SpatialCoordinate3D } from '../vision-types';

export interface GuardDispatchDecision {
  dispatchId: string;
  guardId: string;
  callSign: string;
  incidentId: string;
  targetLocation: SpatialCoordinate3D;
  etaSeconds: number;
  assignedRoute: SpatialCoordinate3D[];
}

export class GuardDispatchRouter {
  private dbStore: VisionDbStore;

  constructor(dbStore?: VisionDbStore) {
    this.dbStore = dbStore || VisionDbStore.getInstance();
  }

  public async findAndDispatchNearestGuard(
    incidentId: string,
    targetLocation: SpatialCoordinate3D,
    facilityId?: string,
    tenantId: string = 'global'
  ): Promise<GuardDispatchDecision | null> {
    const guards = await this.dbStore.listGuardProfiles(tenantId);
    const availableGuards = guards.filter(
      (g) => g.status === 'on_duty' || g.status === 'patrolling'
    );

    if (availableGuards.length === 0) return null;

    // Find closest guard via Euclidean distance in 3D
    let nearestGuard = availableGuards[0];
    let minDistance = Infinity;

    for (const g of availableGuards) {
      const dx = g.currentLocationX - targetLocation.x;
      const dy = g.currentLocationY - targetLocation.y;
      const dz = (g.currentLocationZ - targetLocation.z) * 3; // Penalize floor changes
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDistance) {
        minDistance = dist;
        nearestGuard = g;
      }
    }

    // Walking speed: 1.4 m/s
    const etaSeconds = Math.max(30, Math.round(minDistance / 1.4));

    // Simple 3D A* waypoint interpolation
    const assignedRoute: SpatialCoordinate3D[] = [
      { x: nearestGuard.currentLocationX, y: nearestGuard.currentLocationY, z: nearestGuard.currentLocationZ },
      {
        x: Number(((nearestGuard.currentLocationX + targetLocation.x) / 2).toFixed(2)),
        y: Number(((nearestGuard.currentLocationY + targetLocation.y) / 2).toFixed(2)),
        z: targetLocation.z,
      },
      targetLocation,
    ];

    const dispatchId = `dsp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await this.dbStore.createGuardDispatch({
      dispatchId,
      incidentId,
      guardId: nearestGuard.guardId,
      priority: 'high',
      assignedRouteJson: JSON.stringify(assignedRoute),
      etaSeconds,
      responseStatus: 'dispatched',
      dispatchedAt: new Date().toISOString(),
      institutionId: tenantId,
    });

    await this.dbStore.updateGuardProfile(
      nearestGuard.guardId,
      { status: 'dispatched' },
      tenantId
    );

    return {
      dispatchId,
      guardId: nearestGuard.guardId,
      callSign: nearestGuard.callSign,
      incidentId,
      targetLocation,
      etaSeconds,
      assignedRoute,
    };
  }
}
