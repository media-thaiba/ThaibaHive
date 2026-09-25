import { CameraFrustum } from '../vision-types';

export interface CoverageMapResult {
  facilityId: string;
  totalAreaSqMeters: number;
  coveredAreaSqMeters: number;
  coveragePercentage: number;
  blindSpotsCount: number;
}

export class BlindSpotAnalyzer {
  public static analyzeCoverage(
    facilityId: string,
    frustums: CameraFrustum[],
    facilityWidthMeters: number = 100,
    facilityHeightMeters: number = 80
  ): CoverageMapResult {
    const totalArea = facilityWidthMeters * facilityHeightMeters;

    // Approximate coverage area sum with overlap reduction factor
    let rawCovered = 0;
    for (const f of frustums) {
      const cameraCoverage = Math.PI * Math.pow(f.farPlane * 0.7, 2) * (f.horizontalFov / 360.0);
      rawCovered += cameraCoverage;
    }

    const effectiveCovered = Math.min(totalArea, rawCovered * 0.75); // 25% overlap discount
    const coveragePercentage = Number(((effectiveCovered / totalArea) * 100).toFixed(1));
    const blindSpotsCount = Math.max(0, Math.round((100 - coveragePercentage) / 15));

    return {
      facilityId,
      totalAreaSqMeters: totalArea,
      coveredAreaSqMeters: Number(effectiveCovered.toFixed(1)),
      coveragePercentage,
      blindSpotsCount,
    };
  }
}
