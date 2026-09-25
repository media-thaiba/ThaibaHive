import { facilityStore } from '../../db/facility-store';

describe('Facility Store Data Access Layer (Sprint-052 FACILITY-MIND)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  it('should create and retrieve equipment with tenant isolation', async () => {
    const equipAlpha = await facilityStore.createEquipment({
      assetTag: 'CHILLER-01',
      name: 'Main Campus Central Chiller 500-Ton',
      category: 'hvac',
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      roomId: 'room_mep_01',
      institutionId: 'inst_alpha',
    });

    const equipBeta = await facilityStore.createEquipment({
      assetTag: 'ELEV-03',
      name: 'Library Passenger Elevator North',
      category: 'elevator',
      buildingId: 'bldg_lib',
      floorId: 'floor_1',
      institutionId: 'inst_beta',
    });

    const fetchedAlpha = await facilityStore.getEquipmentById('CHILLER-01', 'inst_alpha');
    expect(fetchedAlpha).toBeDefined();
    expect(fetchedAlpha?.name).toBe('Main Campus Central Chiller 500-Ton');
    expect(fetchedAlpha?.healthScore).toBe(100.0);

    // Tenant isolation verification
    const fetchedCrossTenant = await facilityStore.getEquipmentById('CHILLER-01', 'inst_beta');
    expect(fetchedCrossTenant).toBeNull();

    const listBeta = await facilityStore.listEquipment('inst_beta');
    expect(listBeta).toHaveLength(1);
    expect(listBeta[0].assetTag).toBe('ELEV-03');
  });

  it('should register sensors and update telemetry readings', async () => {
    const equip = await facilityStore.createEquipment({
      assetTag: 'AHU-04',
      name: 'Science Wing Air Handling Unit',
      category: 'hvac',
      buildingId: 'bldg_sci',
      floorId: 'floor_roof',
      institutionId: 'inst_alpha',
    });

    const sensor = await facilityStore.registerSensor({
      sensorId: 'SENSOR-VIB-01',
      equipmentId: equip.id,
      sensorType: 'vibration',
      protocol: 'mqtt',
      unit: 'mm_s_rms',
      minThreshold: 0.1,
      maxThreshold: 4.5,
      institutionId: 'inst_alpha',
    });

    expect(sensor.status).toBe('active');

    await facilityStore.recordSensorReading({
      sensorId: sensor.sensorId,
      equipmentId: equip.id,
      readingValue: 2.34,
      unit: 'mm_s_rms',
      institutionId: 'inst_alpha',
    });

    const updated = await facilityStore.updateSensorReading(sensor.sensorId, 2.34, 'inst_alpha');
    expect(updated?.lastReadingValue).toBe(2.34);

    const readings = await facilityStore.listReadingsForSensor(sensor.sensorId, 'inst_alpha');
    expect(readings).toHaveLength(1);
    expect(readings[0].readingValue).toBe(2.34);
  });

  it('should manage anomaly alerts lifecycle and triage', async () => {
    const equip = await facilityStore.createEquipment({
      assetTag: 'PUMP-02',
      name: 'Chilled Water Secondary Pump',
      category: 'hvac',
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      institutionId: 'inst_alpha',
    });

    const alert = await facilityStore.createAnomalyAlert({
      alertId: 'ALT-9901',
      equipmentId: equip.id,
      alertType: 'bearing_wear',
      severity: 'critical',
      anomalyScore: 0.94,
      predictedFailureMode: 'Inner race bearing spalling (BPFI)',
      estimatedRulHours: 48,
      rootCauseHypothesis: 'Elevated 120Hz vibration harmonic & thermal rise',
      institutionId: 'inst_alpha',
    });

    const alerts = await facilityStore.listAnomalyAlerts('inst_alpha', 'open');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');

    const triaged = await facilityStore.updateAlertStatus(
      alert.alertId,
      'triaged',
      'Dispatched emergency technician for vibration dampening check',
      'staff_tech_lead',
      'inst_alpha'
    );
    expect(triaged?.status).toBe('triaged');
    expect(triaged?.acknowledgedByStaffId).toBe('staff_tech_lead');
  });

  it('should manage work order state transitions and parts reservations', async () => {
    const wo = await facilityStore.createWorkOrder({
      workOrderNumber: 'WO-2026-0089',
      title: 'Emergency Chiller Bearing Replacement',
      priority: 'emergency',
      category: 'hvac',
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      institutionId: 'inst_alpha',
    });

    expect(wo.status).toBe('draft');

    const part = await facilityStore.createPart({
      partNumber: 'BRG-6205-2RS',
      name: 'Deep Groove Ball Bearing 25x52x15mm',
      category: 'bearings',
      quantityOnHand: 10,
      reorderThreshold: 3,
      institutionId: 'inst_alpha',
    });

    const reserved = await facilityStore.reservePart(part.partNumber, 2, 'inst_alpha');
    expect(reserved).toBe(true);

    const fetchedPart = await facilityStore.getPart(part.partNumber, 'inst_alpha');
    expect(fetchedPart?.quantityReserved).toBe(2);

    const updatedWo = await facilityStore.updateWorkOrderStatus(
      wo.workOrderNumber,
      'assigned',
      { assignedTechnicianId: 'tech_007', estimatedDurationMinutes: 120 },
      'inst_alpha'
    );
    expect(updatedWo?.status).toBe('assigned');
    expect(updatedWo?.assignedTechnicianId).toBe('tech_007');

    const consumed = await facilityStore.consumePart(part.partNumber, 2, 'inst_alpha');
    expect(consumed).toBe(true);

    const afterConsume = await facilityStore.getPart(part.partNumber, 'inst_alpha');
    expect(afterConsume?.quantityOnHand).toBe(8);
    expect(afterConsume?.quantityReserved).toBe(0);
  });

  it('should record immutable audit logs for compliance tracking', async () => {
    const audit = await facilityStore.appendAuditLog({
      auditId: 'AUDIT-FAC-001',
      actorId: 'tech_lead_01',
      actorRole: 'admin',
      action: 'safety_override_applied',
      entityType: 'facility_equipment',
      entityId: 'CHILLER-01',
      payloadHash: 'sha256_abcdef123456',
      institutionId: 'inst_alpha',
    });

    expect(audit).toBeDefined();
    const logs = await facilityStore.listAuditLogs('inst_alpha', 'CHILLER-01');
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('safety_override_applied');
  });
});
