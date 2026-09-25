export class AdvisingMetricsExporter {
  private static instance: AdvisingMetricsExporter;

  private sessionsTotal: number = 0;
  private tokenLatencyObservations: number[] = [];
  private intentRoutingCounts: Map<string, number> = new Map();
  private dagValidationDurations: number[] = [];
  private degreeAuditsTotal: number = 0;
  private averageRetentionRiskScore: number = 0.50;
  private interventionsTriggeredTotal: number = 0;
  private transferArticulationsTotal: number = 0;

  public static getInstance(): AdvisingMetricsExporter {
    if (!AdvisingMetricsExporter.instance) {
      AdvisingMetricsExporter.instance = new AdvisingMetricsExporter();
    }
    return AdvisingMetricsExporter.instance;
  }

  public recordSessionStarted(): void {
    this.sessionsTotal++;
  }

  public recordTokenLatency(latencyMs: number): void {
    this.tokenLatencyObservations.push(latencyMs);
    if (this.tokenLatencyObservations.length > 1000) {
      this.tokenLatencyObservations.shift();
    }
  }

  public recordIntentRouted(domain: string): void {
    const current = this.intentRoutingCounts.get(domain) || 0;
    this.intentRoutingCounts.set(domain, current + 1);
  }

  public recordDagValidation(durationMs: number): void {
    this.dagValidationDurations.push(durationMs / 1000);
    if (this.dagValidationDurations.length > 1000) {
      this.dagValidationDurations.shift();
    }
  }

  public recordDegreeAudit(): void {
    this.degreeAuditsTotal++;
  }

  public setRetentionRiskGauge(averageScore: number): void {
    this.averageRetentionRiskScore = Math.max(0.0, Math.min(1.0, averageScore));
  }

  public recordInterventionTriggered(): void {
    this.interventionsTriggeredTotal++;
  }

  public recordTransferArticulation(): void {
    this.transferArticulationsTotal++;
  }

  public getScrapeMetrics(): string {
    const avgLatency =
      this.tokenLatencyObservations.length > 0
        ? Math.round(
            this.tokenLatencyObservations.reduce((a, b) => a + b, 0) /
              this.tokenLatencyObservations.length
          )
        : 45;

    const avgDagSeconds =
      this.dagValidationDurations.length > 0
        ? (
            this.dagValidationDurations.reduce((a, b) => a + b, 0) /
            this.dagValidationDurations.length
          ).toFixed(4)
        : '0.0150';

    let output = '';
    output += `# HELP advise_sessions_total Total advising sessions initiated\n`;
    output += `# TYPE advise_sessions_total counter\n`;
    output += `advise_sessions_total ${this.sessionsTotal}\n\n`;

    output += `# HELP advise_token_latency_ms Average LLM response token streaming latency in ms\n`;
    output += `# TYPE advise_token_latency_ms gauge\n`;
    output += `advise_token_latency_ms ${avgLatency}\n\n`;

    output += `# HELP advise_intent_routing_total Total intent routing classifications by domain\n`;
    output += `# TYPE advise_intent_routing_total counter\n`;
    for (const [domain, count] of this.intentRoutingCounts.entries()) {
      output += `advise_intent_routing_total{domain="${domain}"} ${count}\n`;
    }
    if (this.intentRoutingCounts.size === 0) {
      output += `advise_intent_routing_total{domain="degree_planner"} 0\n`;
    }
    output += `\n`;

    output += `# HELP advise_dag_validation_seconds Average duration of curricular DAG validations in seconds\n`;
    output += `# TYPE advise_dag_validation_seconds gauge\n`;
    output += `advise_dag_validation_seconds ${avgDagSeconds}\n\n`;

    output += `# HELP advise_degree_audits_total Total deterministic degree audits executed\n`;
    output += `# TYPE advise_degree_audits_total counter\n`;
    output += `advise_degree_audits_total ${this.degreeAuditsTotal}\n\n`;

    output += `# HELP advise_retention_risk_gauge Average student retention risk index across active cohort\n`;
    output += `# TYPE advise_retention_risk_gauge gauge\n`;
    output += `advise_retention_risk_gauge ${this.averageRetentionRiskScore.toFixed(3)}\n\n`;

    output += `# HELP advise_interventions_triggered_total Total automated early retention interventions triggered\n`;
    output += `# TYPE advise_interventions_triggered_total counter\n`;
    output += `advise_interventions_triggered_total ${this.interventionsTriggeredTotal}\n\n`;

    output += `# HELP advise_transfer_articulations_total Total transfer credit articulations processed\n`;
    output += `# TYPE advise_transfer_articulations_total counter\n`;
    output += `advise_transfer_articulations_total ${this.transferArticulationsTotal}\n`;

    return output;
  }
}

export const advisingMetrics = AdvisingMetricsExporter.getInstance();
