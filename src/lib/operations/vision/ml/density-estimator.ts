export interface SpatialZoneArea {
  zoneId: string;
  areaSquareMeters: number;
}

export class DensityEstimator {
  public static calculateDensity(
    personCount: number,
    areaSquareMeters: number
  ): {
    densityPersonsPerSqMeter: number;
    densityLevel: 'low' | 'moderate' | 'high' | 'critical_crush';
  } {
    if (areaSquareMeters <= 0) areaSquareMeters = 1.0;
    const density = personCount / areaSquareMeters;

    let densityLevel: 'low' | 'moderate' | 'high' | 'critical_crush' = 'low';
    if (density >= 4.0) {
      densityLevel = 'critical_crush'; // Fruin level F (> 4.0 persons/m2)
    } else if (density >= 2.5) {
      densityLevel = 'high';
    } else if (density >= 1.0) {
      densityLevel = 'moderate';
    }

    return {
      densityPersonsPerSqMeter: Number(density.toFixed(2)),
      densityLevel,
    };
  }

  public static calculateTurbulenceIndex(
    velocityVectors: { vx: number; vy: number }[]
  ): number {
    if (velocityVectors.length < 2) return 0.0;

    let meanVx = 0;
    let meanVy = 0;
    for (const v of velocityVectors) {
      meanVx += v.vx;
      meanVy += v.vy;
    }
    meanVx /= velocityVectors.length;
    meanVy /= velocityVectors.length;

    let variance = 0;
    for (const v of velocityVectors) {
      const dvx = v.vx - meanVx;
      const dvy = v.vy - meanVy;
      variance += Math.sqrt(dvx * dvx + dvy * dvy);
    }
    variance /= velocityVectors.length;

    // Normalize turbulence index between 0.0 and 1.0
    return Math.min(1.0, Number((variance / 5.0).toFixed(3)));
  }
}
