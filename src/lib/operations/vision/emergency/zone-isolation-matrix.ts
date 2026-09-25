import { LockdownScope } from '../vision-types';

export interface ZoneLockState {
  zoneId: string;
  facilityId: string;
  isLocked: boolean;
  isEgressAllowed: boolean; // NFPA Life safety compliance (always true for egress)
  doorsCount: number;
}

export class ZoneIsolationMatrix {
  private zones: Map<string, ZoneLockState> = new Map();

  public registerZone(zoneId: string, facilityId: string, doorsCount: number): void {
    this.zones.set(zoneId, {
      zoneId,
      facilityId,
      isLocked: false,
      isEgressAllowed: true, // Fail-safe egress
      doorsCount,
    });
  }

  public lockZones(
    scope: LockdownScope,
    targetFacilityId?: string,
    targetZoneId?: string
  ): { affectedZoneIds: string[]; totalDoorsLocked: number } {
    const affected: string[] = [];
    let totalDoors = 0;

    for (const [zId, zState] of this.zones.entries()) {
      let shouldLock = false;

      if (scope === 'campus_wide') {
        shouldLock = true;
      } else if (scope === 'facility' && zState.facilityId === targetFacilityId) {
        shouldLock = true;
      } else if (scope === 'zone' && zId === targetZoneId) {
        shouldLock = true;
      }

      if (shouldLock) {
        zState.isLocked = true;
        affected.push(zId);
        totalDoors += zState.doorsCount;
      }
    }

    return { affectedZoneIds: affected, totalDoorsLocked: totalDoors };
  }

  public unlockAll(): { unlockedZonesCount: number } {
    let count = 0;
    for (const z of this.zones.values()) {
      z.isLocked = false;
      count++;
    }
    return { unlockedZonesCount: count };
  }
}
