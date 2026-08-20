/**
 * ASHRAE 62.1 Indoor Air Quality (IAQ) & Ventilation Constraint Model
 */
export class AirQualityModel {
  /**
   * Calculates required outdoor ventilation airflow (CFM) according to ASHRAE 62.1
   * Vbz = (Rp * Pz) + (Ra * Az)
   * where:
   *   Rp = outdoor airflow rate required per person (default 5 CFM/person)
   *   Pz = zone population headcount
   *   Ra = outdoor airflow rate required per unit area (default 0.06 CFM/sqft)
   *   Az = zone floor area in sq ft
   */
  public calculateRequiredVentilation(zonePopulation: number, floorAreaSqFt = 1000): {
    requiredCfm: number;
    recommendedDamperPositionPercent: number;
    co2Status: 'OPTIMAL' | 'MODERATE' | 'POOR_VENTILATE_NOW';
  } {
    const Rp = 5.0; // CFM per person
    const Ra = 0.06; // CFM per sq ft

    const requiredCfm = Rp * zonePopulation + Ra * floorAreaSqFt;
    // Damper position scaled from 10% (idle) to 100% (max 2000 CFM)
    const damperPercent = Math.min(100, Math.max(10, Math.round((requiredCfm / 1500) * 100)));

    let status: 'OPTIMAL' | 'MODERATE' | 'POOR_VENTILATE_NOW' = 'OPTIMAL';
    if (zonePopulation > 50) {
      status = 'POOR_VENTILATE_NOW';
    } else if (zonePopulation > 20) {
      status = 'MODERATE';
    }

    return {
      requiredCfm: Math.round(requiredCfm),
      recommendedDamperPositionPercent: damperPercent,
      co2Status: status,
    };
  }

  /**
   * Evaluates if CO2 levels require immediate fresh air purging
   */
  public evaluateCo2Threshold(currentCo2Ppm: number): {
    purgeRequired: boolean;
    excessPpm: number;
  } {
    const limitPpm = 1000;
    const purgeRequired = currentCo2Ppm > limitPpm;
    return {
      purgeRequired,
      excessPpm: Math.max(0, currentCo2Ppm - limitPpm),
    };
  }
}
