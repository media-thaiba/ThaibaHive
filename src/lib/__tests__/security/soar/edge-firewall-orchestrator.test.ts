import { EdgeFirewallOrchestrator } from '@/lib/security/soar/edge-firewall-orchestrator';
import { wafSyncAction } from '@/lib/security/soar/actions/waf-sync-action';
import { SoarExecutionContext } from '@/lib/security/soar/soar-types';

describe('EdgeFirewallOrchestrator', () => {
  it('should block IP across mock Cloudflare and AWS adapters', async () => {
    const orchestrator = new EdgeFirewallOrchestrator();
    const result = await orchestrator.blockIp('203.0.113.88', 'Malicious C2 node');

    expect(result.ip).toBe('203.0.113.88');
    expect(result.cloudflare.success).toBe(true);
    expect(result.aws.success).toBe(true);
  });

  it('should unblock IP during compensation', async () => {
    const orchestrator = new EdgeFirewallOrchestrator();
    const res = await orchestrator.unblockIp('203.0.113.88', 'cf_mock_123');

    expect(res.success).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('should execute and compensate wafSyncAction', async () => {
    const mockContext: SoarExecutionContext = {
      execution_id: 'exec-waf-test',
      playbook_id: 'pb-waf',
      playbook_name: 'WAF Test Playbook',
      trigger_payload: {},
      target_entity: { type: 'IP', value: '198.51.100.99' },
      state: 'RUNNING',
      step_order: [],
      steps: {},
      started_at: new Date().toISOString(),
    };

    const output = await wafSyncAction.execute({ ip: '198.51.100.99' }, mockContext);
    expect(output.cloudflare_success).toBe(true);
    expect(output.aws_success).toBe(true);

    await expect(wafSyncAction.compensate!({ ip: '198.51.100.99' }, output, mockContext)).resolves.not.toThrow();
  });
});
