export interface VisionTelemetrySnapshot {
  activeCamerasTotal: number;
  threatAlertsTotal: number;
  inferenceLatencyMs: number;
  alprDetectionsTotal: number;
  slipFallEventsTotal: number;
  guardResponseTimeSeconds: number;
  privacyRedactionsTotal: number;
  lockdownEventsTotal: number;
}

export class VisionMetricsExporter {
  private static counters = {
    activeCameras: 12,
    threatAlerts: 0,
    inferenceLatency: 45.0,
    alprDetections: 0,
    slipFallEvents: 0,
    guardResponseTime: 120.0,
    privacyRedactions: 0,
    lockdownEvents: 0,
  };

  public static recordThreatAlert(): void {
    this.counters.threatAlerts++;
  }

  public static recordAlprDetection(): void {
    this.counters.alprDetections++;
  }

  public static recordSlipFallEvent(): void {
    this.counters.slipFallEvents++;
  }

  public static recordPrivacyRedaction(count: number = 1): void {
    this.counters.privacyRedactions += count;
  }

  public static recordLockdownEvent(): void {
    this.counters.lockdownEvents++;
  }

  public static setInferenceLatency(ms: number): void {
    this.counters.inferenceLatency = ms;
  }

  public static setGuardResponseTime(seconds: number): void {
    this.counters.guardResponseTime = seconds;
  }

  public static getSnapshot(): VisionTelemetrySnapshot {
    return {
      activeCamerasTotal: this.counters.activeCameras,
      threatAlertsTotal: this.counters.threatAlerts,
      inferenceLatencyMs: this.counters.inferenceLatency,
      alprDetectionsTotal: this.counters.alprDetections,
      slipFallEventsTotal: this.counters.slipFallEvents,
      guardResponseTimeSeconds: this.counters.guardResponseTime,
      privacyRedactionsTotal: this.counters.privacyRedactions,
      lockdownEventsTotal: this.counters.lockdownEvents,
    };
  }

  public static exportPrometheusMetrics(tenantId: string = 'global'): string {
    const s = this.getSnapshot();
    return [
      `# HELP vision_active_cameras_total Total number of active edge IP cameras connected`,
      `# TYPE vision_active_cameras_total gauge`,
      `vision_active_cameras_total{tenant="${tenantId}"} ${s.activeCamerasTotal}`,
      `# HELP vision_threat_alerts_total Cumulative count of detected security threat alerts`,
      `# TYPE vision_threat_alerts_total counter`,
      `vision_threat_alerts_total{tenant="${tenantId}"} ${s.threatAlertsTotal}`,
      `# HELP vision_inference_latency_ms Edge AI computer vision inference latency in milliseconds`,
      `# TYPE vision_inference_latency_ms gauge`,
      `vision_inference_latency_ms{tenant="${tenantId}"} ${s.inferenceLatencyMs}`,
      `# HELP vision_alpr_detections_total Cumulative count of recognized vehicle license plates`,
      `# TYPE vision_alpr_detections_total counter`,
      `vision_alpr_detections_total{tenant="${tenantId}"} ${s.alprDetectionsTotal}`,
      `# HELP vision_slip_fall_events_total Cumulative count of detected slip-and-fall incidents`,
      `# TYPE vision_slip_fall_events_total counter`,
      `vision_slip_fall_events_total{tenant="${tenantId}"} ${s.slipFallEventsTotal}`,
      `# HELP vision_guard_response_time_seconds Average security guard incident response time in seconds`,
      `# TYPE vision_guard_response_time_seconds gauge`,
      `vision_guard_response_time_seconds{tenant="${tenantId}"} ${s.guardResponseTimeSeconds}`,
      `# HELP vision_privacy_redactions_total Total number of on-device blurred faces and license plates`,
      `# TYPE vision_privacy_redactions_total counter`,
      `vision_privacy_redactions_total{tenant="${tenantId}"} ${s.privacyRedactionsTotal}`,
      `# HELP vision_lockdown_events_total Cumulative count of triggered campus lockdown events`,
      `# TYPE vision_lockdown_events_total counter`,
      `vision_lockdown_events_total{tenant="${tenantId}"} ${s.lockdownEventsTotal}`,
    ].join('\n');
  }
}
