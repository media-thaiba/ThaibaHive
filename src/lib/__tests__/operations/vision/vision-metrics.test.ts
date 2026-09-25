import { VisionMetricsExporter } from '../../../operations/vision/telemetry/vision-metrics';

describe('VisionMetricsExporter Prometheus OpenMetrics Series', () => {
  it('should format valid OpenMetrics string with labels', () => {
    VisionMetricsExporter.recordThreatAlert();
    VisionMetricsExporter.recordAlprDetection();
    VisionMetricsExporter.recordSlipFallEvent();
    VisionMetricsExporter.recordPrivacyRedaction(5);
    VisionMetricsExporter.recordLockdownEvent();
    VisionMetricsExporter.setInferenceLatency(42.5);

    const metricsStr = VisionMetricsExporter.exportPrometheusMetrics('tenant_alpha');

    expect(metricsStr).toContain('vision_active_cameras_total{tenant="tenant_alpha"}');
    expect(metricsStr).toContain('vision_threat_alerts_total{tenant="tenant_alpha"}');
    expect(metricsStr).toContain('vision_inference_latency_ms{tenant="tenant_alpha"} 42.5');
    expect(metricsStr).toContain('vision_alpr_detections_total{tenant="tenant_alpha"}');
    expect(metricsStr).toContain('vision_privacy_redactions_total{tenant="tenant_alpha"}');
  });
});
