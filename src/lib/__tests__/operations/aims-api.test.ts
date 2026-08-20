import { GET as getHvac, POST as postHvac } from '@/app/api/admin/operations/energy/hvac/route';
import { GET as getHvacById, DELETE as deleteHvacById } from '@/app/api/admin/operations/energy/hvac/[id]/route';
import { GET as getFleet, POST as postFleet } from '@/app/api/admin/operations/fleet/dispatches/route';
import { GET as getFleetById, DELETE as deleteFleetById } from '@/app/api/admin/operations/fleet/dispatches/[id]/route';
import { GET as getBiometrics, POST as postBiometrics } from '@/app/api/admin/operations/biometrics/attendance/route';
import { GET as getCloud } from '@/app/api/admin/operations/cloud/cost/route';
import { GET as getCarbon } from '@/app/api/admin/operations/sustainability/carbon/route';
import { GET as getMesh, POST as postMesh } from '@/app/api/admin/operations/mesh/resources/route';
import { GET as getMeshById, DELETE as deleteMeshById } from '@/app/api/admin/operations/mesh/resources/[id]/route';
import { POST as postMarlOverride } from '@/app/api/admin/operations/marl/override/route';
import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';

describe('AIMS-021 — Admin Operations REST APIs & Authentication Suite', () => {
  beforeEach(() => {
    AimsDbStore.getInstance().clear();
  });

  // HVAC Endpoints
  describe('HVAC & Energy APIs', () => {
    it('should create optimization, return 201, and support paginated GET listing', async () => {
      const postReq = new Request('http://localhost/api/admin/operations/energy/hvac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campusId: 'campus_main',
          buildingId: 'bld_science',
          zoneId: 'zone_lab1',
          currentTempCelsius: 24.5,
          targetComfortPpdRatio: 0.1,
        }),
      });

      const postRes = await postHvac(postReq);
      expect(postRes.status).toBe(201);
      const postBody = await postRes.json();
      expect(postBody.success).toBe(true);
      const optId = postBody.optimization.id;

      // Paginated GET
      const getReq = new Request('http://localhost/api/admin/operations/energy/hvac?page=1&limit=10');
      const getRes = await getHvac(getReq);
      expect(getRes.status).toBe(200);
      const getBody = await getRes.json();
      expect(getBody.optimizations.length).toBe(1);
      expect(getBody.pagination.total).toBe(1);

      // GET by ID
      const getByIdRes = await getHvacById(new Request(`http://localhost/api/admin/operations/energy/hvac/${optId}`), {
        params: Promise.resolve({ id: optId }),
      } as any);
      expect(getByIdRes.status).toBe(200);

      // DELETE by ID
      const delRes = await deleteHvacById(new Request(`http://localhost/api/admin/operations/energy/hvac/${optId}`), {
        params: Promise.resolve({ id: optId }),
      } as any);
      expect(delRes.status).toBe(200);
    });

    it('should return 400 Bad Request on invalid payload and 404 on missing record', async () => {
      const invalidPostReq = new Request('http://localhost/api/admin/operations/energy/hvac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTempCelsius: 'not_a_number' }),
      });
      const postRes = await postHvac(invalidPostReq);
      expect(postRes.status).toBe(400);

      const notFoundRes = await getHvacById(new Request('http://localhost/api/admin/operations/energy/hvac/non_existent'), {
        params: Promise.resolve({ id: 'non_existent' }),
      } as any);
      expect(notFoundRes.status).toBe(404);
    });
  });

  // Fleet Endpoints
  describe('Fleet Logistics APIs', () => {
    it('should create dispatch, list dispatches, and fetch by ID', async () => {
      const postReq = new Request('http://localhost/api/admin/operations/fleet/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: 'shuttle_1',
          campusId: 'campus_main',
          stops: [
            { stopId: 's1', name: 'Main Gate', latitude: 12.97, longitude: 77.59, demandPickupCount: 5 },
            { stopId: 's2', name: 'Hostel Block', latitude: 12.98, longitude: 77.60, demandPickupCount: 3 },
          ],
        }),
      });

      const res = await postFleet(postReq);
      expect(res.status).toBe(201);
      const data = await res.json();
      const routeId = data.dispatch.routeId;

      const getRes = await getFleet(new Request('http://localhost/api/admin/operations/fleet/dispatches'));
      expect(getRes.status).toBe(200);

      const getByIdRes = await getFleetById(new Request(`http://localhost/api/admin/operations/fleet/dispatches/${routeId}`), {
        params: Promise.resolve({ id: routeId }),
      } as any);
      expect(getByIdRes.status).toBe(200);

      const delRes = await deleteFleetById(new Request(`http://localhost/api/admin/operations/fleet/dispatches/${routeId}`), {
        params: Promise.resolve({ id: routeId }),
      } as any);
      expect(delRes.status).toBe(200);
    });
  });

  // Biometrics Endpoints
  describe('Edge Biometrics & ZKP APIs', () => {
    it('should record verified punch and list biometric logs', async () => {
      const queryEmbedding = Array.from({ length: 128 }, () => 0.1);
      const postReq = new Request('http://localhost/api/admin/operations/biometrics/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campusId: 'campus_main',
          locationName: 'North Gate Kiosk',
          sessionId: 'session_101',
          queryEmbedding,
        }),
      });

      const res = await postBiometrics(postReq);
      expect(res.status).toBe(200);

      const getRes = await getBiometrics(new Request('http://localhost/api/admin/operations/biometrics/attendance'));
      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Cloud & Sustainability Endpoints
  describe('Cloud Cost & ESG APIs', () => {
    it('should return cloud rightsizing recommendations and ESG reports', async () => {
      const cloudRes = await getCloud(new Request('http://localhost/api/admin/operations/cloud/cost'));
      expect(cloudRes.status).toBe(200);

      const carbonRes = await getCarbon(new Request('http://localhost/api/admin/operations/sustainability/carbon'));
      expect(carbonRes.status).toBe(200);
      const carbonData = await carbonRes.json();
      expect(carbonData.esgReport).toBeDefined();
    });
  });

  // Resource Mesh Endpoints
  describe('Campus Resource Mesh APIs', () => {
    it('should register shared resource booking, list mesh assets, and delete by ID', async () => {
      const now = new Date();
      const nextHour = new Date(now.getTime() + 3600000);

      const postReq = new Request('http://localhost/api/admin/operations/mesh/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'res_hpc_cluster',
          requestingCampusId: 'campus_main',
          hostCampusId: 'campus_north',
          startTimeIso: now.toISOString(),
          endTimeIso: nextHour.toISOString(),
          unitsReserved: 16,
        }),
      });

      const postRes = await postMesh(postReq);
      expect(postRes.status).toBe(200);

      const getRes = await getMesh(new Request('http://localhost/api/admin/operations/mesh/resources'));
      expect(getRes.status).toBe(200);

      // Save a mock resource into store for ID tests
      AimsDbStore.getInstance().saveResource({
        resourceId: 'res_hpc_cluster',
        campusId: 'campus_north',
        name: 'HPC Cluster',
        category: 'COMPUTE_CLUSTER',
        capacityUnits: 128,
        isShareableCrossCampus: true,
        hourlyCostRateDollars: 50,
        activeReservations: [],
        institutionId: 'inst_default',
      });

      const getByIdRes = await getMeshById(new Request('http://localhost/api/admin/operations/mesh/resources/res_hpc_cluster'), {
        params: Promise.resolve({ id: 'res_hpc_cluster' }),
      } as any);
      expect(getByIdRes.status).toBe(200);

      const delRes = await deleteMeshById(new Request('http://localhost/api/admin/operations/mesh/resources/res_hpc_cluster'), {
        params: Promise.resolve({ id: 'res_hpc_cluster' }),
      } as any);
      expect(delRes.status).toBe(200);
    });
  });

  // MARL Override Endpoint
  describe('MARL Operational Override APIs', () => {
    it('should trigger emergency kill-switch and return 200', async () => {
      const overrideReq = new Request('http://localhost/api/admin/operations/marl/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EMERGENCY_KILL_SWITCH',
          reason: 'Manual test trigger',
        }),
      });

      const res = await postMarlOverride(overrideReq);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
