import { spatialTechnicianRouter } from '../../../operations/facility/workorders/spatial-technician-router';
import { ContractorDispatcher } from '../../../operations/facility/workorders/contractor-dispatcher';
import { facilityStore } from '../../../db/facility-store';

describe('TWIN-OPS 3D Spatial Routing & Technician Assignment (Sprint-052 FACILITY-009)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  it('should rank technicians considering skill match, 3D proximity, and caseload', () => {
    const targetLoc = { buildingId: 'bldg_eng', floorId: 'floor_basement', roomId: 'chiller_rm', x: 20, y: 30, z: -1 };

    const candidates = [
      {
        technicianId: 'tech_alice',
        name: 'Alice (HVAC Specialist)',
        skills: ['hvac', 'chillers'],
        location: { buildingId: 'bldg_eng', floorId: 'floor_1', roomId: 'hall_101', x: 25, y: 35, z: 1 }, // 2 floors away (30m)
        activeCaseload: 1,
      },
      {
        technicianId: 'tech_bob',
        name: 'Bob (General Maintenance)',
        skills: ['general'],
        location: { buildingId: 'bldg_eng', floorId: 'floor_basement', roomId: 'storage_b1', x: 22, y: 31, z: -1 }, // Same floor, very close (3m)
        activeCaseload: 4,
      },
      {
        technicianId: 'tech_carol',
        name: 'Carol (Plumbing Specialist)',
        skills: ['plumbing'],
        location: { buildingId: 'bldg_acad', floorId: 'floor_2', roomId: 'lab_204', x: 120, y: 150, z: 2 }, // Other building
        activeCaseload: 0,
      },
    ];

    const ranked = spatialTechnicianRouter.rankTechnicians(candidates, targetLoc, 'hvac');
    expect(ranked.length).toBe(3);

    // Alice should rank highest due to exact HVAC skill match and moderate proximity
    expect(ranked[0].technicianId).toBe('tech_alice');
    expect(ranked[0].compositeRankScore).toBeGreaterThan(ranked[1].compositeRankScore);
    expect(ranked[2].technicianId).toBe('tech_carol'); // Other building & mismatched skill
  });

  it('should compute 3D indoor waypoint route with cross-floor transit instructions', () => {
    const startLoc = { buildingId: 'bldg_eng', floorId: 'floor_1', roomId: 'office_102', x: 10, y: 15, z: 1 };
    const targetLoc = { buildingId: 'bldg_eng', floorId: 'floor_basement', roomId: 'chiller_plant', x: 80, y: 90, z: -1 };

    const route = spatialTechnicianRouter.computeRoute('tech_alice', startLoc, 'CHILLER-01', targetLoc);
    expect(route.crossFloorTransit).toBe(true);
    expect(route.waypoints.length).toBeGreaterThanOrEqual(4);
    expect(route.totalDistanceMeters).toBeGreaterThan(100);
    expect(route.estimatedWalkTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  it('should dispatch external contractor when specialized service is required', async () => {
    await facilityStore.registerContractor({
      contractorId: 'CONT_ELEV_01',
      companyName: 'Otis Mobility Services',
      contactName: 'Dispatch Center',
      email: 'service@otis-partner.com',
      phone: '+1-800-555-OTIS',
      specializationsJson: JSON.stringify(['elevator', 'escalator']),
      ratePerHour: 120.0,
      slaEmergencyHours: 1,
      slaRoutineHours: 8,
      performanceRating: 4.9,
      institutionId: 'inst_alpha',
    });

    const result = await ContractorDispatcher.dispatchSpecialist('elevator', true, 'inst_alpha');
    expect(result.dispatched).toBe(true);
    expect(result.contractor?.companyName).toBe('Otis Mobility Services');
    expect(result.slaDeadlineHours).toBe(1);
  });
});
