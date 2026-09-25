import { VisionSafetyEvent, CorrelatedEmergencyDispatchResult } from './synergy-types';
import { facilityStore } from '../../../db/facility-store';

export class VisionSafetyCorrelator {
  /**
   * Correlates VISION-SHIELD computer vision alerts with physical facility equipment and dispatches emergency actions.
   */
  public static async correlateAndDispatch(
    event: VisionSafetyEvent,
    institutionId: string = 'global'
  ): Promise<CorrelatedEmergencyDispatchResult> {
    const equipmentList = await facilityStore.listEquipment(institutionId);

    // Find closest equipment in same building & floor
    let targetEquip = equipmentList.find(
      (e) => e.buildingId === event.buildingId && e.floorId === event.floorId && (event.eventType.includes('elevator') ? e.category === 'elevator' : true)
    );

    if (!targetEquip) {
      targetEquip = equipmentList.find((e) => e.buildingId === event.buildingId) || equipmentList[0];
    }

    const woNumber = `WO-EMERG-${Date.now().toString().slice(-6)}`;
    const isEntrapment = event.eventType === 'elevator_entrapment';
    const isSmoke = event.eventType === 'smoke_detected';

    const wo = await facilityStore.createWorkOrder({
      workOrderNumber: woNumber,
      title: `[EMERGENCY] VISION-SHIELD Safety Trigger: ${event.eventType.toUpperCase()}`,
      description: `Computer vision detected ${event.eventType} on camera ${event.cameraId} (Confidence: ${(event.confidenceScore * 100).toFixed(1)}%). Immediate emergency response required.`,
      priority: 'emergency',
      category: isEntrapment ? 'elevator' : isSmoke ? 'mechanical' : 'general',
      status: 'assigned',
      equipmentId: targetEquip?.id,
      buildingId: event.buildingId,
      floorId: event.floorId,
      roomId: event.roomId,
      assignedTechnicianId: 'tech_emergency_rapid_response',
      estimatedDurationMinutes: 45,
      institutionId,
    });

    if (targetEquip) {
      await facilityStore.updateEquipmentStatus(targetEquip.id, 'offline', 0.0, institutionId);
    }

    // Append audit log
    await facilityStore.appendAuditLog({
      auditId: `AUDIT_${Date.now()}_VISION_CORR`,
      actorId: 'vision_shield_ai_agent',
      actorRole: 'system',
      action: 'safety_override_applied',
      entityType: 'facility_equipment',
      entityId: targetEquip ? targetEquip.id : event.buildingId,
      payloadHash: `sha256_vision_${event.visionAlertId}`,
      institutionId,
    });

    return {
      visionAlertId: event.visionAlertId,
      emergencyWorkOrderId: wo.id,
      priority: 'emergency',
      bmsLockoutApplied: isEntrapment || isSmoke,
      evacuationTriggered: isSmoke,
      dispatchedTechnicians: ['tech_emergency_rapid_response'],
      summary: `Emergency dispatched for ${event.eventType} in ${event.buildingId} (${event.floorId}). Work order ${woNumber} generated with high-priority technician allocation.`,
    };
  }
}
