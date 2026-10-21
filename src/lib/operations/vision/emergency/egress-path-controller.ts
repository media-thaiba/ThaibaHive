export interface EgressPath {
  pathId: string;
  facilityId: string;
  isIlluminated: boolean;
  exitDoorIds: string[];
  lumensLevelPercent: number;
}

export class EgressPathController {
  private paths: Map<string, EgressPath> = new Map();

  constructor(paths?: EgressPath[]) {
    if (paths && paths.length > 0) {
      for (const p of paths) {
        this.paths.set(p.pathId, { ...p });
      }
    } else {
      this.populateDefaultPaths();
    }
  }

  public populateDefaultPaths(): void {
    this.registerPath('path_main_exit_01', 'fac_main', ['door_main_egress_01', 'door_main_egress_02']);
    this.registerPath('path_sci_exit_01', 'fac_science', ['door_sci_egress_01']);
    this.registerPath('path_admin_exit_01', 'fac_admin', ['door_admin_egress_01']);
  }

  public registerPath(pathId: string, facilityId: string, exitDoorIds: string[]): void {
    this.paths.set(pathId, {
      pathId,
      facilityId,
      isIlluminated: false,
      exitDoorIds,
      lumensLevelPercent: 30, // Normal ambient
    });
  }

  public activateEmergencyEgressLighting(facilityId?: string): { activatedPathCount: number } {
    if (facilityId && !Array.from(this.paths.values()).some((p) => p.facilityId === facilityId)) {
      this.registerPath(`path_${facilityId}_emergency_egress`, facilityId, [`door_${facilityId}_egress_01`]);
    }

    let count = 0;
    for (const p of this.paths.values()) {
      if (!facilityId || p.facilityId === facilityId) {
        p.isIlluminated = true;
        p.lumensLevelPercent = 100; // 100% maximum emergency lumens
        count++;
      }
    }
    return { activatedPathCount: count };
  }

  public restoreNormalLighting(): void {
    for (const p of this.paths.values()) {
      p.isIlluminated = false;
      p.lumensLevelPercent = 30;
    }
  }
}
