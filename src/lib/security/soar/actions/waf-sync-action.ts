/**
 * SOAR Edge WAF Synchronization Action Handler
 * Sprint-040 — Edge Firewall Action & Rollback
 */

import { SoarActionHandler } from '../soar-types';
import { edgeFirewallOrchestrator } from '../edge-firewall-orchestrator';

export const wafSyncAction: SoarActionHandler<{
  ip: string;
  reason?: string;
}> = {
  name: 'sync_edge_waf',
  description: 'Synchronize IP block rule to Cloudflare and AWS WAF edge firewalls',
  execute: async (params, context) => {
    const ip = params.ip || context.target_entity.value;
    if (!ip) throw new Error('ip parameter is required for sync_edge_waf action');

    const reason = params.reason || `[SOAR:${context.playbook_name}] Automated Edge WAF mitigation`;
    const result = await edgeFirewallOrchestrator.blockIp(ip, reason);

    return {
      ip,
      cloudflare_rule_id: result.cloudflare.ruleId,
      cloudflare_success: result.cloudflare.success,
      aws_success: result.aws.success,
    };
  },
  compensate: async (params, output, context) => {
    const ip = params.ip || output?.ip || context.target_entity.value;
    const cfRuleId = output?.cloudflare_rule_id;
    if (ip) {
      await edgeFirewallOrchestrator.unblockIp(ip, cfRuleId);
    }
  },
};
