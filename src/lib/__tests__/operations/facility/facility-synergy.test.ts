import { EcoLoadShedder } from '../../../operations/facility/synergy/eco-load-shedder';
import { VisionSafetyCorrelator } from '../../../operations/facility/synergy/vision-safety-correlator';
import { facilityStore } from '../../../db/facility-store';

describe('Cross-Subsystem Synergy: ECO-MESH & VISION-SHIELD (Sprint-052 FACILITY-011)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  it('should execute automated HVAC temperature setbacks during ECO-MESH peak tariff events while honoring cleanroom exemptions', async () => {
    await facilityStore.createEquipment({
      assetTag: 'AHU-ACAD-01',
      name: 'Academic Wing AHU',
      category: 'hvac',
      buildingId: 'bldg_acad',
      floorId: 'floor_1',
      institutionId: 'inst_alpha',
    });

    await facilityStore.createEquipment({
      assetTag: 'AHU-CLEANROOM-BIO',
      name: 'Biomedical Cleanroom AHU',
      category: 'hvac',
      buildingId: 'bldg_bioresearch',
      floorId: 'floor_2',
      roomId: 'cleanroom_iso7',
      institutionId: 'inst_alpha',
    });

    const result = await EcoLoadShedder.executePeakShave(
      {
        eventId: 'PEAK_TARIFF_20260821_1400',
        tariffRatePerKwh: 0.45,
        targetCurtailmentKw: 30.0,
        durationMinutes: 60,
        setbackDegreesCelsius: 1.5,
        exemptZones: ['bldg_bioresearch', 'cleanroom_iso7'],
      },
      'inst_alpha'
    );

    expect(result.status).toBe('executed');
    expect(result.facilitiesShedded.length).toBe(1);
    expect(result.facilitiesShedded[0].equipmentTag).toBe('AHU-ACAD-01');
    expect(result.facilitiesShedded[0].newSetpointC).toBe(22.5);
    expect(result.exemptionsHonored.length).toBe(1);
    expect(result.totalPowerCurtailmentKw).toBeGreaterThan(0);
  });

  it('should correlate VISION-SHIELD elevator entrapment events and dispatch emergency priority work orders with BMS lockout', async () => {
    const elevator = await facilityStore.createEquipment({
      assetTag: 'ELEV-NORTH-01',
      name: 'North Tower Passenger Elevator',
      category: 'elevator',
      buildingId: 'bldg_admin',
      floorId: 'floor_3',
      institutionId: 'inst_alpha',
    });

    const result = await VisionSafetyCorrelator.correlateAndDispatch(
      {
        visionAlertId: 'VISION_ALERT_ENTRAP_889',
        cameraId: 'CAM_ELEV_CABIN_03',
        buildingId: 'bldg_admin',
        floorId: 'floor_3',
        eventType: 'elevator_entrapment',
        confidenceScore: 0.98,
        timestamp: new Date().toISOString(),
      },
      'inst_alpha'
    );

    expect(result.priority).toBe('emergency');
    expect(result.bmsLockoutApplied).toBe(true);
    expect(result.dispatchedTechnicians).toContain('tech_emergency_rapid_response');

    const updatedElev = await facilityStore.getEquipmentById(elevator.id, 'inst_alpha');
    expect(updatedElev?.status).toBe('offline');
  });
});
