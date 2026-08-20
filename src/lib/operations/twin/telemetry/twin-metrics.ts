export interface PrometheusMetricEntry {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  values: Array<{
    labels: Record<string, string>;
    value: number;
  }>;
}

export class TwinMetrics {
  private static instance: TwinMetrics;

  private iotIngestionRateTotal: Map<string, number> = new Map(); // key: tenantId
  private sensorAnomalyCountTotal: Map<string, number> = new Map(); // key: tenantId:metric
  private spaceUtilizationRatio: Map<string, number> = new Map(); // key: tenantId:facilityId
  private energyReductionKwh: Map<string, number> = new Map(); // key: tenantId:facilityId
  private evacuationCalcDurationSeconds: Map<string, number> = new Map(); // key: tenantId
  private assetTrackingLatencySeconds: Map<string, number> = new Map(); // key: tenantId
  private activeStreamConnections: Map<string, number> = new Map(); // key: tenantId
  private renderFpsGauge: Map<string, number> = new Map(); // key: clientType

  public static getInstance(): TwinMetrics {
    if (!TwinMetrics.instance) {
      TwinMetrics.instance = new TwinMetrics();
    }
    return TwinMetrics.instance;
  }

  public incrementIotIngestion(tenantId: string = 'global', count: number = 1): void {
    const current = this.iotIngestionRateTotal.get(tenantId) || 0;
    this.iotIngestionRateTotal.set(tenantId, current + count);
  }

  public incrementSensorAnomaly(tenantId: string = 'global', metric: string = 'unknown'): void {
    const key = `${tenantId}:${metric}`;
    const current = this.sensorAnomalyCountTotal.get(key) || 0;
    this.sensorAnomalyCountTotal.set(key, current + 1);
  }

  public setSpaceUtilization(tenantId: string, facilityId: string, ratio: number): void {
    this.spaceUtilizationRatio.set(`${tenantId}:${facilityId}`, ratio);
  }

  public setEnergyReductionKwh(tenantId: string, facilityId: string, kwh: number): void {
    this.energyReductionKwh.set(`${tenantId}:${facilityId}`, kwh);
  }

  public setEvacuationCalcDuration(tenantId: string, seconds: number): void {
    this.evacuationCalcDurationSeconds.set(tenantId, seconds);
  }

  public setAssetTrackingLatency(tenantId: string, seconds: number): void {
    this.assetTrackingLatencySeconds.set(tenantId, seconds);
  }

  public setActiveStreamConnections(tenantId: string, count: number): void {
    this.activeStreamConnections.set(tenantId, count);
  }

  public setRenderFps(clientType: 'desktop' | 'mobile' | 'webgl', fps: number): void {
    this.renderFpsGauge.set(clientType, fps);
  }

  public exportMetrics(): PrometheusMetricEntry[] {
    return [
      {
        name: 'twin_iot_ingestion_rate_total',
        type: 'counter',
        help: 'Total number of IoT telemetry samples ingested into Digital Twin',
        values: Array.from(this.iotIngestionRateTotal.entries()).map(([tenantId, value]) => ({
          labels: { tenant_id: tenantId },
          value,
        })),
      },
      {
        name: 'twin_sensor_anomaly_count_total',
        type: 'counter',
        help: 'Total count of detected environmental & equipment anomalies',
        values: Array.from(this.sensorAnomalyCountTotal.entries()).map(([key, value]) => {
          const [tenantId, metric] = key.split(':');
          return {
            labels: { tenant_id: tenantId, metric: metric || 'unknown' },
            value,
          };
        }),
      },
      {
        name: 'twin_space_utilization_ratio',
        type: 'gauge',
        help: 'Average facility space capacity utilization ratio (0.0 to 1.0)',
        values: Array.from(this.spaceUtilizationRatio.entries()).map(([key, value]) => {
          const [tenantId, facilityId] = key.split(':');
          return {
            labels: { tenant_id: tenantId, facility_id: facilityId },
            value,
          };
        }),
      },
      {
        name: 'twin_energy_reduction_kwh',
        type: 'gauge',
        help: 'Predictive HVAC setback energy reduction in kilowatt hours (kWh)',
        values: Array.from(this.energyReductionKwh.entries()).map(([key, value]) => {
          const [tenantId, facilityId] = key.split(':');
          return {
            labels: { tenant_id: tenantId, facility_id: facilityId },
            value,
          };
        }),
      },
      {
        name: 'twin_evacuation_calc_duration_seconds',
        type: 'gauge',
        help: 'Duration in seconds taken to re-route emergency evacuation paths',
        values: Array.from(this.evacuationCalcDurationSeconds.entries()).map(([tenantId, value]) => ({
          labels: { tenant_id: tenantId },
          value,
        })),
      },
      {
        name: 'twin_asset_tracking_latency_seconds',
        type: 'gauge',
        help: 'End-to-end beacon signal to RTLS coordinate solve latency in seconds',
        values: Array.from(this.assetTrackingLatencySeconds.entries()).map(([tenantId, value]) => ({
          labels: { tenant_id: tenantId },
          value,
        })),
      },
      {
        name: 'twin_active_stream_connections',
        type: 'gauge',
        help: 'Count of live WebSocket/SSE clients streaming spatial telemetry',
        values: Array.from(this.activeStreamConnections.entries()).map(([tenantId, value]) => ({
          labels: { tenant_id: tenantId },
          value,
        })),
      },
      {
        name: 'twin_render_fps_gauge',
        type: 'gauge',
        help: 'Average 3D digital twin rendering frames per second',
        values: Array.from(this.renderFpsGauge.entries()).map(([clientType, value]) => ({
          labels: { client_type: clientType },
          value,
        })),
      },
    ];
  }

  public toPrometheusText(): string {
    const metrics = this.exportMetrics();
    const lines: string[] = [];

    for (const m of metrics) {
      lines.push(`# HELP ${m.name} ${m.help}`);
      lines.push(`# TYPE ${m.name} ${m.type}`);
      for (const val of m.values) {
        const labelStr = Object.entries(val.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${m.name}{${labelStr}} ${val.value}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  public clear(): void {
    this.iotIngestionRateTotal.clear();
    this.sensorAnomalyCountTotal.clear();
    this.spaceUtilizationRatio.clear();
    this.energyReductionKwh.clear();
    this.evacuationCalcDurationSeconds.clear();
    this.assetTrackingLatencySeconds.clear();
    this.activeStreamConnections.clear();
    this.renderFpsGauge.clear();
  }
}
