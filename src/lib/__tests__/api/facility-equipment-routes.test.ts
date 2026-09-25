import { GET as getEquipment, POST as postEquipment } from '../../../app/api/facility/equipment/route';
import { GET as getSensors, POST as postSensors } from '../../../app/api/facility/sensors/route';
import { POST as postTelemetry } from '../../../app/api/facility/telemetry/route';
import { facilityStore } from '../../db/facility-store';

describe('Facility Equipment & Telemetry Ingestion API Routes (Sprint-052 FACILITY-015)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  const mockAdminUser = {
    staffId: 'admin_01',
    role: 'admin',
    institutionId: 'inst_alpha',
  };

  it('should create and list equipment through API route', async () => {
    const postReq = new Request('http://localhost:3000/api/facility/equipment', {
      method: 'POST',
      body: JSON.stringify({
        assetTag: 'AHU-NORTH-01',
        name: 'North Tower AHU 2000 CFM',
        category: 'hvac',
        buildingId: 'bldg_north',
        floorId: 'floor_4',
        institutionId: 'inst_alpha',
      }),
    });

    const postRes = await postEquipment(postReq, { params: Promise.resolve({}) } as any);
    expect(postRes.status).toBe(201);
    const postJson = await postRes.json();
    expect(postJson.equipment.assetTag).toBe('AHU-NORTH-01');

    const getReq = new Request('http://localhost:3000/api/facility/equipment?tenantId=inst_alpha');
    const getRes = await getEquipment(getReq, { params: Promise.resolve({}) } as any);
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.equipment.length).toBe(1);
  });

  it('should register sensor and ingest telemetry batch through API route', async () => {
    const equip = await facilityStore.createEquipment({
      assetTag: 'PUMP-MAIN-01',
      name: 'Main Condenser Pump',
      buildingId: 'bldg_main',
      floorId: 'floor_basement',
      institutionId: 'inst_alpha',
    });

    const sensorReq = new Request('http://localhost:3000/api/facility/sensors', {
      method: 'POST',
      body: JSON.stringify({
        sensorId: 'SENSOR-PUMP-FLOW-01',
        equipmentId: equip.id,
        sensorType: 'flow_rate',
        protocol: 'rest',
        unit: 'l_s',
        institutionId: 'inst_alpha',
      }),
    });

    const sensorRes = await postSensors(sensorReq, { params: Promise.resolve({}) } as any);
    expect(sensorRes.status).toBe(201);

    const telemetryReq = new Request('http://localhost:3000/api/facility/telemetry', {
      method: 'POST',
      body: JSON.stringify({
        packets: [
          {
            protocol: 'rest',
            sensorId: 'SENSOR-PUMP-FLOW-01',
            payload: { value: 35.5, unit: 'l_s' },
          },
        ],
        institutionId: 'inst_alpha',
      }),
    });

    const telemetryRes = await postTelemetry(telemetryReq, { params: Promise.resolve({}) } as any);
    expect(telemetryRes.status).toBe(200);
    const telemetryJson = await telemetryRes.json();
    expect(telemetryJson.processed).toBe(1);
  });
});
