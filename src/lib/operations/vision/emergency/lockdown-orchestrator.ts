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

    // Prevent concurrent duplicate active lockdowns for the same scope/facility
    const activeLockdowns = await this.dbStore.listLockdownEvents(tenantId, 'active');
    const duplicate = activeLockdowns.find((l) => {
      if (params.scope === 'campus_wide' && l.scope === 'campus_wide') return true;
      if (params.scope === 'facility' && l.targetFacilityId === params.targetFacilityId) return true;
      if (params.scope === 'zone' && l.targetZoneId === params.targetZoneId) return true;
      return false;
    });

    if (duplicate) {
      const conflictError: any = new Error(`An active lockdown already exists for ${params.scope} (lockdownId: ${duplicate.lockdownId})`);
      conflictError.statusCode = 409;
      throw conflictError;
    }

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

  public async liftLockdown(
    lockdownId: string,
    tenantId: string = 'global',
    liftedByUserId: string = 'system',
    reason?: string
  ): Promise<any> {
    const existing = await this.dbStore.getLockdownEventById(lockdownId, tenantId);
    if (!existing) {
      return null;
    }
    if (existing.status === 'all_clear') {
      const conflictError: any = new Error('Lockdown has already been lifted');
      conflictError.statusCode = 409;
      throw conflictError;
    }

    this.zoneMatrix.unlockAll();
    this.egressController.restoreNormalLighting();

    const timestamp = new Date().toISOString();
    const allClearMerkleAuditHash = crypto
      .createHash('sha256')
      .update(`${lockdownId}:${liftedByUserId}:${reason || 'all_clear'}:${timestamp}:${existing.merkleAuditHash || ''}`)
      .digest('hex');

    return this.dbStore.updateLockdownEvent(
      lockdownId,
      {
        status: 'all_clear',
        allClearAt: timestamp,
        allClearByUserId: liftedByUserId,
        allClearMerkleAuditHash,
      } as any,
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
