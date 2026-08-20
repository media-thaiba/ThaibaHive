import { GET as getHvac, POST as postHvac } from '@/app/api/admin/operations/energy/hvac/route';
import { GET as getFleet, POST as postFleet } from '@/app/api/admin/operations/fleet/dispatches/route';
import { POST as postBiometrics } from '@/app/api/admin/operations/biometrics/attendance/route';
import { GET as getCloud } from '@/app/api/admin/operations/cloud/cost/route';
import { GET as getCarbon } from '@/app/api/admin/operations/sustainability/carbon/route';
import { GET as getMesh, POST as postMesh } from '@/app/api/admin/operations/mesh/resources/route';
import { POST as postOverride } from '@/app/api/admin/operations/marl/override/route';

describe('AIMS-021 — Admin Smart Campus REST APIs', () => {
  it('should handle HVAC optimization requests and return calculated savings', async () => {
    const postReq = new Request('http://localhost:3000/api/admin/operations/energy/hvac', {
      method: 'POST',
      body: JSON.stringify({
        campusId: 'campus_main',
        buildingId: 'bld_science',
        zoneId: 'room_101',
        currentTempCelsius: 22.0,
      }),
    });

    const res = await postHvac(postReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.optimization.optimizedSetpointCelsius).toBeDefined();

    const getReq = new Request('http://localhost:3000/api/admin/operations/energy/hvac');
    const getRes = await getHvac(getReq);
    expect(getRes.status).toBe(200);
  });

  it('should handle fleet routing dispatch requests', async () => {
    const req = new Request('http://localhost:3000/api/admin/operations/fleet/dispatches', {
      method: 'POST',
      body: JSON.stringify({
        vehicleId: 'shuttle_1',
        campusId: 'campus_main',
        stops: [
          {
            stopId: 'stop_1',
            name: 'Main Gate',
            latitude: 12.97,
            longitude: 77.59,
            demandPickupCount: 5,
          },
        ],
      }),
    });

    const res = await postFleet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.dispatch.stops.length).toBe(1);

    const getRes = await getFleet(new Request('http://localhost:3000/api/admin/operations/fleet/dispatches'));
    expect(getRes.status).toBe(200);
  });

  it('should handle biometric attendance verification requests', async () => {
    const dummyEmbedding = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1));
    const req = new Request('http://localhost:3000/api/admin/operations/biometrics/attendance', {
      method: 'POST',
      body: JSON.stringify({
        campusId: 'campus_main',
        locationName: 'North Gate Kiosk',
        sessionId: 'morning_0800',
        queryEmbedding: dummyEmbedding,
      }),
    });

    const res = await postBiometrics(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('should return cloud cost analysis and ESG sustainability reports', async () => {
    const cloudRes = await getCloud(new Request('http://localhost:3000/api/admin/operations/cloud/cost'));
    expect(cloudRes.status).toBe(200);
    const cloudData = await cloudRes.json();
    expect(cloudData.resources.length).toBeGreaterThan(0);

    const carbonRes = await getCarbon(new Request('http://localhost:3000/api/admin/operations/sustainability/carbon'));
    expect(carbonRes.status).toBe(200);
    const carbonData = await carbonRes.json();
    expect(carbonData.esgReport.verifiedGRICompliant).toBe(true);
  });

  it('should handle cross-campus resource booking and emergency kill-switch override', async () => {
    const meshRes = await getMesh(new Request('http://localhost:3000/api/admin/operations/mesh/resources'));
    expect(meshRes.status).toBe(200);

    const overrideReq = new Request('http://localhost:3000/api/admin/operations/marl/override', {
      method: 'POST',
      body: JSON.stringify({
        action: 'EMERGENCY_KILL_SWITCH',
      }),
    });

    const overrideRes = await postOverride(overrideReq);
    expect(overrideRes.status).toBe(200);
    const overrideData = await overrideRes.json();
    expect(overrideData.action).toBe('EMERGENCY_KILL_SWITCH');
  });
});
