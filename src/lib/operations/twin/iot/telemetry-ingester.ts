import { SpatialTelemetryFrame, SpaceComfortScore, MetricType } from '../twin-types';
import { TwinDbStore } from '../../../db/twin-store';

export interface IngestionOptions {
  tenantId?: string;
  autoSaveToDb?: boolean;
}

export class TelemetryIngester {
  private static instance: TelemetryIngester;
  private dbStore: TwinDbStore;
  private recentTelemetry: Map<string, SpatialTelemetryFrame> = new Map(); // key: sensorId:metricType
  private telemetryBuffer: SpatialTelemetryFrame[] = [];
  private processedIds: Set<string> = new Set();

  private constructor() {
    this.dbStore = TwinDbStore.getInstance();
  }

  public static getInstance(): TelemetryIngester {
    if (!TelemetryIngester.instance) {
      TelemetryIngester.instance = new TelemetryIngester();
    }
    return TelemetryIngester.instance;
  }

  public async ingestFrame(
    frame: Partial<SpatialTelemetryFrame>,
    options: IngestionOptions = {}
  ): Promise<SpatialTelemetryFrame> {
    const tenantId = options.tenantId || 'global';
    const completeFrame: SpatialTelemetryFrame = {
      telemetryId: frame.telemetryId || `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sensorId: frame.sensorId || 'unknown_sensor',
      facilityId: frame.facilityId || 'global_facility',
      spaceId: frame.spaceId,
      metricType: frame.metricType || 'temperature_c',
      value: frame.value !== undefined ? frame.value : 0,
      unit: frame.unit || 'unit',
      isAnomaly: frame.isAnomaly || this.checkStaticAnomaly(frame.metricType || 'temperature_c', frame.value || 0),
      timestamp: frame.timestamp || new Date().toISOString(),
    };

    // Deduplication check
    if (this.processedIds.has(completeFrame.telemetryId)) {
      return completeFrame;
    }
    this.processedIds.add(completeFrame.telemetryId);

    // Keep memory cache of latest metric per sensor
    const key = `${completeFrame.sensorId}:${completeFrame.metricType}`;
    this.recentTelemetry.set(key, completeFrame);

    this.telemetryBuffer.push(completeFrame);
    if (this.telemetryBuffer.length > 5000) {
      this.telemetryBuffer.shift();
    }

    if (options.autoSaveToDb !== false) {
      await this.dbStore.recordTelemetry({
        telemetryId: completeFrame.telemetryId,
        sensorId: completeFrame.sensorId,
        metricType: completeFrame.metricType,
        numericValue: completeFrame.value,
        unit: completeFrame.unit,
        isAnomaly: completeFrame.isAnomaly,
        recordedAt: completeFrame.timestamp,
        institutionId: tenantId,
      });

      // If attached to a space, re-calculate and update space comfort score
      if (completeFrame.spaceId) {
        await this.updateSpaceComfortAndOccupancy(completeFrame.spaceId, tenantId);
      }
    }

    return completeFrame;
  }

  public async ingestBatch(
    frames: Partial<SpatialTelemetryFrame>[],
    options: IngestionOptions = {}
  ): Promise<SpatialTelemetryFrame[]> {
    const results: SpatialTelemetryFrame[] = [];
    for (const frame of frames) {
      const processed = await this.ingestFrame(frame, options);
      results.push(processed);
    }
    return results;
  }

  public getLatestSensorReading(sensorId: string, metric: MetricType): SpatialTelemetryFrame | undefined {
    return this.recentTelemetry.get(`${sensorId}:${metric}`);
  }

  public computeSpaceComfortScore(
    tempC: number = 22,
    co2Ppm: number = 500,
    noiseDb: number = 40,
    occupancyRatio: number = 0.5
  ): SpaceComfortScore {
    // Temperature score (optimal 21 - 23 C)
    let tempScore = 100 - Math.abs(tempC - 22) * 10;
    tempScore = Math.max(0, Math.min(100, tempScore));

    // Air Quality / CO2 score (< 600 = 100, 1000 = 70, > 1500 = 20)
    let aqiScore = 100;
    if (co2Ppm > 600) {
      aqiScore = Math.max(0, 100 - ((co2Ppm - 600) / 15));
    }

    // Noise score (< 45dB = 100, > 80dB = 10)
    let noiseScore = 100;
    if (noiseDb > 45) {
      noiseScore = Math.max(0, 100 - (noiseDb - 45) * 2.5);
    }

    const overallScore = Math.round((tempScore * 0.35) + (aqiScore * 0.45) + (noiseScore * 0.20));

    let recommendation = 'Optimal environmental comfort.';
    if (aqiScore < 60) recommendation = 'High CO2 level detected. Increase ventilation airflow.';
    else if (tempScore < 60) recommendation = tempC > 24 ? 'Room is warm. Enable cooling setback.' : 'Room is cool. Adjust heating.';
    else if (noiseScore < 60) recommendation = 'Elevated ambient noise.';

    return {
      spaceId: '',
      overallScore,
      temperatureScore: Math.round(tempScore),
      airQualityScore: Math.round(aqiScore),
      noiseScore: Math.round(noiseScore),
      occupancyRatio,
      recommendation,
    };
  }

  private async updateSpaceComfortAndOccupancy(spaceId: string, tenantId: string): Promise<void> {
    const space = await this.dbStore.getSpaceById(spaceId, tenantId);
    if (!space) return;

    const sensors = await this.dbStore.listSensors(tenantId, space.facilityId);
    const spaceSensors = sensors.filter((s) => s.spaceId === spaceId);

    let temp = 22;
    let co2 = 500;
    let noise = 40;
    let occup = space.currentOccupancy || 0;

    for (const sensor of spaceSensors) {
      const rTemp = this.getLatestSensorReading(sensor.sensorId, 'temperature_c');
      if (rTemp) temp = rTemp.value;

      const rCo2 = this.getLatestSensorReading(sensor.sensorId, 'co2_ppm');
      if (rCo2) co2 = rCo2.value;

      const rNoise = this.getLatestSensorReading(sensor.sensorId, 'noise_db');
      if (rNoise) noise = rNoise.value;

      const rOccup = this.getLatestSensorReading(sensor.sensorId, 'occupancy_count');
      if (rOccup) occup = Math.round(rOccup.value);
    }

    const ratio = space.capacity > 0 ? occup / space.capacity : 0;
    const comfort = this.computeSpaceComfortScore(temp, co2, noise, ratio);

    await this.dbStore.updateSpace(
      spaceId,
      {
        currentOccupancy: occup,
        comfortScore: comfort.overallScore,
        status: occup >= space.capacity ? 'occupied' : 'available',
      },
      tenantId
    );
  }

  public checkStaticAnomaly(metric: MetricType, val: number): boolean {
    switch (metric) {
      case 'temperature_c': return val < 10 || val > 45;
      case 'co2_ppm': return val > 2000;
      case 'noise_db': return val > 95;
      case 'occupancy_count': return val > 500;
      case 'power_kw': return val > 250;
      default: return false;
    }
  }

  public clearBuffer(): void {
    this.recentTelemetry.clear();
    this.telemetryBuffer = [];
    this.processedIds.clear();
  }
}
