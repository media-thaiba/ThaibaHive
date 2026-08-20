import { EngageTelemetry } from '../../../operations/engage/engage-telemetry';
import { getCounter, getGauge, clearRegistry, serializeToPrometheusText } from '../../../metrics/registry';

describe('EngageOS Prometheus OpenMetrics Telemetry Tests', () => {
  let telemetry: EngageTelemetry;

  beforeEach(() => {
    clearRegistry();
    telemetry = EngageTelemetry.getInstance();
  });

  it('should record dispatch counters and export via Prometheus exposition format', () => {
    telemetry.recordDispatch('email', 'high', 0.04);
    telemetry.recordDispatch('sms', 'critical', 0.08);
    telemetry.recordCost(0.0076);
    telemetry.recordChatSession(true);
    telemetry.recordWorkflowExecution();
    telemetry.setActiveCampaigns(3);

    expect(getCounter('engage_dispatches_total')).toBe(2);
    expect(getCounter('engage_workflow_executions_total')).toBe(1);
    expect(getGauge('engage_active_campaigns_gauge')).toBe(3);

    const prometheusText = serializeToPrometheusText();
    expect(prometheusText).toContain('# TYPE engage_dispatches_total counter');
    expect(prometheusText).toContain('engage_dispatches_total 2');
    expect(prometheusText).toContain('engage_active_campaigns_gauge 3');
  });
});
