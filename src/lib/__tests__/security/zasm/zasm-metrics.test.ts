import { ZasmMetricsTracker } from '@/lib/security/zasm/zasm-metrics';

describe('ZasmMetricsTracker', () => {
  beforeEach(() => {
    ZasmMetricsTracker.resetInstance();
  });

  it('records metrics and generates valid Prometheus OpenMetrics exposition text with all 6 series', () => {
    const tracker = ZasmMetricsTracker.getInstance();

    tracker.recordMtlsHandshake('academic-service', 'SUCCESS');
    tracker.recordMtlsHandshake('finance-service', 'SUCCESS');
    tracker.recordCertRotation('academic-service', 'SUCCESS');
    tracker.recordTrustScore('HIGH_TRUST');
    tracker.setActivePolicies('HIGH_TRUST', 5);
    tracker.recordSbomVulnerability('CRITICAL');
    tracker.recordForensicAnalysis(0.45);

    const summary = tracker.getSummary();
    expect(summary.totalMtlsHandshakes).toBe(2);
    expect(summary.totalRotations).toBe(1);
    expect(summary.totalVulnerabilities).toBe(1);
    expect(summary.avgForensicDurationSec).toBe(0.45);

    const openMetrics = tracker.toOpenMetrics();
    // Verify all 6 mandatory series
    expect(openMetrics).toContain('zasm_mtls_handshakes_total');
    expect(openMetrics).toContain('zasm_certificate_rotations_total');
    expect(openMetrics).toContain('zasm_device_trust_score_distribution');
    expect(openMetrics).toContain('zasm_segmentation_policies_active');
    expect(openMetrics).toContain('zasm_sbom_vulnerabilities_total');
    expect(openMetrics).toContain('zasm_forensic_analysis_duration_seconds');
    expect(openMetrics).toContain('zasm_forensic_analysis_duration_seconds_bucket');
    expect(openMetrics).toContain('zasm_forensic_analysis_duration_seconds_sum');
    expect(openMetrics).toContain('zasm_forensic_analysis_duration_seconds_count');
  });
});
