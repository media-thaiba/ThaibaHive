/**
 * Cloudflare IP Access Rules Adapter
 * Sprint-038 / AGS-008
 */

export interface CloudflareWafConfig {
  apiToken?: string;
  zoneId?: string;
  accountEmail?: string;
}

export class CloudflareWafAdapter {
  private config: CloudflareWafConfig;

  constructor(config?: CloudflareWafConfig) {
    this.config = config || {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      accountEmail: process.env.CLOUDFLARE_EMAIL,
    };
  }

  /**
   * Dispatches an IP ban request to Cloudflare IP Access Rules.
   */
  public async blockIp(ip: string, reason: string): Promise<{ success: boolean; ruleId?: string; error?: string }> {
    if (!this.config.apiToken || !this.config.zoneId) {
      // Mock / dry-run mode
      return { success: true, ruleId: `cf_mock_${Date.now()}` };
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/firewall/access_rules/rules`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "block",
            configuration: {
              target: ip.includes("/") ? "ip_range" : "ip",
              value: ip,
            },
            notes: `ThaibaHive Security Shield: ${reason}`,
          }),
        }
      );

      const json = await response.json();
      if (json.success && json.result?.id) {
        return { success: true, ruleId: json.result.id };
      }
      return { success: false, error: json.errors?.[0]?.message || "Cloudflare API error" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Deletes an IP Access Rule in Cloudflare (for compensation/rollback).
   */
  public async unblockIp(ruleId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config.apiToken || !this.config.zoneId || ruleId.startsWith("cf_mock_")) {
      return { success: true };
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/firewall/access_rules/rules/${ruleId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const json = await response.json();
      return { success: json.success || response.ok };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
