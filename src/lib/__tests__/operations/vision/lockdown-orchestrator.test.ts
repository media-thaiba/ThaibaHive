import { LockdownOrchestrator } from '../../../operations/vision/emergency/lockdown-orchestrator';
import { ZoneIsolationMatrix } from '../../../operations/vision/emergency/zone-isolation-matrix';
import { EgressPathController } from '../../../operations/vision/emergency/egress-path-controller';
import { VisionDbStore } from '../../../db/vision-store';

describe('LockdownOrchestrator Multi-Zone Lockdown & Life Safety Egress', () => {
  let orchestrator: LockdownOrchestrator;
  let zoneMatrix: ZoneIsolationMatrix;
  let egressController: EgressPathController;
  let store: VisionDbStore;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    zoneMatrix = new ZoneIsolationMatrix();
    egressController = new EgressPathController();

    zoneMatrix.registerZone('zone_science_wing_a', 'fac_science', 12);
    zoneMatrix.registerZone('zone_science_wing_b', 'fac_science', 10);
    zoneMatrix.registerZone('zone_admin_lobby', 'fac_admin', 6);

    egressController.registerPath('path_sci_exit_1', 'fac_science', ['door_exit_01', 'door_exit_02']);

    orchestrator = new LockdownOrchestrator(zoneMatrix, egressController, store);
  });

  it('should execute facility-wide lockdown and illuminate emergency evacuation paths', async () => {
    const result = await orchestrator.triggerLockdown({
      scope: 'facility',
      targetFacilityId: 'fac_science',
      reason: 'Active physical security threat in Science building',
      triggeredByUserId: 'user_security_admin',
      triggerEcoMeshIslanding: true,
      tenantId: 'tenant_alpha',
    });

    expect(result.affectedZones.length).toBe(2);
    expect(result.doorsLockedCount).toBe(22);
    expect(result.egressPathsIlluminated).toBe(true);
    expect(result.merkleAuditHash.length).toBe(64);

    const event = await store.getLockdownEventById(result.lockdownId, 'tenant_alpha');
    expect(event?.status).toBe('active');
    expect(event?.doorsLockedCount).toBe(22);
  });

  it('should lift lockdown and restore normal egress state upon all clear', async () => {
    const trigger = await orchestrator.triggerLockdown({
      scope: 'campus_wide',
      reason: 'Campus-wide safety drill',
      triggeredByUserId: 'user_chief_security',
      tenantId: 'tenant_alpha',
    });

    const lifted = await orchestrator.liftLockdown(trigger.lockdownId, 'tenant_alpha');
    expect(lifted?.status).toBe('all_clear');
    expect(lifted?.allClearAt).toBeDefined();
  });
});
