import { ForensicCopilot } from '@/lib/security/forensics/forensic-copilot';
import { RawSecuritySignal } from '@/lib/security/forensics/forensic-types';

describe('ForensicCopilot', () => {
  it('conducts automated multi-stage threat correlation and returns comprehensive reports', async () => {
    const signals: RawSecuritySignal[] = [
      {
        id: 'sig-10',
        sourceLayer: 'DEVICE_TRUST',
        targetActorOrEntity: 'laptop-finance-04',
        eventType: 'IMPOSSIBLE_TRAVEL',
        severity: 'HIGH',
        details: {},
        timestamp: '2026-08-19T21:00:00Z',
      },
      {
        id: 'sig-11',
        sourceLayer: 'AUTH_LOG',
        targetActorOrEntity: 'laptop-finance-04',
        eventType: 'AUTH_FAIL_BURST',
        severity: 'HIGH',
        details: {},
        timestamp: '2026-08-19T21:02:00Z',
      },
      {
        id: 'sig-12',
        sourceLayer: 'MICRO_SEGMENTATION',
        targetActorOrEntity: 'laptop-finance-04',
        eventType: 'VLAN_QUARANTINE_APPLIED',
        severity: 'CRITICAL',
        details: {},
        timestamp: '2026-08-19T21:03:00Z',
      },
    ];

    const reports = await ForensicCopilot.analyze(signals);
    expect(reports).toHaveLength(1);

    const report = reports[0];
    expect(report.primaryActor).toBe('laptop-finance-04');
    expect(report.timeline).toHaveLength(3);
    expect(report.rootCauseGraph.nodes.length).toBeGreaterThan(3);
    expect(report.executiveSummary).toContain('Forensic analysis');

    expect(ForensicCopilot.getReport(report.reportId)).toBeDefined();
    expect(ForensicCopilot.listReports().length).toBeGreaterThan(0);
  });
});
