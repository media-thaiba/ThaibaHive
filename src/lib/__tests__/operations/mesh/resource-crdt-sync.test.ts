import { ResourceCrdtSync } from '@/lib/operations/mesh/resource-crdt-sync';
import { ResourceReservation } from '@/lib/operations/mesh/mesh-types';

describe('AIMS-017 — ResourceCrdtSync', () => {
  it('should converge deterministically after merging concurrent partition bookings and cancellations', () => {
    const nodeA = new ResourceCrdtSync('campus_A');
    const nodeB = new ResourceCrdtSync('campus_B');

    const resA: ResourceReservation = {
      reservationId: 'res_A1',
      resourceId: 'hall_1',
      requestingCampusId: 'campus_A',
      hostCampusId: 'campus_A',
      reservedByUserId: 'user_1',
      startTimeIso: '2026-08-20T09:00:00Z',
      endTimeIso: '2026-08-20T10:00:00Z',
      unitsReserved: 1,
      status: 'CONFIRMED',
      lamportTimestamp: 0,
    };

    const resB: ResourceReservation = {
      reservationId: 'res_B1',
      resourceId: 'hall_2',
      requestingCampusId: 'campus_B',
      hostCampusId: 'campus_B',
      reservedByUserId: 'user_2',
      startTimeIso: '2026-08-20T14:00:00Z',
      endTimeIso: '2026-08-20T15:00:00Z',
      unitsReserved: 1,
      status: 'CONFIRMED',
      lamportTimestamp: 0,
    };

    // Partition: Book locally
    nodeA.addReservation(resA);
    nodeB.addReservation(resB);

    // Merge partition states
    nodeA.merge(nodeB);
    nodeB.merge(nodeA);

    expect(nodeA.getActiveReservations().length).toBe(2);
    expect(nodeB.getActiveReservations().length).toBe(2);

    // Node A cancels reservation A1
    nodeA.cancelReservation('res_A1');
    nodeB.merge(nodeA);

    expect(nodeA.getActiveReservations().length).toBe(1);
    expect(nodeB.getActiveReservations().length).toBe(1);
    expect(nodeB.getActiveReservations()[0].reservationId).toBe('res_B1');
  });
});
