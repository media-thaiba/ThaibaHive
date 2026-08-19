import { soarMetricsTracker } from '@/lib/security/soar/soar-metrics';

describe('SoarMetricsTracker', () => {
  beforeEach(() => {
    soarMetricsTracker.reset();
  });

  it('should record playbook executions and calculate summary statistics', () => {
    soarMetricsTracker.recordPlaybookExecution('IP_QUARANTINE_AUTO_MITIGATION', 'COMPLETED', 'auto', 1.5);
    soarMetricsTracker.recordPlaybookExecution('IP_QUARANTINE_AUTO_MITIGATION', 'COMPLETED', 'auto', 0.5);
    soarMetricsTracker.recordActionExecution('quarantine_ip', 'COMPLETED');
    soarMetricsTracker.setPendingApprovals(3);
    soarMetricsTracker.recordCompensation('SUBNET_CIDR_CONTAINMENT', 'COMPLETED');

    const summary = soarMetricsTracker.getSummary();
    expect(summary.totalExecutions).toBe(2);
    expect(summary.totalActions).toBe(1);
    expect(summary.pendingApprovals).toBe(3);
    expect(summary.totalCompensations).toBe(1);
    expect(summary.avgExecutionDurationSeconds).toBe(1.0);
  });

  it('should generate Prometheus OpenMetrics format text', () => {
    soarMetricsTracker.recordPlaybookExecution('TEST_PLAYBOOK', 'COMPLETED', 'manual', 0.2);
    soarMetricsTracker.setPendingApprovals(5);

    const openMetrics = soarMetricsTracker.toOpenMetrics();
    expect(openMetrics).toContain('soar_playbook_executions_total{playbook="TEST_PLAYBOOK",status="COMPLETED",trigger="manual"} 1');
    expect(openMetrics).toContain('soar_pending_approvals_total 5');
  });
});
