/**
 * Renewable Generation Forecaster
 * Generates 24-72h multi-horizon solar and wind generation forecasts with probabilistic confidence bands
 */

import { RenewableForecastPoint } from '../eco-types';
import { WeatherAdapter } from './weather-adapter';
import { SolarPhysicsModel, SolarArraySpec } from './solar-physics-model';
import { WindPowerCurve, WindTurbineSpec } from './wind-power-curve';

export interface GenerationAssetConfig {
  solarArrays: Array<{
    sourceId: string;
    name: string;
    spec: SolarArraySpec;
  }>;
  windTurbines?: Array<{
    sourceId: string;
    name: string;
    spec: WindTurbineSpec;
  }>;
  latitude?: number;
  longitude?: number;
}

export class RenewableForecaster {
  private weatherAdapter: WeatherAdapter;

  constructor(weatherAdapter?: WeatherAdapter) {
    this.weatherAdapter = weatherAdapter || WeatherAdapter.getInstance();
  }

  /**
   * Forecast renewable generation across all assets for the specified time horizon
   */
  public async forecast(
    config: GenerationAssetConfig,
    horizonHours: number = 24,
    startTime?: Date
  ): Promise<{
    points: RenewableForecastPoint[];
    totalForecastKwh: number;
    peakGenerationKw: number;
  }> {
    const lat = config.latitude ?? 28.6139;
    const lon = config.longitude ?? 77.2090;

    const weatherList = await this.weatherAdapter.getHourlyForecast(lat, lon, horizonHours, startTime);
    const points: RenewableForecastPoint[] = [];

    let totalKwh = 0;
    let peakKw = 0;

    for (const w of weatherList) {
      let totalSolarKw = 0;
      let totalWindKw = 0;

      // 1. Compute solar generation across all configured PV arrays
      for (const array of config.solarArrays) {
        const date = new Date(w.timestamp);
        const hour = date.getHours() + date.getMinutes() / 60;
        const dayOfYear = Math.floor(
          (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
        );

        const { zenithDeg } = SolarPhysicsModel.calculateSolarPosition(lat, dayOfYear, hour);
        const poa = SolarPhysicsModel.computePoaIrradiance(w.ghiWm2, zenithDeg, array.spec.tiltAngleDeg);
        const { powerKw } = SolarPhysicsModel.calculatePowerOutput(poa, w.ambientTemperatureC, array.spec);
        totalSolarKw += powerKw;
      }

      // 2. Compute wind generation if wind turbines are configured
      if (config.windTurbines && config.windTurbines.length > 0) {
        for (const turbine of config.windTurbines) {
          const hubSpeed = WindPowerCurve.adjustWindSpeedForHeight(
            w.windSpeedMs,
            10,
            turbine.spec.hubHeightMeters ?? 30
          );
          const windKw = WindPowerCurve.calculatePowerOutput(hubSpeed, turbine.spec);
          totalWindKw += windKw;
        }
      }

      const totalGenerationKw = Number((totalSolarKw + totalWindKw).toFixed(2));
      const energyKwh = Number((totalGenerationKw * 1.0).toFixed(2)); // 1-hour interval

      // Probabilistic confidence intervals:
      // p10: pessimistic (cloudier by +30%, lower irradiance)
      // p90: optimistic (clearer by -20%, higher irradiance)
      const p10 = Number((totalGenerationKw * Math.max(0.4, 1.0 - (w.cloudCoverPercent / 100) * 0.5)).toFixed(2));
      const p90 = Number((totalGenerationKw * Math.min(1.25, 1.0 + (1.0 - w.cloudCoverPercent / 100) * 0.2)).toFixed(2));

      if (totalGenerationKw > peakKw) peakKw = totalGenerationKw;
      totalKwh += energyKwh;

      points.push({
        timestamp: w.timestamp,
        hourOffset: w.hourOffset,
        forecastedGenerationKw: totalGenerationKw,
        forecastedEnergyKwh: energyKwh,
        confidenceLowerP10Kw: p10,
        confidenceUpperP90Kw: p90,
        solarIrradianceGhiWm2: w.ghiWm2,
        ambientTemperatureC: w.ambientTemperatureC,
        cloudCoverPercent: w.cloudCoverPercent,
      });
    }

    return {
      points,
      totalForecastKwh: Number(totalKwh.toFixed(2)),
      peakGenerationKw: Number(peakKw.toFixed(2)),
    };
  }

  /**
   * Evaluate forecast accuracy against actual generation series
   * Returns R^2 and MAPE metrics
   */
  public evaluateAccuracy(
    predictedKw: number[],
    actualKw: number[]
  ): { rSquared: number; mapePercent: number; isPassed: boolean } {
    const n = Math.min(predictedKw.length, actualKw.length);
    if (n === 0) return { rSquared: 1.0, mapePercent: 0, isPassed: true };

    let sumActual = 0;
    let sumSqErr = 0;
    let sumAbsErrPct = 0;
    let countActive = 0;

    for (let i = 0; i < n; i++) {
      sumActual += actualKw[i];
    }
    const meanActual = sumActual / n;

    let sumTot = 0;
    for (let i = 0; i < n; i++) {
      const err = predictedKw[i] - actualKw[i];
      sumSqErr += err * err;
      sumTot += (actualKw[i] - meanActual) * (actualKw[i] - meanActual);

      if (actualKw[i] > 5) {
        sumAbsErrPct += Math.abs(err / actualKw[i]);
        countActive++;
      }
    }

    const rSquared = sumTot > 0 ? Math.max(0, 1.0 - sumSqErr / sumTot) : 1.0;
    const mapePercent = countActive > 0 ? (sumAbsErrPct / countActive) * 100 : 0.0;

    return {
      rSquared: Number(rSquared.toFixed(3)),
      mapePercent: Number(mapePercent.toFixed(1)),
      isPassed: rSquared >= 0.80,
    };
  }
}
