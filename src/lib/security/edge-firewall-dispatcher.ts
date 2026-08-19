/**
 * Upstream Edge Firewall Dispatcher with Exponential Jittered Retry Backoff
 * Sprint-038 / AGS-008 & Sprint-039 / TIF-005 (TD-015)
 */

import { CloudflareWafAdapter } from "./waf-adapters/cloudflare";
import { AwsWafAdapter } from "./waf-adapters/aws-waf";
import { withRetry } from "./retry-backoff";
import { logGatewayThreatEvent } from "./threat-audit-events";

export type EdgeWafProvider = "cloudflare" | "aws" | "mock" | "none";

export interface WafDispatchResult {
  provider: EdgeWafProvider;
  success: boolean;
  ip: string;
  ruleId?: string;
  error?: string;
  attempts?: number;
}

export class EdgeFirewallDispatcher {
  private static instance: EdgeFirewallDispatcher | null = null;
  private cfAdapter: CloudflareWafAdapter;
  private awsAdapter: AwsWafAdapter;
  private provider: EdgeWafProvider;

  constructor(provider?: EdgeWafProvider) {
    this.provider = provider || (process.env.EDGE_WAF_PROVIDER as EdgeWafProvider) || "mock";
    this.cfAdapter = new CloudflareWafAdapter();
    this.awsAdapter = new AwsWafAdapter();
  }

  public static getInstance(provider?: EdgeWafProvider): EdgeFirewallDispatcher {
    if (!EdgeFirewallDispatcher.instance) {
      EdgeFirewallDispatcher.instance = new EdgeFirewallDispatcher(provider);
    }
    return EdgeFirewallDispatcher.instance;
  }

  public setProvider(provider: EdgeWafProvider): void {
    this.provider = provider;
  }

  public getProvider(): EdgeWafProvider {
    return this.provider;
  }

  /**
   * Asynchronously syncs a quarantined IP to upstream edge firewalls with jittered retry backoff.
   */
  public async syncQuarantine(ip: string, reason: string): Promise<WafDispatchResult> {
    if (this.provider === "none") {
      return { provider: "none", success: true, ip, attempts: 1 };
    }

    if (this.provider === "mock") {
      return {
        provider: "mock",
        success: true,
        ip,
        ruleId: `mock_rule_${Date.now()}`,
        attempts: 1,
      };
    }

    let attemptsCount = 0;

    try {
      const result = await withRetry(
        async () => {
          attemptsCount++;
          if (this.provider === "cloudflare") {
            const res = await this.cfAdapter.blockIp(ip, reason);
            if (!res.success) {
              throw new Error(res.error || "Cloudflare blockIp failed");
            }
            return {
              provider: "cloudflare" as EdgeWafProvider,
              success: true,
              ip,
              ruleId: res.ruleId,
              attempts: attemptsCount,
            };
          }

          if (this.provider === "aws") {
            const res = await this.awsAdapter.blockIp(ip, reason);
            if (!res.success) {
              throw new Error(res.error || "AWS WAF blockIp failed");
            }
            return {
              provider: "aws" as EdgeWafProvider,
              success: true,
              ip,
              attempts: attemptsCount,
            };
          }

          return {
            provider: this.provider,
            success: true,
            ip,
            attempts: attemptsCount,
          };
        },
        {
          maxAttempts: 5,
          baseDelayMs: 50,
          maxDelayMs: 1000,
        }
      );

      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Log failure to Merkle audit chain
      logGatewayThreatEvent({
        eventType: "gateway.waf.dispatch_failed",
        ipAddress: ip,
        reason: `WAF dispatch failed after ${attemptsCount} attempts: ${errorMsg}`,
        metadata: { provider: this.provider, attempts: attemptsCount },
      }).catch(() => {});

      return {
        provider: this.provider,
        success: false,
        ip,
        error: errorMsg,
        attempts: attemptsCount,
      };
    }
  }
}
