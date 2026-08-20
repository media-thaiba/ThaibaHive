/**
 * Smart Campus Energy & HVAC Optimization Data Types (AIMS / AutoOps)
 */

export interface BmsSensorReading {
  sensorId: string;
  campusId: string;
  buildingId: string;
  zoneId: string;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  co2Ppm: number;
  luxLevel: number;
  powerKw: number;
  timestamp: string;
  institutionId: string;
}

export interface ZoneOccupancyForecast {
  campusId: string;
  buildingId: string;
  zoneId: string;
  forecastTimestamp: string;
  horizonMinutes: 15 | 60 | 1440; // 15-min, 1-hour, 24-hour
  predictedHeadcount: number;
  confidenceInterval: [number, number]; // [lower, upper]
  occupancyRatio: number; // 0.0 to 1.0
  activeCalendarEvent?: string;
}

export interface ThermalComfortMetrics {
  zoneId: string;
  pmv: number; // Predicted Mean Vote [-3 to +3]
  ppd: number; // Predicted Percentage of Dissatisfied [5% to 100%]
  comfortClassification: 'A_EXCELLENT' | 'B_GOOD' | 'C_ACCEPTABLE' | 'DISCOMFORT';
  freshAirCfm: number; // Cubic feet per minute ventilation
  airQualityStatus: 'OPTIMAL' | 'MODERATE' | 'POOR_VENTILATE_NOW';
  timestamp: string;
}

export interface HvacSetpointOptimization {
  id: string;
  campusId: string;
  buildingId: string;
  zoneId: string;
  baselineTempCelsius: number;
  optimizedSetpointCelsius: number;
  deltaCelsius: number;
  projectedKwhSavings: number;
  projectedCostSavingsDollars: number;
  projectedCo2ReductionKg: number;
  pmvConstraintSatisfied: boolean;
  status: 'PENDING' | 'DISPATCHED' | 'APPLIED' | 'FAILED';
  dispatchedAt: string;
  institutionId: string;
}

export interface MicrogridEnergyState {
  campusId: string;
  solarPvGenerationKw: number;
  batteryStorageChargeKwh: number;
  batteryMaxCapacityKwh: number;
  batteryStateOfChargeRatio: number; // 0.0 to 1.0
  gridImportKw: number;
  campusTotalDemandKw: number;
  electricityTariffPerKwh: number; // e.g. $0.14/kWh
  isPeakTariffWindow: boolean;
  timestamp: string;
  institutionId: string;
}
