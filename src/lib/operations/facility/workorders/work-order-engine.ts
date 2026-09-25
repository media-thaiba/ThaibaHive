import { WorkOrderStateMachine } from './work-order-state-machine';
import { WorkOrderTransitionRequest, WorkOrderStateTransitionResult } from './work-order-types';
import { FacilityWorkOrderItem, WorkOrderPriority, WorkOrderCategory } from '../facility-types';
import { facilityStore } from '../../../db/facility-store';

export class WorkOrderEngine {
  private static instance: WorkOrderEngine;

  public static getInstance(): WorkOrderEngine {
    if (!WorkOrderEngine.instance) {
      WorkOrderEngine.instance = new WorkOrderEngine();
    }
    return WorkOrderEngine.instance;
  }

  public async autoCreateFromAnomaly(
    alertId: string,
    institutionId: string = 'global'
  ): Promise<FacilityWorkOrderItem | null> {
    const alerts = await facilityStore.listAnomalyAlerts(institutionId);
    const alert = alerts.find((a) => a.alertId === alertId);
    if (!alert) return null;

    const equip = await facilityStore.getEquipmentById(alert.equipmentId, institutionId);
    if (!equip) return null;

    const priority: WorkOrderPriority =
      alert.severity === 'critical' ? 'emergency' : alert.severity === 'high' ? 'urgent' : 'routine';

    const category: WorkOrderCategory =
      equip.category === 'hvac' ? 'hvac' :
      equip.category === 'elevator' ? 'elevator' :
      equip.category === 'plumbing' ? 'plumbing' :
      equip.category === 'electrical' ? 'electrical' : 'general';

    const woNumber = `WO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const workOrder = await facilityStore.createWorkOrder({
      workOrderNumber: woNumber,
      title: `[${priority.toUpperCase()}] Auto-Generated: ${alert.predictedFailureMode || equip.name}`,
      description: `Predictive maintenance triggered by ${alert.alertType} (Score: ${alert.anomalyScore}). Estimated RUL: ${alert.estimatedRulHours || 'N/A'} hours. ${alert.rootCauseHypothesis || ''}`,
      priority,
      category,
      status: 'scheduled',
      equipmentId: equip.id,
      anomalyAlertId: alert.id,
      buildingId: equip.buildingId,
      floorId: equip.floorId,
      roomId: equip.roomId,
      estimatedDurationMinutes: priority === 'emergency' ? 90 : 120,
      institutionId,
    });

    // Update alert status
    await facilityStore.updateAlertStatus(alert.alertId, 'work_order_created', `Linked to work order ${woNumber}`, undefined, institutionId);

    // Append audit log
    await facilityStore.appendAuditLog({
      auditId: `AUDIT_${Date.now()}_${woNumber}`,
      actorId: 'system_auto_dispatcher',
      actorRole: 'system',
      action: 'work_order_created',
      entityType: 'facility_work_orders',
      entityId: workOrder.id,
      payloadHash: `sha256_${woNumber}`,
      institutionId,
    });

    return workOrder;
  }

  public async transitionState(
    req: WorkOrderTransitionRequest,
    institutionId: string = 'global'
  ): Promise<WorkOrderStateTransitionResult> {
    const wo = await facilityStore.getWorkOrder(req.workOrderNumber, institutionId);
    if (!wo) {
      return {
        success: false,
        workOrderNumber: req.workOrderNumber,
        previousStatus: req.fromStatus,
        currentStatus: req.fromStatus,
        transitionTimestamp: new Date().toISOString(),
        error: `Work order '${req.workOrderNumber}' not found`,
      };
    }

    const validation = WorkOrderStateMachine.validateTransition(req);
    if (!validation.valid) {
      return {
        success: false,
        workOrderNumber: req.workOrderNumber,
        previousStatus: wo.status,
        currentStatus: wo.status,
        transitionTimestamp: new Date().toISOString(),
        error: validation.error,
      };
    }

    const updates: Partial<FacilityWorkOrderItem> = {
      resolutionSummary: req.notes || wo.resolutionSummary,
      technicianSignature: req.technicianSignature || wo.technicianSignature,
      actualDurationMinutes: req.actualDurationMinutes || wo.actualDurationMinutes,
      merkleAuditHash: req.merkleAuditHash || wo.merkleAuditHash,
    };

    if (req.toStatus === 'in_progress' && !wo.startedAt) {
      updates.startedAt = new Date().toISOString();
    } else if (req.toStatus === 'completed') {
      updates.completedAt = new Date().toISOString();
    } else if (req.toStatus === 'verified') {
      updates.verifiedAt = new Date().toISOString();
      updates.verifiedByStaffId = req.actorId;
    }

    // Process consumed parts if completing
    if (req.consumedParts && req.consumedParts.length > 0) {
      for (const partReq of req.consumedParts) {
        await facilityStore.consumePart(partReq.partNumber, partReq.quantity, institutionId);
      }
    }

    const updated = await facilityStore.updateWorkOrderStatus(wo.workOrderNumber, req.toStatus, updates, institutionId);

    // Audit log
    await facilityStore.appendAuditLog({
      auditId: `AUDIT_${Date.now()}_TRANS`,
      actorId: req.actorId,
      actorRole: req.actorRole,
      action: `work_order_${req.toStatus}`,
      entityType: 'facility_work_orders',
      entityId: wo.id,
      payloadHash: `sha256_${wo.workOrderNumber}_${req.toStatus}`,
      institutionId,
    });

    return {
      success: true,
      workOrderNumber: req.workOrderNumber,
      previousStatus: wo.status,
      currentStatus: req.toStatus,
      transitionTimestamp: updated?.updatedAt || new Date().toISOString(),
    };
  }
}

export const workOrderEngine = WorkOrderEngine.getInstance();
