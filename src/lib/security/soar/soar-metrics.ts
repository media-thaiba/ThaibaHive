/**
 * SOAR Prometheus OpenMetrics Telemetry Tracker
 * Sprint-040 — Metrics Collection & Exposition
 */

export class SoarMetricsTracker {
  private static instance: SoarMetricsTracker;

  private playbookExecutions = new Map<string, number>();
  private playbookDurationSums = new Map<string, number>();
  private playbookDurationCounts = new Map<string, number>();
  private actionsExecuted = new Map<string, number>();
  private pendingApprovals = 0;
  private compensations = new Map<string, number>();
  private confidenceScores: number[] = [];

  private constructor() {}

  public static getInstance(): SoarMetricsTracker {
    if (!SoarMetricsTracker.instance) {
      SoarMetricsTracker.instance = new SoarMetricsTracker();
    }
    return SoarMetricsTracker.instance;
  }

  public recordPlaybookExecution(playbook: string, status: string, trigger: string, durationSeconds = 0): void {
    const key = `playbook="${playbook}",status="${status}",trigger="${trigger}"`;
    this.playbookExecutions.set(key, (this.playbookExecutions.get(key) || 0) + 1);

    const durKey = `playbook="${playbook}"`;
    this.playbookDurationSums.set(durKey, (this.playbookDurationSums.get(durKey) || 0) + durationSeconds);
    this.playbookDurationCounts.set(durKey, (this.playbookDurationCounts.get(durKey) || 0) + 1);
  }

  public recordActionExecution(action: string, status: string): void {
    const key = `action="${action}",status="${status}"`;
    this.actionsExecuted.set(key, (this.actionsExecuted.get(key) || 0) + 1);
  }

  public setPendingApprovals(count: number): void {
    this.pendingApprovals = Math.max(0, count);
  }

  public recordCompensation(playbook: string, status: string): void {
    const key = `playbook="${playbook}",status="${status}"`;
    this.compensations.set(key, (this.compensations.get(key) || 0) + 1);
  }

  public recordConfidenceScore(tier: string, score: number): void {
    this.confidenceScores.push(score);
    if (this.confidenceScores.length > 500) {
      this.confidenceScores.shift();
    }
  }

  public getSummary(): {
    totalExecutions: number;
    totalActions: number;
    pendingApprovals: number;
    totalCompensations: number;
    avgExecutionDurationSeconds: number;
  } {
    let totalExecutions = 0;
    for (const val of this.playbookExecutions.values()) totalExecutions += val;

    let totalActions = 0;
    for (const val of this.actionsExecuted.values()) totalActions += val;

    let totalCompensations = 0;
    for (const val of this.compensations.values()) totalCompensations += val;

    let totalDurationSum = 0;
    let totalDurationCount = 0;
    for (const val of this.playbookDurationSums.values()) totalDurationSum += val;
    for (const val of this.playbookDurationCounts.values()) totalDurationCount += val;

    return {
      totalExecutions,
      totalActions,
      pendingApprovals: this.pendingApprovals,
      totalCompensations,
      avgExecutionDurationSeconds: totalDurationCount > 0 ? totalDurationSum / totalDurationCount : 0,
    };
  }

  public reset(): void {
    this.playbookExecutions.clear();
    this.playbookDurationSums.clear();
    this.playbookDurationCounts.clear();
    this.actionsExecuted.clear();
    this.pendingApprovals = 0;
    this.compensations.clear();
    this.confidenceScores = [];
  }

  public toOpenMetrics(): string {
    const lines: string[] = [
      '# HELP soar_playbook_executions_total Total autonomous and manual SOAR playbook executions',
      '# TYPE soar_playbook_executions_total counter',
    ];

    if (this.playbookExecutions.size === 0) {
      lines.push('soar_playbook_executions_total 0');
    } else {
      for (const [labels, count] of this.playbookExecutions.entries()) {
        lines.push(`soar_playbook_executions_total{${labels}} ${count}`);
      }
    }

    lines.push(
      '# HELP soar_playbook_duration_seconds Latency of SOAR playbook executions in seconds',
      '# TYPE soar_playbook_duration_seconds summary'
    );
    if (this.playbookDurationSums.size === 0) {
      lines.push('soar_playbook_duration_seconds_sum 0');
      lines.push('soar_playbook_duration_seconds_count 0');
    } else {
      for (const [labels, sum] of this.playbookDurationSums.entries()) {
        const count = this.playbookDurationCounts.get(labels) || 1;
        lines.push(`soar_playbook_duration_seconds_sum{${labels}} ${sum}`);
        lines.push(`soar_playbook_duration_seconds_count{${labels}} ${count}`);
      }
    }

    lines.push(
      '# HELP soar_actions_executed_total Total individual containment actions executed across all playbooks',
      '# TYPE soar_actions_executed_total counter'
    );
    if (this.actionsExecuted.size === 0) {
      lines.push('soar_actions_executed_total 0');
    } else {
      for (const [labels, count] of this.actionsExecuted.entries()) {
        lines.push(`soar_actions_executed_total{${labels}} ${count}`);
      }
    }

    lines.push(
      '# HELP soar_pending_approvals_total Current number of pending human-in-the-loop security approvals',
      '# TYPE soar_pending_approvals_total gauge',
      `soar_pending_approvals_total ${this.pendingApprovals}`
    );

    lines.push(
      '# HELP soar_compensations_total Total SAGA compensation transactions executed on failure',
      '# TYPE soar_compensations_total counter'
    );
    if (this.compensations.size === 0) {
      lines.push('soar_compensations_total 0');
    } else {
      for (const [labels, count] of this.compensations.entries()) {
        lines.push(`soar_compensations_total{${labels}} ${count}`);
      }
    }

    lines.push(
      '# HELP soar_confidence_score_distribution Threat intelligence confidence score distribution',
      '# TYPE soar_confidence_score_distribution summary'
    );
    const scoreSum = this.confidenceScores.reduce((acc, s) => acc + s, 0);
    lines.push(`soar_confidence_score_distribution_sum ${scoreSum}`);
    lines.push(`soar_confidence_score_distribution_count ${this.confidenceScores.length}`);

    return lines.join('\n');
  }
}

export const soarMetricsTracker = SoarMetricsTracker.getInstance();
