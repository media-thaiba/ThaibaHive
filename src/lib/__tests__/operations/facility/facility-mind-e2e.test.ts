import { facilityStore } from '../../../db/facility-store';
import { sensorIngestionGateway } from '../../../operations/facility/ingestion/sensor-ingestion-gateway';
import { TelemetryAggregator } from '../../../operations/facility/telemetry/telemetry-aggregator';
import { VibrationFftAnalyzer } from '../../../operations/facility/predictive/models/vibration-fft-analyzer';
import { ThermalDegradationModel } from '../../../operations/facility/predictive/models/thermal-degradation-model';
import { RulEstimator } from '../../../operations/facility/predictive/rul-estimator';
import { anomalyAlertManager } from '../../../operations/facility/predictive/anomaly-alert-manager';
import { workOrderEngine } from '../../../operations/facility/workorders/work-order-engine';
import { spatialTechnicianRouter } from '../../../operations/facility/workorders/spatial-technician-router';
import { partsInventoryManager } from '../../../operations/facility/inventory/parts-inventory-manager';
import { ReorderAllocator } from '../../../operations/facility/inventory/reorder-allocator';
import { EcoLoadShedder } from '../../../operations/facility/synergy/eco-load-shedder';
import { VisionSafetyCorrelator } from '../../../operations/facility/synergy/vision-safety-correlator';
import { facilityMetricsExporter } from '../../../operations/facility/telemetry/facility-metrics';
import { facilityMerkleAnchor } from '../../../operations/facility/security/facility-merkle-anchor';
import { AuditTrailVerifier } from '../../../operations/facility/security/audit-trail-verifier';

describe('FACILITY-MIND / SmartCampus OS End-to-End Suite (Sprint-052 FACILITY-024)', () => {
  const tenantId = 'inst_e2e_alpha';

  beforeEach(() => {
    facilityStore.clearMemoryStore();
    facilityMerkleAnchor.clear();
    anomalyAlertManager.clearCache();
  });

  it('should execute full autonomous lifecycle from telemetry ingestion to work order sign-off and Merkle verification', async () => {
    // 1. Asset & Sensor Setup
    const chiller = await facilityStore.createEquipment({
      assetTag: 'CHILLER-E2E-01',
      name: 'Main Campus Central Chiller 500-Ton',
      category: 'hvac',
      buildingId: 'bldg_mep',
      floorId: 'floor_basement',
      institutionId: tenantId,
    });

    const sensor = await facilityStore.registerSensor({
      sensorId: 'SENSOR-VIB-E2E-01',
      equipmentId: chiller.id,
      sensorType: 'vibration',
      protocol: 'mqtt',
      unit: 'mm_s_rms',
      minThreshold: 0.1,
      maxThreshold: 4.5,
      institutionId: tenantId,
    });

    // 2. Normal Telemetry Ingestion
    for (let i = 0; i < 10; i++) {
      await sensorIngestionGateway.ingestPacket(
        {
          protocol: 'mqtt',
          sensorId: sensor.sensorId,
          payload: { value: 1.5 + (Math.sin(i) * 0.1), unit: 'mm_s_rms' },
        },
        tenantId
      );
    }

    const stats = TelemetryAggregator.getAggregatesForWindow(sensor.sensorId, 60000, tenantId);
    expect(stats).not.toBeNull();
    expect(stats?.mean).toBeCloseTo(1.5, 1);

    // 3. FFT Analysis & Anomaly Detection
    const rawSamples: number[] = [];
    const N = 128;
    for (let i = 0; i < N; i++) {
      const t = i / 1000;
      rawSamples.push(2.5 * Math.sin(2 * Math.PI * 30 * t) + 1.8 * Math.sin(2 * Math.PI * 107.4 * t));
    }
    const fftRes = VibrationFftAnalyzer.analyze(chiller.id, sensor.sensorId, rawSamples, 1000, 1800);
    expect(fftRes.mechanicalFaultDetected).toBe(true);

    // 4. Anomaly Alert & RUL Estimation
    const alert = await anomalyAlertManager.processAnomaly(
      {
        sensorId: sensor.sensorId,
        equipmentId: chiller.id,
        sensorType: 'vibration',
        currentValue: 4.8,
        expectedValue: 1.5,
        anomalyScore: 0.94,
        isAnomaly: true,
        severity: 'critical',
        alertType: 'bearing_spalling_bpfo',
        reason: 'Outer race defect detected',
        timestamp: new Date().toISOString(),
      },
      8000,
      tenantId
    );
    expect(alert).not.toBeNull();
    expect(alert?.estimatedRulHours).toBeDefined();

    // 5. Work Order Auto-Generation
    const wo = await workOrderEngine.autoCreateFromAnomaly(alert!.alertId, tenantId);
    expect(wo).not.toBeNull();
    expect(wo?.priority).toBe('emergency');

    // 6. Spatial Routing & Technician Assignment
    const candidates = [
      {
        technicianId: 'tech_carlos',
        name: 'Carlos (HVAC Specialist)',
        skills: ['hvac'],
        location: { buildingId: 'bldg_mep', floorId: 'floor_1', x: 20, y: 30, z: 1 },
        activeCaseload: 1,
      },
    ];
    const targetLoc = { buildingId: 'bldg_mep', floorId: 'floor_basement', x: 30, y: 40, z: -1 };
    const ranked = spatialTechnicianRouter.rankTechnicians(candidates, targetLoc, 'hvac');
    expect(ranked[0].technicianId).toBe('tech_carlos');

    // 7. Parts Reservation & Work Order State Machine
    await facilityStore.createPart({
      partNumber: 'BRG-SKF-6205-E2E',
      name: 'Bearing SKF 6205',
      category: 'bearings',
      quantityOnHand: 10,
      reorderThreshold: 3,
      institutionId: tenantId,
    });

    const partRes = await partsInventoryManager.reserveParts(
      [{ workOrderId: wo!.workOrderNumber, partNumber: 'BRG-SKF-6205-E2E', quantity: 2 }],
      tenantId
    );
    expect(partRes.allReserved).toBe(true);

    await workOrderEngine.transitionState({
      workOrderNumber: wo!.workOrderNumber,
      fromStatus: 'scheduled',
      toStatus: 'assigned',
      actorId: 'admin_lead',
      actorRole: 'admin',
    }, tenantId);

    await workOrderEngine.transitionState({
      workOrderNumber: wo!.workOrderNumber,
      fromStatus: 'assigned',
      toStatus: 'in_progress',
      actorId: 'tech_carlos',
      actorRole: 'staff',
    }, tenantId);

    const completed = await workOrderEngine.transitionState({
      workOrderNumber: wo!.workOrderNumber,
      fromStatus: 'in_progress',
      toStatus: 'completed',
      actorId: 'tech_carlos',
      actorRole: 'staff',
      notes: 'Bearing replaced, dynamic balancing completed.',
      technicianSignature: 'sig_carlos_verified',
      consumedParts: [{ partNumber: 'BRG-SKF-6205-E2E', quantity: 2 }],
    }, tenantId);
    expect(completed.success).toBe(true);

    // 8. Cryptographic Merkle Verification
    const auditLogs = await facilityStore.listAuditLogs(tenantId);
    const verification = AuditTrailVerifier.verifyLogChain(auditLogs);
    expect(verification.valid).toBe(true);
    expect(verification.totalVerified).toBeGreaterThan(0);
  });
});
