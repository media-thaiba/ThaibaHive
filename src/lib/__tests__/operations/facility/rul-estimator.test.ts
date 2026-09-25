import { RulEstimator } from '../../../operations/facility/predictive/rul-estimator';
import { anomalyAlertManager } from '../../../operations/facility/predictive/anomaly-alert-manager';
import { facilityStore } from '../../../db/facility-store';

describe('Remaining Useful Life (RUL) & Anomaly Alert Triage (Sprint-052 FACILITY-007)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
    anomalyAlertManager.clearCache();
  });

  it('should estimate remaining useful life with Weibull degradation curves', () => {
    // Equipment with 8,000 hours runtime and high anomaly score (0.85)
    const rul = RulEstimator.estimateRul('MOTOR_AHU_01', 8000, 0.85, 20000, 2.5);

    expect(rul.estimatedRulHours).toBeLessThan(12000);
    expect(rul.confidenceInterval.lowerBoundHours).toBeLessThan(rul.estimatedRulHours);
    expect(rul.confidenceInterval.upperBoundHours).toBeGreaterThan(rul.estimatedRulHours);
    expect(rul.hazardRate).toBeGreaterThan(0);
    expect(rul.recommendedMaintenanceWindowDays).toBeGreaterThan(0);
  });

  it('should create anomaly alerts and update equipment health scores', async () => {
    const equip = await facilityStore.createEquipment({
      assetTag: 'PUMP-SEC-01',
      name: 'Secondary Chilled Water Pump',
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      institutionId: 'inst_alpha',
    });

    const alert = await anomalyAlertManager.processAnomaly(
      {
        sensorId: 'SENSOR_VIB_99',
        equipmentId: equip.id,
        sensorType: 'vibration',
        currentValue: 5.8,
        expectedValue: 1.2,
        anomalyScore: 0.92,
        isAnomaly: true,
        severity: 'critical',
        alertType: 'bearing_spalling_bpfi',
        reason: 'Inner race bearing impact detected',
        timestamp: new Date().toISOString(),
      },
      6000,
      'inst_alpha'
    );

    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe('critical');
    expect(alert?.estimatedRulHours).toBeDefined();

    // Check equipment status updated
    const updatedEquip = await facilityStore.getEquipmentById(equip.id, 'inst_alpha');
    expect(updatedEquip?.status).toBe('degraded');
    expect(updatedEquip?.healthScore).toBeLessThan(80);
  });
});
