/**
 * Zero-Trust & Supply Chain Prometheus OpenMetrics Tracker
 * Sprint-041 (ZASM)
 */

export class ZasmMetricsTracker {
  private static instance: ZasmMetricsTracker;

  private mtlsHandshakes = new Map<string, number>();
  private certRotations = new Map<string, number>();
  private trustTiers = new Map<string, number>();
  private activePolicies = new Map<string, number>();
  private sbomVulnerabilities = new Map<string, number>();
  private forensicDurations: number[] = [];

  private readonly HISTOGRAM_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0];

  private constructor() {}

  public static getInstance(): ZasmMetricsTracker {
    if (!ZasmMetricsTracker.instance) {
      ZasmMetricsTracker.instance = new ZasmMetricsTracker();
    }
    return ZasmMetricsTracker.instance;
  }

  public static resetInstance(): void {
    ZasmMetricsTracker.instance = new ZasmMetricsTracker();
  }

  public recordMtlsHandshake(service: string, status: 'SUCCESS' | 'FAILED' | 'REVOKED'): void {
    const key = `service="${service}",status="${status}"`;
    this.mtlsHandshakes.set(key, (this.mtlsHandshakes.get(key) || 0) + 1);
  }

  public recordCertRotation(service: string, status: 'SUCCESS' | 'FAILED'): void {
    const key = `service="${service}",status="${status}"`;
    this.certRotations.set(key, (this.certRotations.get(key) || 0) + 1);
  }

  public recordTrustScore(tier: string): void {
    const key = `tier="${tier}"`;
    this.trustTiers.set(key, (this.trustTiers.get(key) || 0) + 1);
  }

  public setActivePolicies(tier: string, count: number): void {
    const key = `tier="${tier}"`;
    this.activePolicies.set(key, count);
  }

  public recordSbomVulnerability(severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): void {
    const key = `severity="${severity}"`;
    this.sbomVulnerabilities.set(key, (this.sbomVulnerabilities.get(key) || 0) + 1);
  }

  public recordForensicAnalysis(durationSeconds: number): void {
    this.forensicDurations.push(durationSeconds);
    if (this.forensicDurations.length > 500) {
      this.forensicDurations.shift();
    }
  }

  public getSummary(): {
    totalMtlsHandshakes: number;
    totalRotations: number;
    totalVulnerabilities: number;
    avgForensicDurationSec: number;
  } {
    let totalMtls = 0;
    for (const count of this.mtlsHandshakes.values()) totalMtls += count;

    let totalRot = 0;
    for (const count of this.certRotations.values()) totalRot += count;

    let totalVuln = 0;
    for (const count of this.sbomVulnerabilities.values()) totalVuln += count;

    const avgForensic =
      this.forensicDurations.length > 0
        ? this.forensicDurations.reduce((a, b) => a + b, 0) / this.forensicDurations.length
        : 0;

    return {
      totalMtlsHandshakes: totalMtls,
      totalRotations: totalRot,
      totalVulnerabilities: totalVuln,
      avgForensicDurationSec: Math.round(avgForensic * 100) / 100,
    };
  }

  public toOpenMetrics(): string {
    const lines: string[] = [];

    // 1. mTLS Handshakes (Counter)
    lines.push('# HELP zasm_mtls_handshakes_total Total number of mTLS handshakes evaluated across the service mesh');
    lines.push('# TYPE zasm_mtls_handshakes_total counter');
    if (this.mtlsHandshakes.size === 0) {
      lines.push('zasm_mtls_handshakes_total{service="all",status="none"} 0');
    } else {
      for (const [labels, count] of this.mtlsHandshakes.entries()) {
        lines.push(`zasm_mtls_handshakes_total{${labels}} ${count}`);
      }
    }

    // 2. Certificate Rotations (Counter)
    lines.push('# HELP zasm_certificate_rotations_total Total certificate rotations executed');
    lines.push('# TYPE zasm_certificate_rotations_total counter');
    if (this.certRotations.size === 0) {
      lines.push('zasm_certificate_rotations_total{service="all",status="none"} 0');
    } else {
      for (const [labels, count] of this.certRotations.entries()) {
        lines.push(`zasm_certificate_rotations_total{${labels}} ${count}`);
      }
    }

    // 3. Device Trust Tier Distribution (Counter)
    lines.push('# HELP zasm_device_trust_score_distribution Device trust tier distribution');
    lines.push('# TYPE zasm_device_trust_score_distribution counter');
    if (this.trustTiers.size === 0) {
      lines.push('zasm_device_trust_score_distribution{tier="HIGH_TRUST"} 0');
    } else {
      for (const [labels, count] of this.trustTiers.entries()) {
        lines.push(`zasm_device_trust_score_distribution{${labels}} ${count}`);
      }
    }

    // 4. Segmentation Policies Active (Gauge)
    lines.push('# HELP zasm_segmentation_policies_active Active micro-segmentation policies by trust tier');
    lines.push('# TYPE zasm_segmentation_policies_active gauge');
    if (this.activePolicies.size === 0) {
      lines.push('zasm_segmentation_policies_active{tier="HIGH_TRUST"} 0');
      lines.push('zasm_segmentation_policies_active{tier="MEDIUM_TRUST"} 0');
      lines.push('zasm_segmentation_policies_active{tier="LOW_TRUST"} 0');
      lines.push('zasm_segmentation_policies_active{tier="UNTRUSTED"} 0');
    } else {
      for (const [labels, count] of this.activePolicies.entries()) {
        lines.push(`zasm_segmentation_policies_active{${labels}} ${count}`);
      }
    }

    // 5. SBOM Vulnerabilities (Counter)
    lines.push('# HELP zasm_sbom_vulnerabilities_total Total supply chain vulnerabilities detected');
    lines.push('# TYPE zasm_sbom_vulnerabilities_total counter');
    if (this.sbomVulnerabilities.size === 0) {
      lines.push('zasm_sbom_vulnerabilities_total{severity="CRITICAL"} 0');
    } else {
      for (const [labels, count] of this.sbomVulnerabilities.entries()) {
        lines.push(`zasm_sbom_vulnerabilities_total{${labels}} ${count}`);
      }
    }

    // 6. Forensic Analysis Duration (Histogram)
    lines.push('# HELP zasm_forensic_analysis_duration_seconds Forensic root-cause analysis duration in seconds');
    lines.push('# TYPE zasm_forensic_analysis_duration_seconds histogram');
    const durations = this.forensicDurations;
    const totalCount = durations.length;
    const totalSum = durations.reduce((a, b) => a + b, 0);

    for (const le of this.HISTOGRAM_BUCKETS) {
      const bucketCount = durations.filter((d) => d <= le).length;
      lines.push(`zasm_forensic_analysis_duration_seconds_bucket{le="${le}"} ${bucketCount}`);
    }
    lines.push(`zasm_forensic_analysis_duration_seconds_bucket{le="+Inf"} ${totalCount}`);
    lines.push(`zasm_forensic_analysis_duration_seconds_sum ${Math.round(totalSum * 1000) / 1000}`);
    lines.push(`zasm_forensic_analysis_duration_seconds_count ${totalCount}`);

    return lines.join('\n');
  }
}

export const zasmMetricsTracker = ZasmMetricsTracker.getInstance();
