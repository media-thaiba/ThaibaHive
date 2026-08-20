import { BmsSensorReading } from './energy-types';

/**
 * High-Throughput BMS Sensor Telemetry Ingester
 * Ingests, normalizes, and applies 1D Kalman filter noise smoothing to sensor readings.
 */
export class BmsTelemetryIngester {
  private recentReadings: Map<string, BmsSensorReading> = new Map();
  private kalmanStates: Map<string, { estimate: number; errorEst: number }> = new Map();

  /**
   * Ingests a raw sensor reading packet and applies Kalman smoothing
   */
  public ingest(rawPacket: Partial<BmsSensorReading> & { sensorId: string; zoneId: string }): BmsSensorReading {
    const sensorKey = `${rawPacket.zoneId}_${rawPacket.sensorId}`;

    // Kalman Filter parameters
    const processNoise = 0.05;
    const measurementNoise = 0.5;

    const rawTemp = rawPacket.temperatureCelsius ?? 23.0;

    let kState = this.kalmanStates.get(sensorKey);
    if (!kState) {
      kState = { estimate: rawTemp, errorEst: 1.0 };
    }

    // Prediction update
    const predictedError = kState.errorEst + processNoise;

    // Measurement update
    const kalmanGain = predictedError / (predictedError + measurementNoise);
    const smoothedTemp = kState.estimate + kalmanGain * (rawTemp - kState.estimate);
    const updatedError = (1 - kalmanGain) * predictedError;

    this.kalmanStates.set(sensorKey, { estimate: smoothedTemp, errorEst: updatedError });

    const normalizedReading: BmsSensorReading = {
      sensorId: rawPacket.sensorId,
      campusId: rawPacket.campusId || 'campus_main',
      buildingId: rawPacket.buildingId || 'bld_engineering',
      zoneId: rawPacket.zoneId,
      temperatureCelsius: Number(smoothedTemp.toFixed(2)),
      relativeHumidityPercent: rawPacket.relativeHumidityPercent ?? 50.0,
      co2Ppm: rawPacket.co2Ppm ?? 450,
      luxLevel: rawPacket.luxLevel ?? 300,
      powerKw: rawPacket.powerKw ?? 12.5,
      timestamp: rawPacket.timestamp || new Date().toISOString(),
      institutionId: rawPacket.institutionId || 'inst_default',
    };

    this.recentReadings.set(sensorKey, normalizedReading);
    return normalizedReading;
  }

  public getLatestReading(zoneId: string, sensorId: string): BmsSensorReading | undefined {
    return this.recentReadings.get(`${zoneId}_${sensorId}`);
  }

  public getZoneReadings(zoneId: string): BmsSensorReading[] {
    return Array.from(this.recentReadings.values()).filter((r) => r.zoneId === zoneId);
  }
}
