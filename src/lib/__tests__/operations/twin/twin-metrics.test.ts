import { TwinMetrics } from '../../../operations/twin/telemetry/twin-metrics';

describe('TwinMetrics Prometheus OpenMetrics Series', () => {
  let metrics: TwinMetrics;

  beforeEach(() => {
    metrics = TwinMetrics.getInstance();
    metrics.clear();
  });

  it('should increment ingestion counter and export Prometheus OpenMetrics format', () => {
    metrics.incrementIotIngestion('inst_01', 150);
    metrics.incrementSensorAnomaly('inst_01', 'temperature_c');
    metrics.setSpaceUtilization('inst_01', 'FAC-01', 0.78);
    metrics.setEnergyReductionKwh('inst_01', 'FAC-01', 125.4);
    metrics.setRenderFps('webgl', 60);

    const exported = metrics.exportMetrics();
    expect(exported.length).toBe(8);

    const ingestMetric = exported.find((m) => m.name === 'twin_iot_ingestion_rate_total');
    expect(ingestMetric?.values[0].value).toBe(150);

    const promText = metrics.toPrometheusText();
    expect(promText).toContain('# TYPE twin_iot_ingestion_rate_total counter');
    expect(promText).toContain('twin_iot_ingestion_rate_total{tenant_id="inst_01"} 150');
    expect(promText).toContain('twin_render_fps_gauge{client_type="webgl"} 60');
  });
});
