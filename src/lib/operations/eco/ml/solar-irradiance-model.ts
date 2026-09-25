/**
 * Solar Irradiance Model
 * Clear-sky radiation models (Haurwitz / Ineichen) and cloud attenuation
 */

import { SolarPhysicsModel } from './solar-physics-model';

export interface IrradianceComponents {
  ghiWm2: number; // Global Horizontal Irradiance
  dniWm2: number; // Direct Normal Irradiance
  dhiWm2: number; // Diffuse Horizontal Irradiance
  zenithDeg: number;
}

export class SolarIrradianceModel {
  /**
   * Calculate Clear-Sky GHI using Haurwitz empirical clear-sky model
   */
  public static computeClearSkyGhi(zenithDeg: number): number {
    if (zenithDeg >= 88.0) return 0.0;

    const zenithRad = (zenithDeg * Math.PI) / 180;
    const cosZ = Math.cos(zenithRad);
    if (cosZ <= 0.02) return 0.0;

    // Haurwitz formula: GHI = 1098 * cos(Z) * exp(-0.057 / cos(Z))
    const ghi = 1098.0 * cosZ * Math.exp(-0.057 / cosZ);
    return Math.max(0, Number(ghi.toFixed(1)));
  }

  /**
   * Compute actual GHI, DNI, and DHI adjusted for cloud cover %
   */
  public static computeIrradiance(
    latitudeDeg: number,
    dayOfYear: number,
    hourOfDay: number,
    cloudCoverPercent: number = 0
  ): IrradianceComponents {
    const { zenithDeg } = SolarPhysicsModel.calculateSolarPosition(latitudeDeg, dayOfYear, hourOfDay);
    const clearGhi = this.computeClearSkyGhi(zenithDeg);

    if (clearGhi <= 0) {
      return { ghiWm2: 0, dniWm2: 0, dhiWm2: 0, zenithDeg };
    }

    // Kasten-Czeplak cloud attenuation: GHI = GHI_clear * (1 - 0.80 * (C / 100)^2)
    const cloudFrac = Math.max(0, Math.min(1.0, cloudCoverPercent / 100.0));
    const attenuation = 1.0 - 0.80 * Math.pow(cloudFrac, 2.0);
    const ghiWm2 = Number((clearGhi * Math.max(0.1, attenuation)).toFixed(1));

    // Erbs model for diffuse fraction: k_d = DHI / GHI
    const kt = clearGhi > 0 ? ghiWm2 / clearGhi : 0;
    let kd = 0.2;
    if (kt <= 0.22) {
      kd = 1.0 - 0.09 * kt;
    } else if (kt <= 0.80) {
      kd = 0.9511 - 0.1604 * kt + 4.388 * Math.pow(kt, 2) - 16.638 * Math.pow(kt, 3) + 12.336 * Math.pow(kt, 4);
    } else {
      kd = 0.165;
    }

    const dhiWm2 = Number((ghiWm2 * Math.max(0.1, Math.min(1.0, kd))).toFixed(1));
    const cosZ = Math.cos((zenithDeg * Math.PI) / 180);
    const dniWm2 = cosZ > 0.05 ? Number((Math.max(0, (ghiWm2 - dhiWm2) / cosZ)).toFixed(1)) : 0;

    return {
      ghiWm2,
      dniWm2,
      dhiWm2,
      zenithDeg,
    };
  }
}
