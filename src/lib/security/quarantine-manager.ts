/**
 * Automated Subnet & IP Quarantine Manager
 * Sprint-038 / AGS-006 & Sprint-039 / TIF-003 (TD-017)
 */

import { QuarantineStore, QuarantineRecord, AllowlistRecord } from "./quarantine-store";
import { IpReputationEngine } from "./ip-reputation";
import { logGatewayThreatEvent } from "./threat-audit-events";
import { QuarantineMesh } from "./quarantine-mesh";

export interface QuarantineCheckResult {
  quarantined: boolean;
  isSubnet: boolean;
  reason?: string;
  record?: QuarantineRecord;
  subnetCidr?: string;
}

export class QuarantineManager {
  private static instance: QuarantineManager | null = null;
  private store: QuarantineStore;
  private subnetThreatCounters: Map<string, { ips: Set<string>; lastUpdated: number }> = new Map();

  constructor(store?: QuarantineStore) {
    this.store = store || new QuarantineStore();
  }

  public static getInstance(): QuarantineManager {
    if (!QuarantineManager.instance) {
      QuarantineManager.instance = new QuarantineManager();
    }
    return QuarantineManager.instance;
  }

  public getStore(): QuarantineStore {
    return this.store;
  }

  /**
   * Quarantines an IP address with duration and automatic /24 subnet containment check.
   */
  public quarantineIp(
    ip: string,
    reason: string,
    durationMs: number = 15 * 60 * 1000, // 15 min default
    tenantId: string = "default",
    bannedBy: string = "system",
    threatScore: number = 100
  ): { record: QuarantineRecord; subnetContained: boolean } {
    const now = Date.now();
    const id = `quarantine_${ip.replace(/[^a-zA-Z0-9]/g, "_")}_${now}`;

    // Check subnet containment heuristic (>= 3 distinct attacking IPs in same /24)
    const subnet = QuarantineStore.getSubnet24(ip);
    let subnetCounter = this.subnetThreatCounters.get(subnet);
    if (!subnetCounter || now - subnetCounter.lastUpdated > 10 * 60 * 1000) {
      subnetCounter = { ips: new Set(), lastUpdated: now };
      this.subnetThreatCounters.set(subnet, subnetCounter);
    }
    subnetCounter.ips.add(ip);
    subnetCounter.lastUpdated = now;

    let cidrMask = "/32";
    let subnetContained = false;

    if (subnetCounter.ips.size >= 3) {
      cidrMask = "/24";
      subnetContained = true;
      reason = `[Subnet Auto-Contained] Multiple attacking IPs (${subnetCounter.ips.size}) in subnet ${subnet}. Primary reason: ${reason}`;
    }

    const record: QuarantineRecord = {
      id,
      tenantId,
      ipAddress: ip,
      cidrMask,
      reason,
      threatScore,
      bannedBy,
      expiresAt: now + durationMs,
      isActive: true,
      createdAt: now,
    };

    this.store.addQuarantine(record);

    // Also update reputation engine
    IpReputationEngine.getInstance().recordSignal(ip, "cross_tenant_probe", { quarantined: true, reason });

    // Emit source Merkle audit events (TD-017)
    if (subnetContained) {
      logGatewayThreatEvent({
        eventType: "gateway.subnet.contained",
        tenantId,
        ipAddress: ip,
        cidrMask: "/24",
        reason,
        threatScore,
        metadata: {
          subnetCidr: subnet,
          attackingIps: Array.from(subnetCounter.ips),
        },
      }).catch(() => {});

      // Broadcast subnet containment to mesh
      try {
        QuarantineMesh.getInstance().broadcastSubnetContainment(record, subnet);
      } catch {
        // Fallback
      }
    } else {
      logGatewayThreatEvent({
        eventType: "gateway.ip.quarantined",
        tenantId,
        ipAddress: ip,
        cidrMask,
        reason,
        threatScore,
      }).catch(() => {});

      // Broadcast single IP ban to mesh
      try {
        QuarantineMesh.getInstance().broadcastQuarantine(record);
      } catch {
        // Fallback
      }
    }

    return { record, subnetContained };
  }

  /**
   * Manually unbans an IP or removes a quarantine record.
   */
  public unban(idOrIp: string, tenantId: string = "default"): boolean {
    const active = this.store.getAllActiveQuarantines();
    for (const record of active) {
      if (record.id === idOrIp || record.ipAddress === idOrIp) {
        this.store.removeQuarantine(record.id);

        // Emit unban audit event
        logGatewayThreatEvent({
          eventType: "gateway.ip.unbanned",
          tenantId: record.tenantId || tenantId,
          ipAddress: record.ipAddress,
          reason: "Manual admin unban",
        }).catch(() => {});

        try {
          QuarantineMesh.getInstance().broadcastUnban(record.ipAddress);
        } catch {
          // Fallback
        }

        return true;
      }
    }
    return false;
  }

  /**
   * Adds an IP to the allowlist.
   */
  public allowlistIp(ip: string, description: string, addedBy: string = "admin", tenantId: string = "default"): AllowlistRecord {
    const record: AllowlistRecord = {
      id: `allowlist_${ip.replace(/[^a-zA-Z0-9]/g, "_")}`,
      tenantId,
      ipAddress: ip,
      description,
      addedBy,
      createdAt: Date.now(),
    };
    this.store.addAllowlist(record);
    return record;
  }

  /**
   * Checks detailed quarantine status for an IP including subnet containment.
   */
  public checkQuarantineStatus(ip: string, tenantId: string = "default"): QuarantineCheckResult {
    const check = this.store.isQuarantined(ip, tenantId);
    if (!check.quarantined || !check.record) {
      return { quarantined: false, isSubnet: false };
    }

    const isSubnet = check.record.cidrMask === "/24" || (check.record as any).isSubnet || false;
    return {
      quarantined: true,
      isSubnet,
      reason: check.record.reason,
      record: check.record,
      subnetCidr: isSubnet ? QuarantineStore.getSubnet24(check.record.ipAddress) : undefined,
    };
  }

  /**
   * Fast check if an IP is currently banned.
   */
  public isBanned(ip: string, tenantId: string = "default"): boolean {
    return this.store.isQuarantined(ip, tenantId).quarantined;
  }

  public reset(): void {
    this.store.reset();
    this.subnetThreatCounters.clear();
  }
}
