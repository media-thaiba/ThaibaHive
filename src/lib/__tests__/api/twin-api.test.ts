import { GET as getFacilities, POST as createFacility } from '@/app/api/twin/facilities/route';
import { GET as getSpaces, POST as createSpace, PATCH as updateSpace } from '@/app/api/twin/spaces/route';
import { GET as getSensors, POST as createSensor } from '@/app/api/twin/sensors/route';
import { POST as ingestTelemetry } from '@/app/api/twin/telemetry/ingest/route';
import { GET as getLiveTelemetry } from '@/app/api/twin/telemetry/live/route';
import { POST as predictOptimization } from '@/app/api/twin/optimization/predict/route';
import { POST as wayfindingRoute } from '@/app/api/twin/wayfinding/route';
import { GET as getAssets, POST as createAsset } from '@/app/api/twin/assets/route';
import { POST as emergencySimulate } from '@/app/api/twin/emergency/simulate/route';
import { TwinDbStore } from '@/lib/db/twin-store';

describe('Spatial Digital Twin REST API Suite Integration Tests (TWIN-016)', () => {
  const store = TwinDbStore.getInstance();

  beforeEach(() => {
    store.clearMemoryStore();
  });

  it('should create and list facilities via /api/twin/facilities', async () => {
    const createReq = new Request('http://localhost/api/twin/facilities', {
      method: 'POST',
      body: JSON.stringify({
        facilityId: 'FAC-TECH-01',
        name: 'Technology Center',
        code: 'TECH',
        facilityType: 'laboratory',
        totalFloors: 3,
        totalAreaSqMeters: 8500,
        institutionId: 'inst_01',
      }),
    });

    const createRes = await createFacility(createReq as any);
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    expect(createData.facility.name).toBe('Technology Center');

    const getReq = new Request('http://localhost/api/twin/facilities?tenantId=inst_01');
    const getRes = await getFacilities(getReq as any);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.facilities.length).toBe(1);
  });

  it('should manage spaces via /api/twin/spaces', async () => {
    const createReq = new Request('http://localhost/api/twin/spaces', {
      method: 'POST',
      body: JSON.stringify({
        spaceId: 'SPC-LAB-1',
        facilityId: 'FAC-TECH-01',
        floorLevel: 1,
        name: 'AI Robotics Lab',
        code: 'ROB-101',
        spaceType: 'laboratory',
        capacity: 30,
        institutionId: 'inst_01',
      }),
    });

    const createRes = await createSpace(createReq as any);
    expect(createRes.status).toBe(201);

    const patchReq = new Request('http://localhost/api/twin/spaces?spaceId=SPC-LAB-1&tenantId=inst_01', {
      method: 'PATCH',
      body: JSON.stringify({
        currentOccupancy: 15,
        comfortScore: 94.0,
      }),
    });

    const patchRes = await updateSpace(patchReq as any);
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.space.currentOccupancy).toBe(15);
  });

  it('should ingest telemetry and retrieve live data', async () => {
    const ingestReq = new Request('http://localhost/api/twin/telemetry/ingest', {
      method: 'POST',
      body: JSON.stringify({
        sensorId: 'SEN-AIR-01',
        facilityId: 'FAC-TECH-01',
        metricType: 'temperature_c',
        value: 22.4,
        unit: '°C',
        institutionId: 'inst_01',
      }),
    });

    const ingestRes = await ingestTelemetry(ingestReq as any);
    expect(ingestRes.status).toBe(200);

    const liveReq = new Request('http://localhost/api/twin/telemetry/live?tenantId=inst_01&sensorId=SEN-AIR-01');
    const liveRes = await getLiveTelemetry(liveReq as any);
    expect(liveRes.status).toBe(200);
    const liveData = await liveRes.json();
    expect(liveData.telemetry.length).toBe(1);
    expect(liveData.telemetry[0].numericValue).toBe(22.4);
  });

  it('should compute space optimization forecasts via /api/twin/optimization/predict', async () => {
    await store.createSpace({
      spaceId: 'SPC-PREDICT-1',
      facilityId: 'FAC-TECH-01',
      name: 'Lecture Hall 1',
      code: 'LH-1',
      capacity: 80,
      institutionId: 'inst_01',
    });

    const predictReq = new Request('http://localhost/api/twin/optimization/predict', {
      method: 'POST',
      body: JSON.stringify({
        facilityId: 'FAC-TECH-01',
        spaceId: 'SPC-PREDICT-1',
        forecastHours: 24,
        enableHvacOptimization: true,
        institutionId: 'inst_01',
      }),
    });

    const predictRes = await predictOptimization(predictReq as any);
    expect(predictRes.status).toBe(200);
    const data = await predictRes.json();
    expect(data.success).toBe(true);
    expect(data.forecast.length).toBe(24);
    expect(data.hvacOptimization).toBeDefined();
    expect(data.hvacOptimization.kwhSaved).toBeGreaterThan(0);
  });

  it('should execute wayfinding routing and emergency simulation', async () => {
    const wfReq = new Request('http://localhost/api/twin/wayfinding', {
      method: 'POST',
      body: JSON.stringify({
        facilityId: 'FAC-TECH-01',
        sourceNodeId: 'ROOM_START',
        targetNodeId: 'ROOM_END',
        requireStepFree: false,
        institutionId: 'inst_01',
      }),
    });

    const wfRes = await wayfindingRoute(wfReq as any);
    expect(wfRes.status).toBe(200);
    const wfData = await wfRes.json();
    expect(wfData.success).toBe(true);
    expect(wfData.route.pathNodes.length).toBeGreaterThan(0);

    const emergReq = new Request('http://localhost/api/twin/emergency/simulate', {
      method: 'POST',
      body: JSON.stringify({
        facilityId: 'FAC-TECH-01',
        hazardType: 'fire',
        blockedNodeIds: [],
        blockedEdgeIds: ['E_EAST_1'],
        headcountsPerNode: { 'RM-101': 25 },
        institutionId: 'inst_01',
      }),
    });

    const emergRes = await emergencySimulate(emergReq as any);
    expect(emergRes.status).toBe(200);
    const emergData = await emergRes.json();
    expect(emergData.success).toBe(true);
    expect(emergData.calculationTimeMs).toBeLessThan(5000);
  });
});
