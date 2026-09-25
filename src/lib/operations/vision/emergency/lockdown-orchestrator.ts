import { ZoneIsolationMatrix } from './zone-isolation-matrix';
import { EgressPathController } from './egress-path-controller';
import { VisionDbStore } from '../../../db/vision-store';
import { LockdownScope } from '../vision-types';
import * as crypto from 'crypto';

export interface TriggerLockdownParams {
  scope: LockdownScope;
  targetFacilityId?: string;
  targetZoneId?: string;
  reason: string;
  triggeredByUserId: string;
  triggerEcoMeshIslanding?: boolean;
  tenantId?: string;
}

export class LockdownOrchestrator {
  private zoneMatrix: ZoneIsolationMatrix;
  private egressController: EgressPathController;
  private dbStore: VisionDbStore;

  constructor(
    zoneMatrix?: ZoneIsolationMatrix,
    egressController?: EgressPathController,
    dbStore?: VisionDbStore
  ) {
    this.zoneMatrix = zoneMatrix || new ZoneIsolationMatrix();
    this.egressController = egressController || new EgressPathController();
    this.dbStore = dbStore || VisionDbStore.getInstance();
  }

  public async triggerLockdown(params: TriggerLockdownParams): Promise<{
    lockdownId: string;
    affectedZones: string[];
    doorsLockedCount: number;
    egressPathsIlluminated: boolean;
    merkleAuditHash: string;
  }> {
    const tenantId = params.tenantId || 'global';
    const { affectedZoneIds, totalDoorsLocked } = this.zoneMatrix.lockZones(
      params.scope,
      params.targetFacilityId,
      params.targetZoneId
    );

    const { activatedPathCount } = this.egressController.activateEmergencyEgressLighting(
      params.targetFacilityId
    );

    const lockdownId = `lck_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const merkleAuditHash = crypto
      .createHash('sha256')
      .update(`${lockdownId}:${params.scope}:${params.reason}:${totalDoorsLocked}:${Date.now()}`)
      .digest('hex');

    await this.dbStore.createLockdownEvent({
      lockdownId,
      scope: params.scope,
      targetFacilityId: params.targetFacilityId,
      targetZoneId: params.targetZoneId,
      triggerReason: params.reason,
      triggeredByUserId: params.triggeredByUserId,
      status: 'active',
      doorsLockedCount: totalDoorsLocked,
      egressPathsIlluminated: activatedPathCount > 0,
      ecoMeshIslandingTriggered: !!params.triggerEcoMeshIslanding,
      triggeredAt: new Date().toISOString(),
      merkleAuditHash,
      institutionId: tenantId,
    });

    return {
      lockdownId,
      affectedZones: affectedZoneIds,
      doorsLockedCount: totalDoorsLocked,
      egressPathsIlluminated: activatedPathCount > 0,
      merkleAuditHash,
    };
  }

  public async liftLockdown(lockdownId: string, tenantId: string = 'global'): Promise<any> {
    this.zoneMatrix.unlockAll();
    this.egressController.restoreNormalLighting();

    return this.dbStore.updateLockdownEvent(
      lockdownId,
      {
        status: 'all_clear',
        allClearAt: new Date().toISOString(),
      },
      tenantId
    );
  }

  public getZoneMatrix(): ZoneIsolationMatrix {
    return this.zoneMatrix;
  }

  public getEgressController(): EgressPathController {
    return this.egressController;
  }
}
