import { CampusResourceBroker } from '@/lib/operations/mesh/campus-resource-broker';
import { CampusResource, ResourceReservation } from '@/lib/operations/mesh/mesh-types';

describe('AIMS-016 — CampusResourceBroker', () => {
  it('should book shareable resources and prevent overlapping time slot collisions', () => {
    const broker = new CampusResourceBroker();

    const resource: CampusResource = {
      resourceId: 'lab_vr_simulator_1',
      campusId: 'campus_main',
      name: 'Advanced VR Medical Simulator Lab',
      category: 'SPECIALIZED_EQUIPMENT',
      capacityUnits: 15,
      isShareableCrossCampus: true,
      hourlyCostRateDollars: 50,
      activeReservations: [],
      institutionId: 'inst_001',
    };
    broker.registerResource(resource);

    const res1: ResourceReservation = {
      reservationId: 'res_001',
      resourceId: 'lab_vr_simulator_1',
      requestingCampusId: 'campus_south',
      hostCampusId: 'campus_main',
      reservedByUserId: 'user_prof_smith',
      startTimeIso: '2026-08-20T10:00:00Z',
      endTimeIso: '2026-08-20T12:00:00Z',
      unitsReserved: 10,
      status: 'PENDING',
      lamportTimestamp: 1,
    };

    const firstBooking = broker.bookResource(res1);
    expect(firstBooking.success).toBe(true);
    expect(firstBooking.reservation?.status).toBe('CONFIRMED');

    // Overlapping booking: Must be rejected
    const res2: ResourceReservation = {
      reservationId: 'res_002',
      resourceId: 'lab_vr_simulator_1',
      requestingCampusId: 'campus_north',
      hostCampusId: 'campus_main',
      reservedByUserId: 'user_prof_jones',
      startTimeIso: '2026-08-20T11:00:00Z', // Overlaps 10:00-12:00
      endTimeIso: '2026-08-20T13:00:00Z',
      unitsReserved: 5,
      status: 'PENDING',
      lamportTimestamp: 2,
    };

    const secondBooking = broker.bookResource(res2);
    expect(secondBooking.success).toBe(false);
    expect(secondBooking.reason).toContain('collision');
  });
});
