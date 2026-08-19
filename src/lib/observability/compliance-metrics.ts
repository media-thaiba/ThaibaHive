import { ViolationSeverity } from "../compliance/types";

export class ComplianceMetricsRegistry {
  private violationCounters: Map<string, number> = new Map();
  private auditCryptoLatencyMs: number[] = [];
  private complianceScore: number = 100;

  recordViolation(severity: ViolationSeverity, ruleId: string) {
    const key = `${severity}:${ruleId}`;
    const current = this.violationCounters.get(key) || 0;
    this.violationCounters.set(key, current + 1);

    // Adjust in-memory score based on severity
    const penalty = severity === "CRITICAL" ? 15 : severity === "HIGH" ? 8 : severity === "MEDIUM" ? 3 : 1;
    this.complianceScore = Math.max(0, this.complianceScore - penalty);
  }

  recordCryptoLatency(ms: number) {
    this.auditCryptoLatencyMs.push(ms);
    if (this.auditCryptoLatencyMs.length > 500) {
      this.auditCryptoLatencyMs.shift();
    }
  }

  setComplianceScore(score: number) {
    this.complianceScore = Math.min(100, Math.max(0, score));
  }

  getComplianceScore(): number {
    return this.complianceScore;
  }

  getPrometheusMetrics(): string {
    const lines: string[] = [
      "# HELP thaibahive_compliance_violations_total Total detected compliance violations",
      "# TYPE thaibahive_compliance_violations_total counter",
    ];

    for (const [key, count] of this.violationCounters.entries()) {
      const [severity, ruleId] = key.split(":");
      lines.push(`thaibahive_compliance_violations_total{severity="${severity}",rule="${ruleId}"} ${count}`);
    }

    lines.push(
      "# HELP thaibahive_compliance_score_gauge Real-time compliance health score (0-100)",
      "# TYPE thaibahive_compliance_score_gauge gauge",
      `thaibahive_compliance_score_gauge ${this.complianceScore}`
    );

    const avgLatency = this.auditCryptoLatencyMs.length > 0
      ? this.auditCryptoLatencyMs.reduce((a, b) => a + b, 0) / this.auditCryptoLatencyMs.length
      : 0;

    lines.push(
      "# HELP thaibahive_audit_crypto_latency_ms Average cryptographic audit hashing latency in ms",
      "# TYPE thaibahive_audit_crypto_latency_ms gauge",
      `thaibahive_audit_crypto_latency_ms ${avgLatency.toFixed(3)}`
    );

    return lines.join("\n");
  }

  reset() {
    this.violationCounters.clear();
    this.auditCryptoLatencyMs = [];
    this.complianceScore = 100;
  }
}

export const complianceMetrics = new ComplianceMetricsRegistry();
