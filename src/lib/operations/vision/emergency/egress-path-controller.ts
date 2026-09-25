export interface EgressPath {
  pathId: string;
  facilityId: string;
  isIlluminated: boolean;
  exitDoorIds: string[];
  lumensLevelPercent: number;
}

export class EgressPathController {
  private paths: Map<string, EgressPath> = new Map();

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
