/**
 * Building Footprint Indexer
 * Maps energy meters to facility spatial zones and computes Energy Use Intensity (EUI)
 */

export interface BuildingProfile {
  facilityId: string;
  name: string;
  grossFloorAreaM2: number;
  occupancyCapacity: number;
  primaryUse: 'academic' | 'laboratory' | 'dormitory' | 'administrative' | 'sports_complex';
  meterIds: string[];
}

export class BuildingFootprintIndexer {
  private buildings: Map<string, BuildingProfile> = new Map();

  public registerBuilding(profile: BuildingProfile): void {
    this.buildings.set(profile.facilityId, profile);
  }

  public getBuilding(facilityId: string): BuildingProfile | undefined {
    return this.buildings.get(facilityId);
  }

  public listBuildings(): BuildingProfile[] {
    return Array.from(this.buildings.values());
  }

  /**
   * Compute building Energy Use Intensity (EUI) and performance index
   */
  public calculateBuildingMetrics(
    facilityId: string,
    annualEnergyKwh: number,
    annualSolarKwh: number = 0,
    annualEmissionsKg: number = 0
  ): {
    facilityId: string;
    euiKwhPerM2: number;
    solarSelfSufficiencyPercent: number;
    carbonIntensityKgPerM2: number;
    benchmarkGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  } {
    const building = this.buildings.get(facilityId);
    const area = building ? building.grossFloorAreaM2 : 1000;

    const euiKwhPerM2 = Number((annualEnergyKwh / Math.max(1, area)).toFixed(2));
    const carbonIntensityKgPerM2 = Number((annualEmissionsKg / Math.max(1, area)).toFixed(2));
    const solarSelfSufficiencyPercent = annualEnergyKwh > 0
      ? Number(Math.min(100, (annualSolarKwh / annualEnergyKwh) * 100).toFixed(1))
      : 0;

    let benchmarkGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    if (euiKwhPerM2 <= 60) benchmarkGrade = 'A+';
    else if (euiKwhPerM2 <= 100) benchmarkGrade = 'A';
    else if (euiKwhPerM2 <= 150) benchmarkGrade = 'B';
    else if (euiKwhPerM2 <= 220) benchmarkGrade = 'C';
    else if (euiKwhPerM2 <= 300) benchmarkGrade = 'D';
    else benchmarkGrade = 'F';

    return {
      facilityId,
      euiKwhPerM2,
      solarSelfSufficiencyPercent,
      carbonIntensityKgPerM2,
      benchmarkGrade,
    };
  }
}
