/**
 * SOAR Edge Firewall Orchestrator
 * Sprint-040 — Dual-WAF Parallel Dispatch & Rollback Synchronization
 */

import { CloudflareWafAdapter } from '../waf-adapters/cloudflare';
import { AwsWafAdapter } from '../waf-adapters/aws-waf';

export interface EdgeWafBlockResult {
  ip: string;
  cloudflare: { success: boolean; ruleId?: string; error?: string };
  aws: { success: boolean; error?: string };
}

export class EdgeFirewallOrchestrator {
  private static instance: EdgeFirewallOrchestrator;
  private cfAdapter: CloudflareWafAdapter;
  private awsAdapter: AwsWafAdapter;

  constructor(cfAdapter?: CloudflareWafAdapter, awsAdapter?: AwsWafAdapter) {
    this.cfAdapter = cfAdapter || new CloudflareWafAdapter();
    this.awsAdapter = awsAdapter || new AwsWafAdapter();
  }

  public static getInstance(): EdgeFirewallOrchestrator {
    if (!EdgeFirewallOrchestrator.instance) {
      EdgeFirewallOrchestrator.instance = new EdgeFirewallOrchestrator();
    }
    return EdgeFirewallOrchestrator.instance;
  }

  /**
   * Block an IP across both Cloudflare and AWS WAF edge firewalls
   */
  public async blockIp(ip: string, reason: string): Promise<EdgeWafBlockResult> {
    const [cfRes, awsRes] = await Promise.all([
      this.cfAdapter.blockIp(ip, reason).catch(err => ({ success: false, error: err.message })),
      this.awsAdapter.blockIp(ip, reason).catch(err => ({ success: false, error: err.message })),
    ]);

    return {
      ip,
      cloudflare: cfRes,
      aws: awsRes,
    };
  }

  /**
   * Unblock an IP from both Cloudflare and AWS WAF (for rollback/compensation)
   */
  public async unblockIp(ip: string, cfRuleId?: string): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    const tasks: Promise<any>[] = [
      this.awsAdapter.unblockIp(ip).then(res => {
        if (!res.success && res.error) errors.push(`AWS WAF unblock error: ${res.error}`);
      }),
    ];

    if (cfRuleId) {
      tasks.push(
        this.cfAdapter.unblockIp(cfRuleId).then(res => {
          if (!res.success && res.error) errors.push(`Cloudflare unblock error: ${res.error}`);
        })
      );
    }

    await Promise.all(tasks);

    return {
      success: errors.length === 0,
      errors,
    };
  }
}

export const edgeFirewallOrchestrator = EdgeFirewallOrchestrator.getInstance();
