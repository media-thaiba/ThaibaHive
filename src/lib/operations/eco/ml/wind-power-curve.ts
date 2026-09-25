/**
 * Wind Turbine Power Curve Model
 * Converts wind speed (m/s) into generated power (kW)
 */

export interface WindTurbineSpec {
  ratedCapacityKw: number;
  cutInSpeedMs?: number; // default 3.0 m/s
  ratedSpeedMs?: number; // default 12.0 m/s
  cutOutSpeedMs?: number; // default 25.0 m/s
  hubHeightMeters?: number; // default 30 m
}

export class WindPowerCurve {
  /**
   * Adjust wind speed from measurement height (e.g. 10m weather station) to turbine hub height using Hellmann wind shear law
   */
  public static adjustWindSpeedForHeight(
    measuredSpeedMs: number,
    measurementHeightM: number = 10,
    hubHeightM: number = 30,
    surfaceRoughnessAlpha: number = 0.20 // suburban / campus terrain
  ): number {
    if (measuredSpeedMs <= 0) return 0;
    const adjusted = measuredSpeedMs * Math.pow(hubHeightM / measurementHeightM, surfaceRoughnessAlpha);
    return Number(adjusted.toFixed(2));
  }

  /**
   * Calculate generated power in kW from hub-height wind speed
   */
  public static calculatePowerOutput(
    windSpeedMs: number,
    spec: WindTurbineSpec
  ): number {
    const cutIn = spec.cutInSpeedMs ?? 3.0;
    const rated = spec.ratedSpeedMs ?? 12.0;
    const cutOut = spec.cutOutSpeedMs ?? 25.0;

    if (windSpeedMs < cutIn || windSpeedMs >= cutOut) {
      return 0.0;
    }

    if (windSpeedMs >= rated && windSpeedMs < cutOut) {
      return spec.ratedCapacityKw;
    }

    // Cubic power curve between cut-in and rated speed
    const fraction = (Math.pow(windSpeedMs, 3) - Math.pow(cutIn, 3)) / (Math.pow(rated, 3) - Math.pow(cutIn, 3));
    const powerKw = spec.ratedCapacityKw * Math.max(0, Math.min(1.0, fraction));

    return Number(powerKw.toFixed(2));
  }
}
