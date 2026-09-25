import { GuardDispatchRouter } from '../../../operations/vision/spatial/guard-dispatch-router';
import { VisionDbStore } from '../../../db/vision-store';
import { PatrolRouteOptimizer } from '../../../operations/vision/spatial/patrol-route-optimizer';

describe('GuardDispatchRouter & Patrol Route Optimizer', () => {
  let router: GuardDispatchRouter;
  let store: VisionDbStore;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    router = new GuardDispatchRouter(store);
  });

  it('should find and dispatch the nearest available security guard', async () => {
    // Guard 1: Far away at (100, 100)
    await store.createGuardProfile({
      guardId: 'grd_far',
      staffId: 'staff_1',
      badgeNumber: 'SEC-1001',
      callSign: 'Bravo-1',
      status: 'on_duty',
      currentLocationX: 100.0,
      currentLocationY: 100.0,
      currentLocationZ: 0.0,
      batteryPercent: 95.0,
      lastHeartbeatAt: new Date().toISOString(),
      institutionId: 'tenant_alpha',
    });

    // Guard 2: Close by at (12, 14)
    await store.createGuardProfile({
      guardId: 'grd_close',
      staffId: 'staff_2',
      badgeNumber: 'SEC-1002',
      callSign: 'Alpha-1',
      status: 'on_duty',
      currentLocationX: 12.0,
      currentLocationY: 14.0,
      currentLocationZ: 0.0,
      batteryPercent: 88.0,
      lastHeartbeatAt: new Date().toISOString(),
      institutionId: 'tenant_alpha',
    });

    // Incident at (10, 10)
    const decision = await router.findAndDispatchNearestGuard(
      'inc_breakin_01',
      { x: 10, y: 10, z: 0 },
      'fac_main',
      'tenant_alpha'
    );

    expect(decision).not.toBeNull();
    expect(decision?.guardId).toBe('grd_close');
    expect(decision?.callSign).toBe('Alpha-1');
    expect(decision?.assignedRoute.length).toBe(3);

    const guardProfile = await store.getGuardProfileById('grd_close', 'tenant_alpha');
    expect(guardProfile?.status).toBe('dispatched');
  });

  it('should generate randomized patrol tour with checkpoints', () => {
    const checkpoints = [
      { checkpointId: 'cp1', name: 'Main Gate', x: 0, y: 0, z: 0, riskLevel: 'high' as const },
      { checkpointId: 'cp2', name: 'Library Hall', x: 20, y: 30, z: 0, riskLevel: 'medium' as const },
      { checkpointId: 'cp3', name: 'Gymnasium Backdoor', x: 50, y: 80, z: 0, riskLevel: 'high' as const },
      { checkpointId: 'cp4', name: 'Cafeteria Patio', x: 10, y: 60, z: 0, riskLevel: 'low' as const },
    ];

    const tour = PatrolRouteOptimizer.generatePatrolTour(checkpoints, 6);
    expect(tour.length).toBe(6);
    expect(tour.some((c) => c.checkpointId === 'cp1' || c.checkpointId === 'cp3')).toBe(true);
  });
});
