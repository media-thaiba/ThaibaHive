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

  constructor(zones?: ZoneLockState[]) {
    if (zones && zones.length > 0) {
      for (const z of zones) {
        this.zones.set(z.zoneId, { ...z });
      }
    }
  }

  public populateDefaultZones(): void {
    this.registerZone('zone_main_entrance', 'fac_main', 8);
    this.registerZone('zone_quad_perimeter', 'fac_main', 4);
    this.registerZone('zone_science_labs', 'fac_science', 14);
    this.registerZone('zone_admin_lobby', 'fac_admin', 6);
    this.registerZone('zone_sports_complex', 'fac_sports', 10);
    this.registerZone('zone_library_hall', 'fac_library', 8);
  }

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
    if (this.zones.size === 0) {
      this.populateDefaultZones();
    }

    if (targetZoneId && !this.zones.has(targetZoneId)) {
      this.registerZone(targetZoneId, targetFacilityId || 'fac_main', 4);
    }
    if (targetFacilityId && !Array.from(this.zones.values()).some((z) => z.facilityId === targetFacilityId)) {
      this.registerZone(`zone_${targetFacilityId}_primary`, targetFacilityId, 6);
    }

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
      } else if (scope === 'floor' && (zId === targetZoneId || (targetFacilityId && zState.facilityId === targetFacilityId))) {
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
