/**
 * Federated Institutional Threat Intelligence Sharing Service
 * Sprint-039 / TIF-012
 */

import { StixBundle } from "./stix-types";
import { StixParser } from "./stix-parser";
import { QuarantineManager } from "../quarantine-manager";
import { ThreatFeedIngester, IngestionSummary } from "./feed-ingester";
import { ThreatFeedConfig } from "./threat-feed-config";

export class FederationService {
  private static instance: FederationService | null = null;

  public static getInstance(): FederationService {
    if (!FederationService.instance) {
      FederationService.instance = new FederationService();
    }
    return FederationService.instance;
  }

  /**
   * Checks if an IP is private RFC 1918 or loopback to prevent internal data leakage.
   */
  public isPrivateOrReservedIp(ip: string): boolean {
    const cleanIp = ip.split("/")[0].trim();
    if (cleanIp === "127.0.0.1" || cleanIp === "localhost" || cleanIp === "::1") return true;

    const parts = cleanIp.split(".").map(Number);
    if (parts.length !== 4) return false;

    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link local)
    if (parts[0] === 169 && parts[1] === 254) return true;

    return false;
  }

  /**
   * Exports an anonymized STIX 2.1 bundle of active threats for institutional sharing.
   * Strips all internal tenant IDs, usernames, and private IP addresses.
   */
  public exportAnonymizedStixBundle(): StixBundle {
    const activeQuarantines = QuarantineManager.getInstance().getStore().getAllActiveQuarantines();

    const sanitizedIndicators = activeQuarantines
      .filter((q) => !this.isPrivateOrReservedIp(q.ipAddress))
      .map((q) => ({
        value: q.cidrMask === "/24" ? `${q.ipAddress}/24` : q.ipAddress,
        type: (q.cidrMask === "/24" ? "cidr" : "ipv4-addr") as any,
        confidence: q.threatScore || 85,
        description: "Observed active platform malicious traffic indicator",
        labels: ["malicious-activity", "federated-threat-sharing"],
        validUntil: new Date(q.expiresAt),
      }));

    return StixParser.generateBundle(sanitizedIndicators);
  }

  /**
   * Ingests a federated STIX 2.1 bundle received from a trusted peer institution.
   */
  public async ingestFederatedBundle(bundle: StixBundle, peerId: string): Promise<IngestionSummary> {
    const virtualFeed: ThreatFeedConfig = {
      id: `federation-peer-${peerId}`,
      name: `Federated Peer: ${peerId}`,
      url: `federation://${peerId}`,
      authType: "none",
      pollIntervalMinutes: 0,
      autoQuarantineConfidenceThreshold: 80,
      status: "active",
      indicatorCount: 0,
    };

    return await ThreatFeedIngester.getInstance().ingestBundle(virtualFeed, bundle);
  }
}
