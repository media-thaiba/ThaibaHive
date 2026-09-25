/**
 * Solar Photovoltaic Physics Model
 * Computes Plane of Array (POA) irradiance, cell temperature, and AC power output
 */

export interface SolarArraySpec {
  peakCapacityKw: number;
  tiltAngleDeg: number;
  azimuthAngleDeg: number; // 180 = South
  temperatureCoefficientPerC?: number; // default -0.0038
  noctDegC?: number; // Nominal Operating Cell Temp, default 45°C
  inverterEfficiency?: number; // default 0.975
  systemLossFactor?: number; // soiling, wiring, mismatch, default 0.86
}

export class SolarPhysicsModel {
  /**
   * Calculate solar elevation and zenith angle for given hour of day and day of year
   */
  public static calculateSolarPosition(
    latitudeDeg: number,
    dayOfYear: number,
    hourOfDay: number // 0..24 decimal
  ): { elevationDeg: number; zenithDeg: number; azimuthDeg: number } {
    const latRad = (latitudeDeg * Math.PI) / 180;
    // Declination angle delta
    const declinationRad = 23.45 * (Math.PI / 180) * Math.sin(((284 + dayOfYear) / 365) * 2 * Math.PI);
    // Hour angle H (15 degrees per hour from solar noon at 12:00)
    const hourAngleRad = (hourOfDay - 12.0) * 15 * (Math.PI / 180);

    // Sin(elevation)
    const sinElevation =
      Math.sin(latRad) * Math.sin(declinationRad) +
      Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);

    const elevationRad = Math.asin(Math.max(-1, Math.min(1, sinElevation)));
    const elevationDeg = (elevationRad * 180) / Math.PI;
    const zenithDeg = 90 - elevationDeg;

    // Azimuth calculation
    let azimuthDeg = 180;
    if (elevationDeg > 0) {
      const cosAzimuth =
        (Math.sin(declinationRad) * Math.cos(latRad) -
          Math.cos(declinationRad) * Math.sin(latRad) * Math.cos(hourAngleRad)) /
        Math.cos(elevationRad);
      const azRad = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)));
      azimuthDeg = hourOfDay <= 12 ? 180 - (azRad * 180) / Math.PI : 180 + (azRad * 180) / Math.PI;
    }

    return {
      elevationDeg: Math.max(0, elevationDeg),
      zenithDeg: Math.min(90, Math.max(0, zenithDeg)),
      azimuthDeg,
    };
  }

  /**
   * Convert Global Horizontal Irradiance (GHI) to Plane of Array (POA) irradiance
   */
  public static computePoaIrradiance(
    ghiWm2: number,
    zenithDeg: number,
    arrayTiltDeg: number
  ): number {
    if (ghiWm2 <= 0 || zenithDeg >= 90) return 0;

    const zenithRad = (zenithDeg * Math.PI) / 180;
    const tiltRad = (arrayTiltDeg * Math.PI) / 180;

    // Direct Beam + Diffuse transposition approximation
    const geometricFactor = Math.cos(zenithRad - tiltRad) / Math.max(0.1, Math.cos(zenithRad));
    const poa = ghiWm2 * Math.max(0, Math.min(1.5, geometricFactor));
    return Number(poa.toFixed(1));
  }

  /**
   * Calculate AC power generation from POA irradiance and ambient temperature
   */
  public static calculatePowerOutput(
    poaIrradianceWm2: number,
    ambientTempC: number,
    spec: SolarArraySpec
  ): { powerKw: number; cellTempC: number } {
    if (poaIrradianceWm2 <= 5) {
      return { powerKw: 0, cellTempC: ambientTempC };
    }

    const noct = spec.noctDegC ?? 45.0;
    const tempCoeff = spec.temperatureCoefficientPerC ?? -0.0038;
    const invEff = spec.inverterEfficiency ?? 0.975;
    const lossFactor = spec.systemLossFactor ?? 0.86;

    // Cell Temperature: T_cell = T_amb + (POA / 800) * (NOCT - 20)
    const cellTempC = ambientTempC + (poaIrradianceWm2 / 800.0) * (noct - 20.0);

    // DC Power: P_dc = P_peak * (POA / 1000) * [1 + gamma * (T_cell - 25)] * systemLosses
    const tempDerate = 1.0 + tempCoeff * (cellTempC - 25.0);
    const dcPowerKw = spec.peakCapacityKw * (poaIrradianceWm2 / 1000.0) * Math.max(0.5, tempDerate) * lossFactor;

    // AC Power capped at inverter capacity
    const acPowerKw = Math.min(spec.peakCapacityKw, dcPowerKw * invEff);

    return {
      powerKw: Number(Math.max(0, acPowerKw).toFixed(2)),
      cellTempC: Number(cellTempC.toFixed(1)),
    };
  }
}
