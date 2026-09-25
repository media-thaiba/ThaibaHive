import { workOrderEngine } from '../../../operations/facility/workorders/work-order-engine';
import { facilityStore } from '../../../db/facility-store';

describe('Autonomous Work Order Lifecycle State Machine (Sprint-052 FACILITY-008)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  it('should auto-create emergency work order from critical anomaly alert', async () => {
    const equip = await facilityStore.createEquipment({
      assetTag: 'AHU-WEST-01',
      name: 'West Wing AHU Motor',
      category: 'hvac',
      buildingId: 'bldg_acad',
      floorId: 'floor_3',
      institutionId: 'inst_alpha',
    });

    const alert = await facilityStore.createAnomalyAlert({
      alertId: 'ALT-CRIT-001',
      equipmentId: equip.id,
      alertType: 'bearing_spalling_bpfi',
      severity: 'critical',
      anomalyScore: 0.95,
      predictedFailureMode: 'Impending catastrophic bearing seizure',
      estimatedRulHours: 18,
      institutionId: 'inst_alpha',
    });

    const wo = await workOrderEngine.autoCreateFromAnomaly(alert.alertId, 'inst_alpha');
    expect(wo).not.toBeNull();
    expect(wo?.priority).toBe('emergency');
    expect(wo?.status).toBe('scheduled');
    expect(wo?.buildingId).toBe('bldg_acad');

    const updatedAlert = (await facilityStore.listAnomalyAlerts('inst_alpha')).find((a) => a.alertId === alert.alertId);
    expect(updatedAlert?.status).toBe('work_order_created');
  });

  it('should enforce state machine transitions with completion guards', async () => {
    const wo = await facilityStore.createWorkOrder({
      workOrderNumber: 'WO-2026-9901',
      title: 'Filter Replacement',
      status: 'scheduled',
      buildingId: 'bldg_eng',
      floorId: 'floor_1',
      institutionId: 'inst_alpha',
    });

    // 1. Assign technician
    const resAssign = await workOrderEngine.transitionState(
      {
        workOrderNumber: wo.workOrderNumber,
        fromStatus: 'scheduled',
        toStatus: 'assigned',
        actorId: 'lead_mgr',
        actorRole: 'admin',
      },
      'inst_alpha'
    );
    expect(resAssign.success).toBe(true);
    expect(resAssign.currentStatus).toBe('assigned');

    // 2. Start execution
    const resStart = await workOrderEngine.transitionState(
      {
        workOrderNumber: wo.workOrderNumber,
        fromStatus: 'assigned',
        toStatus: 'in_progress',
        actorId: 'tech_01',
        actorRole: 'staff',
      },
      'inst_alpha'
    );
    expect(resStart.success).toBe(true);

    // 3. Attempt completion without notes or signature -> Should fail guard
    const resFail = await workOrderEngine.transitionState(
      {
        workOrderNumber: wo.workOrderNumber,
        fromStatus: 'in_progress',
        toStatus: 'completed',
        actorId: 'tech_01',
        actorRole: 'staff',
      },
      'inst_alpha'
    );
    expect(resFail.success).toBe(false);
    expect(resFail.error).toContain('requires technician sign-off signature or completion notes');

    // 4. Complete with valid signature & notes
    const resComplete = await workOrderEngine.transitionState(
      {
        workOrderNumber: wo.workOrderNumber,
        fromStatus: 'in_progress',
        toStatus: 'completed',
        actorId: 'tech_01',
        actorRole: 'staff',
        technicianSignature: 'data:image/svg+xml;tech_sig_hash',
        notes: 'HEPA filters replaced and differential pressure verified at 45 Pa',
      },
      'inst_alpha'
    );
    expect(resComplete.success).toBe(true);
    expect(resComplete.currentStatus).toBe('completed');
  });
});
