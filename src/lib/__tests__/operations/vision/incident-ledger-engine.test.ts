import { IncidentLedgerEngine } from '../../../operations/vision/incidents/incident-ledger-engine';
import { VisionDbStore } from '../../../db/vision-store';

describe('IncidentLedgerEngine Security Lifecycle & Alert Processing', () => {
  let engine: IncidentLedgerEngine;
  let store: VisionDbStore;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    engine = new IncidentLedgerEngine(store);
  });

  it('should process a threat alert and compute severity correctly', async () => {
    const result = await engine.processThreatAlert({
      cameraId: 'cam_01',
      zoneId: 'zone_perimeter_north',
      threatType: 'perimeter_intrusion',
      confidenceScore: 0.95,
      facilityId: 'fac_science_block',
      isAfterHours: true,
      isHighSecurityZone: true,
      institutionId: 'tenant_alpha',
    });

    expect(result.isDeduplicated).toBe(false);
    expect(result.alert).toBeDefined();
    expect(result.alert.severity).toBe('critical');
    // Critical alert auto-creates security incident
    expect(result.autoCreatedIncident).toBeDefined();
    expect(result.autoCreatedIncident.status).toBe('open');

    const cap = JSON.parse(result.autoCreatedIncident.capJson);
    expect(cap.info.severity).toBe('Extreme');
    expect(cap.info.urgency).toBe('Immediate');
  });

  it('should deduplicate rapid consecutive alerts for the same camera and zone', async () => {
    const res1 = await engine.processThreatAlert({
      cameraId: 'cam_02',
      zoneId: 'zone_lobby',
      threatType: 'loitering',
      confidenceScore: 0.70,
      facilityId: 'fac_admin',
      institutionId: 'tenant_alpha',
    });

    expect(res1.isDeduplicated).toBe(false);

    // Immediate second alert
    const res2 = await engine.processThreatAlert({
      cameraId: 'cam_02',
      zoneId: 'zone_lobby',
      threatType: 'loitering',
      confidenceScore: 0.75,
      facilityId: 'fac_admin',
      institutionId: 'tenant_alpha',
    });

    expect(res2.isDeduplicated).toBe(true);
    expect(res2.alert.alertId).toBe(res1.alert.alertId);
  });

  it('should manage incident status lifecycle transitions', async () => {
    const result = await engine.processThreatAlert({
      cameraId: 'cam_03',
      zoneId: 'zone_gate',
      threatType: 'blacklisted_vehicle',
      confidenceScore: 0.98,
      facilityId: 'fac_main_gate',
      institutionId: 'tenant_alpha',
    });

    const incidentId = result.autoCreatedIncident.incidentId;

    const dispatched = await engine.transitionIncidentStatus(incidentId, 'dispatched', 'grd_alpha_1', 'tenant_alpha');
    expect(dispatched.status).toBe('dispatched');
    expect(dispatched.leadGuardId).toBe('grd_alpha_1');

    const contained = await engine.transitionIncidentStatus(incidentId, 'contained', undefined, 'tenant_alpha');
    expect(contained.status).toBe('contained');
    expect(contained.containedAt).toBeDefined();

    const resolved = await engine.transitionIncidentStatus(incidentId, 'resolved', undefined, 'tenant_alpha');
    expect(resolved.status).toBe('resolved');
    expect(resolved.closedAt).toBeDefined();
  });
});
