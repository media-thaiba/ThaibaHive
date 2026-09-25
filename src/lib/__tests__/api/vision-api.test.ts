import { GET as getCameras, POST as postCameras } from '../../../app/api/vision/cameras/route';
import { GET as getZones, POST as postZones } from '../../../app/api/vision/detection-zones/route';
import { GET as getAlerts, POST as postAlerts } from '../../../app/api/vision/alerts/route';
import { GET as getIncidents, PATCH as patchIncidents } from '../../../app/api/vision/incidents/route';
import { GET as getGuards, POST as postGuards } from '../../../app/api/vision/guards/route';
import { GET as getAlpr, POST as postAlpr } from '../../../app/api/vision/alpr/route';
import { GET as getLockdown, POST as postLockdown } from '../../../app/api/vision/lockdown/route';
import { GET as getPrivacy, POST as postPrivacy } from '../../../app/api/vision/privacy/route';
import { VisionDbStore } from '../../db/vision-store';

describe('VISION-SHIELD REST API Endpoints Unit Tests', () => {
  beforeEach(() => {
    VisionDbStore.getInstance().clearMemoryStore();
  });

  it('should manage cameras via /api/vision/cameras', async () => {
    const postReq = new Request('http://localhost/api/vision/cameras', {
      method: 'POST',
      body: JSON.stringify({
        cameraId: 'cam_gate_01',
        name: 'Main Gate Cam 1',
        facilityId: 'fac_main',
        streamUrl: 'rtsp://10.0.0.1:554/live',
        zoneType: 'entrance',
        institutionId: 'inst_alpha',
      }),
    });

    const postRes = await postCameras(postReq as any);
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.camera.name).toBe('Main Gate Cam 1');

    const getReq = new Request('http://localhost/api/vision/cameras?tenantId=inst_alpha');
    const getRes = await getCameras(getReq as any);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.cameras).toHaveLength(1);
  });

  it('should manage detection zones via /api/vision/detection-zones', async () => {
    const postReq = new Request('http://localhost/api/vision/detection-zones', {
      method: 'POST',
      body: JSON.stringify({
        zoneId: 'zone_north_tripwire',
        cameraId: 'cam_gate_01',
        name: 'North Fence Line',
        zoneType: 'perimeter_tripwire',
        institutionId: 'inst_alpha',
      }),
    });

    const postRes = await postZones(postReq as any);
    expect(postRes.status).toBe(201);

    const getReq = new Request('http://localhost/api/vision/detection-zones?tenantId=inst_alpha');
    const getRes = await getZones(getReq as any);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.zones).toHaveLength(1);
  });

  it('should process threat alerts via /api/vision/alerts', async () => {
    const postReq = new Request('http://localhost/api/vision/alerts', {
      method: 'POST',
      body: JSON.stringify({
        cameraId: 'cam_gate_01',
        threatType: 'perimeter_intrusion',
        severity: 'critical',
        confidenceScore: 0.95,
        facilityId: 'fac_main',
        institutionId: 'inst_alpha',
      }),
    });

    const postRes = await postAlerts(postReq as any);
    expect(postRes.status).toBe(201);
    const data = await postRes.json();
    expect(data.alert).toBeDefined();

    const getReq = new Request('http://localhost/api/vision/alerts?tenantId=inst_alpha');
    const getRes = await getAlerts(getReq as any);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.alerts).toHaveLength(1);
  });

  it('should manage guard dispatches and profile registration via /api/vision/guards', async () => {
    const guardReq = new Request('http://localhost/api/vision/guards', {
      method: 'POST',
      body: JSON.stringify({
        guardId: 'grd_01',
        staffId: 'staff_101',
        badgeNumber: 'SEC-991',
        callSign: 'Bravo-1',
        status: 'on_duty',
        currentLocationX: 10,
        currentLocationY: 10,
        currentLocationZ: 0,
        institutionId: 'inst_alpha',
      }),
    });

    const guardRes = await postGuards(guardReq as any);
    expect(guardRes.status).toBe(201);

    const dispatchReq = new Request('http://localhost/api/vision/guards', {
      method: 'POST',
      body: JSON.stringify({
        action: 'dispatch_nearest',
        incidentId: 'inc_99',
        targetLocation: { x: 12, y: 15, z: 0 },
        facilityId: 'fac_main',
      }),
    });

    const dispatchRes = await postGuards(dispatchReq as any);
    expect(dispatchRes.status).toBe(200);
    const dispatchData = await dispatchRes.json();
    expect(dispatchData.dispatch.guardId).toBe('grd_01');
  });

  it('should process ALPR vehicle access decisions via /api/vision/alpr', async () => {
    // Whitelist vehicle
    const whitelistReq = new Request('http://localhost/api/vision/alpr', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register_whitelist',
        permitId: 'prm_01',
        plateNumber: 'ABC-1234',
        ownerName: 'Prof. Miller',
        ownerType: 'staff',
        validFrom: '2026-01-01',
        institutionId: 'inst_alpha',
      }),
    });

    const whitelistRes = await postAlpr(whitelistReq as any);
    expect(whitelistRes.status).toBe(201);

    // Camera ALPR scan
    const scanReq = new Request('http://localhost/api/vision/alpr', {
      method: 'POST',
      body: JSON.stringify({
        cameraId: 'cam_gate_01',
        plateNumber: 'ABC-1234',
        direction: 'entry',
        gateId: 'main_gate',
        facilityId: 'fac_main',
        institutionId: 'inst_alpha',
      }),
    });

    const scanRes = await postAlpr(scanReq as any);
    expect(scanRes.status).toBe(200);
    const scanData = await scanRes.json();
    expect(scanData.decision.isAuthorized).toBe(true);
    expect(scanData.decision.gateActuated).toBe(true);
  });

  it('should trigger emergency lockdown via /api/vision/lockdown', async () => {
    const lockReq = new Request('http://localhost/api/vision/lockdown', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'facility',
        targetFacilityId: 'fac_science',
        reason: 'Emergency intruder drill',
        triggerEcoMeshIslanding: true,
        institutionId: 'inst_alpha',
      }),
    });

    const lockRes = await postLockdown(lockReq as any);
    expect(lockRes.status).toBe(201);
    const lockData = await lockRes.json();
    expect(lockData.lockdownId).toBeDefined();

    const getReq = new Request('http://localhost/api/vision/lockdown?tenantId=inst_alpha');
    const getRes = await getLockdown(getReq as any);
    expect(getRes.status).toBe(200);
  });

  it('should manage privacy consent and audit logs via /api/vision/privacy', async () => {
    const purgeReq = new Request('http://localhost/api/vision/privacy', {
      method: 'POST',
      body: JSON.stringify({
        action: 'rolling_purge',
        daysToKeep: 7,
        institutionId: 'inst_alpha',
      }),
    });

    const purgeRes = await postPrivacy(purgeReq as any);
    expect(purgeRes.status).toBe(200);
    const purgeData = await purgeRes.json();
    expect(purgeData.purgedMetadataCount).toBeGreaterThan(0);

    const getReq = new Request('http://localhost/api/vision/privacy?tenantId=inst_alpha');
    const getRes = await getPrivacy(getReq as any);
    expect(getRes.status).toBe(200);
  });
});
