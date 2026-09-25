import { GET as getAlerts, PATCH as patchAlerts } from '../../../app/api/facility/alerts/route';
import { GET as getWorkOrders, POST as postWorkOrders, PATCH as patchWorkOrders } from '../../../app/api/facility/workorders/route';
import { POST as postDispatch } from '../../../app/api/facility/dispatch/route';
import { facilityStore } from '../../db/facility-store';

describe('Facility Work Order & Dispatch API Routes (Sprint-052 FACILITY-016)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  const mockAdminUser = {
    staffId: 'admin_01',
    role: 'admin',
    institutionId: 'inst_alpha',
  };

  it('should triage anomaly alerts and auto-create work orders via API', async () => {
    const equip = await facilityStore.createEquipment({
      assetTag: 'CHILLER-01',
      name: 'Central Chiller',
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      institutionId: 'inst_alpha',
    });

    const alert = await facilityStore.createAnomalyAlert({
      alertId: 'ALT-TEST-100',
      equipmentId: equip.id,
      alertType: 'bearing_spalling_bpfi',
      severity: 'critical',
      anomalyScore: 0.96,
      institutionId: 'inst_alpha',
    });

    // 1. Triage alert
    const triageReq = new Request('http://localhost:3000/api/facility/alerts', {
      method: 'PATCH',
      body: JSON.stringify({
        alertId: alert.alertId,
        status: 'triaged',
        notes: 'Dispatched emergency tech',
        institutionId: 'inst_alpha',
      }),
    });

    const triageRes = await patchAlerts(triageReq, { params: Promise.resolve({}) } as any);
    expect(triageRes.status).toBe(200);

    // 2. Auto-create work order from alert
    const woReq = new Request('http://localhost:3000/api/facility/workorders', {
      method: 'POST',
      body: JSON.stringify({
        anomalyAlertId: alert.alertId,
        institutionId: 'inst_alpha',
      }),
    });

    const woRes = await postWorkOrders(woReq, { params: Promise.resolve({}) } as any);
    expect(woRes.status).toBe(201);
    const woJson = await woRes.json();
    expect(woJson.workOrder.priority).toBe('emergency');
  });

  it('should rank technicians and compute 3D spatial route via dispatch API', async () => {
    const wo = await facilityStore.createWorkOrder({
      workOrderNumber: 'WO-DISPATCH-TEST-01',
      title: 'Chiller Repair',
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      institutionId: 'inst_alpha',
    });

    const dispatchReq = new Request('http://localhost:3000/api/facility/dispatch', {
      method: 'POST',
      body: JSON.stringify({
        workOrderNumber: wo.workOrderNumber,
        requiredSkill: 'hvac',
        institutionId: 'inst_alpha',
      }),
    });

    const dispatchRes = await postDispatch(dispatchReq, { params: Promise.resolve({}) } as any);
    expect(dispatchRes.status).toBe(200);
    const dispatchJson = await dispatchRes.json();
    expect(dispatchJson.rankedCandidates.length).toBeGreaterThan(0);
    expect(dispatchJson.spatialRoutePlan.waypoints.length).toBeGreaterThan(0);
  });
});
