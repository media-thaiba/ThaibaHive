/**
 * Grid Anomaly Detector
 * Detects demand surges, phantom night loads, and generation drops
 */

export interface EnergyAnomalyEvent {
  anomalyId: string;
  assetId: string;
  anomalyType: 'peak_demand_surge' | 'phantom_night_load' | 'solar_underperformance' | 'zero_generation_daylight';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  details: string;
  detectedKw: number;
  expectedKw: number;
  timestamp: string;
  institutionId: string;
}

export class GridAnomalyDetector {
  /**
   * Detect peak demand surges exceeding threshold or statistical baseline
   */
  public static detectDemandSurge(
    assetId: string,
    currentPowerKw: number,
    contractDemandLimitKw: number,
    historicalAvgKw: number,
    institutionId: string = 'global'
  ): EnergyAnomalyEvent | null {
    if (currentPowerKw > contractDemandLimitKw) {
      return {
        anomalyId: `anom_surge_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assetId,
        anomalyType: 'peak_demand_surge',
        severity: 'critical',
        title: 'Critical Contract Demand Limit Exceeded',
        details: `Current draw of ${currentPowerKw} kW exceeds contracted peak demand limit of ${contractDemandLimitKw} kW. Imminent utility tariff penalty.`,
        detectedKw: currentPowerKw,
        expectedKw: contractDemandLimitKw,
        timestamp: new Date().toISOString(),
        institutionId,
      };
    }

    if (currentPowerKw > historicalAvgKw * 2.0 && currentPowerKw > 50) {
      return {
        anomalyId: `anom_surge_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assetId,
        anomalyType: 'peak_demand_surge',
        severity: 'high',
        title: 'Abnormal Power Surge Detected',
        details: `Power draw of ${currentPowerKw} kW is more than 200% of historical average (${historicalAvgKw} kW).`,
        detectedKw: currentPowerKw,
        expectedKw: historicalAvgKw,
        timestamp: new Date().toISOString(),
        institutionId,
      };
    }

    return null;
  }

  /**
   * Detect phantom loads during unoccupied nocturnal hours (23:00 - 05:00)
   */
  public static detectPhantomNightLoad(
    assetId: string,
    currentPowerKw: number,
    baselineNightLoadKw: number,
    hour: number,
    institutionId: string = 'global'
  ): EnergyAnomalyEvent | null {
    const isNightHour = hour >= 23 || hour <= 5;
    if (isNightHour && currentPowerKw > baselineNightLoadKw * 1.6 && currentPowerKw > 20) {
      return {
        anomalyId: `anom_phantom_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assetId,
        anomalyType: 'phantom_night_load',
        severity: 'medium',
        title: 'Excessive Night-time Phantom Load',
        details: `Measured night load of ${currentPowerKw} kW is 60% higher than expected baseline ${baselineNightLoadKw} kW during unoccupied hours (${hour}:00). Check HVAC, lighting, or lab equipment.`,
        detectedKw: currentPowerKw,
        expectedKw: baselineNightLoadKw,
        timestamp: new Date().toISOString(),
        institutionId,
      };
    }

    return null;
  }

  /**
   * Detect solar underperformance during peak clear-sky irradiance
   */
  public static detectSolarUnderperformance(
    sourceId: string,
    actualGenerationKw: number,
    expectedClearSkyKw: number,
    cloudCoverPercent: number,
    hour: number,
    institutionId: string = 'global'
  ): EnergyAnomalyEvent | null {
    const isMidday = hour >= 10 && hour <= 15;
    // If clear skies (< 20% clouds) and actual generation is < 50% of clear sky expected
    if (isMidday && cloudCoverPercent < 20 && expectedClearSkyKw > 30) {
      if (actualGenerationKw < expectedClearSkyKw * 0.4) {
        return {
          anomalyId: `anom_solar_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          assetId: sourceId,
          anomalyType: actualGenerationKw === 0 ? 'zero_generation_daylight' : 'solar_underperformance',
          severity: actualGenerationKw === 0 ? 'high' : 'medium',
          title: actualGenerationKw === 0 ? 'Zero Solar Generation in Broad Daylight' : 'Severe Solar Underperformance',
          details: `Solar array generated only ${actualGenerationKw} kW compared to expected ${expectedClearSkyKw} kW under clear sky conditions (${cloudCoverPercent}% clouds). Potential inverter trip, string fuse blow, or heavy module soiling.`,
          detectedKw: actualGenerationKw,
          expectedKw: expectedClearSkyKw,
          timestamp: new Date().toISOString(),
          institutionId,
        };
      }
    }

    return null;
  }
}
