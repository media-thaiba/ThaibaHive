import { DistributedReservationScheduler } from '@/lib/operations/mesh/distributed-reservation-scheduler';
import { ResourceReservation } from '@/lib/operations/mesh/mesh-types';

describe('AIMS-017 — DistributedReservationScheduler', () => {
  it('should synchronize reservations across multiple campus peer nodes', () => {
    const scheduler = new DistributedReservationScheduler('campus_main');
    const peerSouth = scheduler.registerPeerNode('campus_south');

    const res: ResourceReservation = {
      reservationId: 'res_sync_99',
      resourceId: 'equipment_3d_printer',
      requestingCampusId: 'campus_south',
      hostCampusId: 'campus_main',
      reservedByUserId: 'student_77',
      startTimeIso: '2026-08-20T16:00:00Z',
      endTimeIso: '2026-08-20T18:00:00Z',
      unitsReserved: 1,
      status: 'CONFIRMED',
      lamportTimestamp: 0,
    };

    peerSouth.addReservation(res);

    const report = scheduler.synchronizeAcrossCampuses();

    expect(report.syncedNodeCount).toBe(2);
    expect(report.activeReservationsCount).toBe(1);
    expect(scheduler.getReservations()[0].resourceId).toBe('equipment_3d_printer');
  });
});
