import { ThermalComfortMetrics } from './energy-types';

export interface ComfortEnvironmentalInputs {
  airTempCelsius: number; // ta
  meanRadiantTempCelsius: number; // tr
  relativeHumidityPercent: number; // rh
  airVelocityMps: number; // var (default 0.1 m/s)
  metabolicRateMet: number; // met (default 1.1 for light sitting)
  clothingInsulationClo: number; // clo (default 0.61 summer, 1.0 winter)
}

/**
 * ISO 7730 Fanger PMV / PPD Thermal Comfort Calculation Model
 */
export class ThermalComfortModel {
  /**
   * Calculates PMV (Predicted Mean Vote) and PPD (Predicted Percentage of Dissatisfied)
   * according to ISO 7730 Fanger equations.
   */
  public calculateComfort(zoneId: string, inputs: ComfortEnvironmentalInputs): ThermalComfortMetrics {
    const {
      airTempCelsius: ta,
      meanRadiantTempCelsius: tr,
      relativeHumidityPercent: rh,
      airVelocityMps: vel = 0.1,
      metabolicRateMet: met = 1.1,
      clothingInsulationClo: clo = 0.65,
    } = inputs;

    const M = met * 58.15; // W/m2 metabolic rate
    const W = 0; // External work
    const Icl = 0.155 * clo; // Thermal insulation of clothing m2*K/W

    const fcl = clo <= 0.078 ? 1.0 + 1.29 * Icl : 1.05 + 0.645 * Icl;

    // Water vapor pressure (Pa)
    const pa = rh * 10 * Math.exp(16.6536 - 4030.183 / (ta + 235));

    // Iterative surface temperature calculation
    let tcl = ta + (35.5 - ta) / (3.5 * (6.45 * Icl + 0.1));
    for (let iter = 0; iter < 50; iter++) {
      const hc_natural = 2.38 * Math.pow(Math.abs(tcl - ta), 0.25);
      const hc_forced = 12.1 * Math.sqrt(Math.max(vel, 0.01));
      const hc = Math.max(hc_natural, hc_forced);

      const rad = 3.96 * Math.pow(10, -8) * fcl * (Math.pow(tcl + 273, 4) - Math.pow(tr + 273, 4));
      const conv = fcl * hc * (tcl - ta);

      const tcl_next = 35.7 - 0.028 * (M - W) - Icl * (rad + conv);
      if (Math.abs(tcl_next - tcl) < 0.001) {
        tcl = tcl_next;
        break;
      }
      tcl = 0.8 * tcl + 0.2 * tcl_next;
    }

    const hc_final = Math.max(2.38 * Math.pow(Math.abs(tcl - ta), 0.25), 12.1 * Math.sqrt(Math.max(vel, 0.01)));

    // Heat loss components (L)
    const hl_skin_diff = 3.05 * 0.001 * (5733 - 6.99 * (M - W) - pa);
    const hl_sweat = Math.max(0, 0.42 * (M - W - 58.15));
    const hl_latent_resp = 1.7 * 0.00001 * M * (5867 - pa);
    const hl_dry_resp = 0.0014 * M * (34 - ta);
    const hl_rad = 3.96 * Math.pow(10, -8) * fcl * (Math.pow(tcl + 273, 4) - Math.pow(tr + 273, 4));
    const hl_conv = fcl * hc_final * (tcl - ta);

    const L = (M - W) - (hl_skin_diff + hl_sweat + hl_latent_resp + hl_dry_resp + hl_rad + hl_conv);
    const ts = 0.303 * Math.exp(-0.036 * M) + 0.028;

    const rawPmv = ts * L;
    const pmv = Math.max(-3.0, Math.min(3.0, rawPmv));

    // PPD = 100 - 95 * exp(- (0.03353 * PMV^4 + 0.2179 * PMV^2))
    const ppd = 100 - 95 * Math.exp(-(0.03353 * Math.pow(pmv, 4) + 0.2179 * Math.pow(pmv, 2)));

    let classification: ThermalComfortMetrics['comfortClassification'] = 'DISCOMFORT';
    if (Math.abs(pmv) <= 0.2 && ppd <= 6) {
      classification = 'A_EXCELLENT';
    } else if (Math.abs(pmv) <= 0.5 && ppd <= 10) {
      classification = 'B_GOOD';
    } else if (Math.abs(pmv) <= 0.7 && ppd <= 15) {
      classification = 'C_ACCEPTABLE';
    }

    return {
      zoneId,
      pmv: Number(pmv.toFixed(2)),
      ppd: Number(ppd.toFixed(1)),
      comfortClassification: classification,
      freshAirCfm: 450,
      airQualityStatus: 'OPTIMAL',
      timestamp: new Date().toISOString(),
    };
  }
}
