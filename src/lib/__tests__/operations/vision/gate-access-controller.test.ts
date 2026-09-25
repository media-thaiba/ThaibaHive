import { GateAccessController } from '../../../operations/vision/alpr/gate-access-controller';
import { VisionDbStore } from '../../../db/vision-store';
import { ParkingOccupancyIndexer } from '../../../operations/vision/alpr/parking-occupancy-indexer';

describe('GateAccessController Whitelist / Blacklist & Parking Access', () => {
  let controller: GateAccessController;
  let store: VisionDbStore;
  let parkingIndexer: ParkingOccupancyIndexer;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    parkingIndexer = new ParkingOccupancyIndexer();
    parkingIndexer.registerLot('fac_main_lot', 50);
    controller = new GateAccessController(store, parkingIndexer);
  });

  it('should authorize valid whitelisted staff vehicle and actuate barrier gate', async () => {
    await store.createVehicleWhitelist({
      permitId: 'prm_staff_01',
      plateNumber: 'ABC-1234',
      ownerName: 'Prof. Davis',
      ownerType: 'staff',
      validFrom: '2026-01-01',
      status: 'active',
      institutionId: 'tenant_alpha',
    });

    const decision = await controller.evaluateGateAccess(
      'ABC-1234',
      'gate_north',
      'fac_main_lot',
      'entry',
      'tenant_alpha'
    );

    expect(decision.isAuthorized).toBe(true);
    expect(decision.gateActuated).toBe(true);
    expect(decision.permitStatus).toBe('authorized_staff');
    expect(decision.parkingCapacity?.occupiedSpots).toBe(1);
  });

  it('should block and flag blacklisted vehicle', async () => {
    await store.createVehicleWhitelist({
      permitId: 'prm_banned_01',
      plateNumber: 'BAD-9999',
      ownerName: 'Unknown Driver',
      ownerType: 'vendor',
      validFrom: '2026-01-01',
      isBlacklisted: true,
      blacklistReason: 'Prior unauthorized campus breach attempt',
      status: 'suspended',
      institutionId: 'tenant_alpha',
    });

    const decision = await controller.evaluateGateAccess(
      'BAD-9999',
      'gate_north',
      'fac_main_lot',
      'entry',
      'tenant_alpha'
    );

    expect(decision.isAuthorized).toBe(false);
    expect(decision.isBlacklisted).toBe(true);
    expect(decision.gateActuated).toBe(false);
    expect(decision.permitStatus).toBe('blacklisted');
  });
});
