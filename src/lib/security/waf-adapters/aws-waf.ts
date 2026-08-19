/**
 * AWS WAF IP Set Adapter with SigV4 Request Signing
 * Sprint-038 / AGS-008 & Sprint-039 / TIF-004 & TIF-017 (TD-015)
 */

import { AwsSigV4Signer } from "../aws-sigv4-signer";
import { GatewayMetricsTracker } from "../gateway-metrics";

export interface AwsWafConfig {
  ipSetId?: string;
  ipSetName?: string;
  scope?: "REGIONAL" | "CLOUDFRONT";
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export class AwsWafAdapter {
  private config: AwsWafConfig;
  private signer: AwsSigV4Signer;

  constructor(config?: AwsWafConfig) {
    this.config = config || {
      ipSetId: process.env.AWS_WAF_IPSET_ID,
      ipSetName: process.env.AWS_WAF_IPSET_NAME,
      scope: (process.env.AWS_WAF_SCOPE as "REGIONAL" | "CLOUDFRONT") || "REGIONAL",
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
    this.signer = new AwsSigV4Signer({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      sessionToken: this.config.sessionToken,
      region: this.config.region,
      service: "wafv2",
    });
  }

  public getSigner(): AwsSigV4Signer {
    return this.signer;
  }

  /**
   * Retrieves IP Set metadata and addresses using SigV4 signed GetIPSet request.
   */
  public async getIpSet(): Promise<{ success: boolean; ipSet?: any; error?: string }> {
    if (!this.config.ipSetId || !this.signer.hasCredentials()) {
      return { success: true, ipSet: { Addresses: [] } };
    }

    try {
      const endpoint = `https://wafv2.${this.config.region}.amazonaws.com/`;
      const body = JSON.stringify({
        Id: this.config.ipSetId,
        Name: this.config.ipSetName || "ThaibaHiveQuarantineSet",
        Scope: this.config.scope,
      });

      const signedHeaders = this.signer.sign({
        method: "POST",
        url: endpoint,
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "AWSWAF_20190729.GetIPSet",
        },
        body,
      });

      // Record OpenMetrics
      GatewayMetricsTracker.getInstance().recordWafSigV4Request();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: signedHeaders,
        body,
      });

      if (!res.ok) {
        return { success: false, error: `AWS WAF GetIPSet returned ${res.status}` };
      }

      const data = await res.json();
      return { success: true, ipSet: data.IPSet };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Dispatches IP addition to AWS WAF IP Set using SigV4 signed requests.
   */
  public async blockIp(ip: string, _reason: string): Promise<{ success: boolean; error?: string }> {
    const formattedIp = ip.includes("/") ? ip : `${ip}/32`;
    if (!this.config.ipSetId || !this.signer.hasCredentials()) {
      return { success: true };
    }

    try {
      const endpoint = `https://wafv2.${this.config.region}.amazonaws.com/`;
      const body = JSON.stringify({
        Id: this.config.ipSetId,
        Name: this.config.ipSetName || "ThaibaHiveQuarantineSet",
        Scope: this.config.scope,
        Addresses: [formattedIp],
        Action: "INSERT",
      });

      const signedHeaders = this.signer.sign({
        method: "POST",
        url: endpoint,
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "AWSWAF_20190729.UpdateIPSet",
        },
        body,
      });

      // Record OpenMetrics
      GatewayMetricsTracker.getInstance().recordWafSigV4Request();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: signedHeaders,
        body,
      });

      if (!res.ok && res.status !== 200) {
        return { success: false, error: `AWS WAF returned ${res.status}` };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Removes IP from AWS WAF IP Set using SigV4 signed requests.
   */
  public async unblockIp(ip: string): Promise<{ success: boolean; error?: string }> {
    const formattedIp = ip.includes("/") ? ip : `${ip}/32`;
    if (!this.config.ipSetId || !this.signer.hasCredentials()) {
      return { success: true };
    }

    try {
      const endpoint = `https://wafv2.${this.config.region}.amazonaws.com/`;
      const body = JSON.stringify({
        Id: this.config.ipSetId,
        Name: this.config.ipSetName || "ThaibaHiveQuarantineSet",
        Scope: this.config.scope,
        Addresses: [formattedIp],
        Action: "REMOVE",
      });

      const signedHeaders = this.signer.sign({
        method: "POST",
        url: endpoint,
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": "AWSWAF_20190729.UpdateIPSet",
        },
        body,
      });

      // Record OpenMetrics
      GatewayMetricsTracker.getInstance().recordWafSigV4Request();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: signedHeaders,
        body,
      });

      return { success: res.ok };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
}
