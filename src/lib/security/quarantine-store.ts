/**
 * Quarantine Storage & CIDR Subnet Operations
 * Sprint-038 / AGS-006 & Sprint-039 / TIF-002 (TD-013)
 */

import { QuarantineDbStore } from "./quarantine-db-store";

export interface QuarantineRecord {
  id: string;
  tenantId: string;
  ipAddress: string;
  cidrMask: string; // e.g. "/32" or "/24"
  reason: string;
  threatScore: number;
  bannedBy: string;
  expiresAt: number; // Unix timestamp ms
  isActive: boolean;
  createdAt: number;
}

export interface AllowlistRecord {
  id: string;
  tenantId: string;
  ipAddress: string;
  description?: string;
  addedBy: string;
  createdAt: number;
}

export class QuarantineStore {
  private quarantines: Map<string, QuarantineRecord> = new Map();
  private allowlist: Map<string, AllowlistRecord> = new Map();
  private dbStore: QuarantineDbStore;

  constructor(dbStore?: QuarantineDbStore) {
    this.dbStore = dbStore || QuarantineDbStore.getInstance();
  }

  /**
   * Helper to extract /24 subnet from an IPv4 address.
   */
  public static getSubnet24(ip: string): string {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return `${ip}/32`;
  }

  /**
   * Checks if an IP falls into a CIDR /24 or /32 mask.
   */
  public static isIpInCidr(ip: string, cidr: string): boolean {
    if (cidr.endsWith("/32") || !cidr.includes("/")) {
      const cleanCidr = cidr.replace("/32", "");
      return ip === cleanCidr;
    }
    if (cidr.endsWith("/24")) {
      const subnetPrefix = cidr.replace(".0/24", "");
      const ipPrefix = ip.split(".").slice(0, 3).join(".");
      return subnetPrefix === ipPrefix;
    }
    return ip === cidr;
  }

  public addQuarantine(record: QuarantineRecord, persistToDb: boolean = true): void {
    this.quarantines.set(record.id, record);
    if (persistToDb) {
      this.dbStore.saveQuarantine(record).catch(() => {});
    }
  }

  public removeQuarantine(id: string, persistToDb: boolean = true): boolean {
    const deleted = this.quarantines.delete(id);
    if (persistToDb) {
      this.dbStore.removeQuarantine(id).catch(() => {});
    }
    return deleted;
  }

  public getQuarantineById(id: string): QuarantineRecord | undefined {
    return this.quarantines.get(id);
  }

  public addAllowlist(record: AllowlistRecord, persistToDb: boolean = true): void {
    this.allowlist.set(record.ipAddress, record);
    if (persistToDb) {
      this.dbStore.saveAllowlist(record).catch(() => {});
    }
  }

  public removeAllowlist(ipAddress: string, persistToDb: boolean = true): boolean {
    const deleted = this.allowlist.delete(ipAddress);
    if (persistToDb) {
      this.dbStore.removeAllowlist(ipAddress).catch(() => {});
    }
    return deleted;
  }

  public isAllowlisted(ip: string, tenantId: string = "default"): boolean {
    const record = this.allowlist.get(ip);
    if (!record) return false;
    return record.tenantId === "default" || record.tenantId === tenantId;
  }

  /**
   * Checks if an IP is currently actively quarantined.
   */
  public isQuarantined(ip: string, tenantId: string = "default", nowMs: number = Date.now()): { quarantined: boolean; record?: QuarantineRecord } {
    if (this.isAllowlisted(ip, tenantId)) {
      return { quarantined: false };
    }

    for (const record of this.quarantines.values()) {
      if (!record.isActive) continue;
      if (record.expiresAt < nowMs) continue; // Expired

      if (record.tenantId !== "default" && record.tenantId !== tenantId) {
        continue;
      }

      if (QuarantineStore.isIpInCidr(ip, record.cidrMask === "/24" ? QuarantineStore.getSubnet24(record.ipAddress) : record.ipAddress)) {
        return { quarantined: true, record };
      }
    }

    return { quarantined: false };
  }

  public getAllActiveQuarantines(nowMs: number = Date.now()): QuarantineRecord[] {
    const active: QuarantineRecord[] = [];
    for (const record of this.quarantines.values()) {
      if (record.isActive && record.expiresAt > nowMs) {
        active.push(record);
      }
    }
    return active;
  }

  public getAllAllowlists(): AllowlistRecord[] {
    return Array.from(this.allowlist.values());
  }

  public pruneExpired(nowMs: number = Date.now()): number {
    let pruned = 0;
    for (const [id, record] of this.quarantines.entries()) {
      if (record.expiresAt <= nowMs) {
        this.quarantines.delete(id);
        pruned++;
      }
    }
    this.dbStore.pruneExpired(nowMs).catch(() => {});
    return pruned;
  }

  /**
   * Cold-start cache warming from database.
   */
  public async warmFromDatabase(nowMs: number = Date.now()): Promise<{ quarantinedCount: number; allowlistCount: number }> {
    const activeQuarantines = await this.dbStore.loadActiveQuarantines(nowMs);
    const activeAllowlist = await this.dbStore.loadActiveAllowlist();

    for (const q of activeQuarantines) {
      this.quarantines.set(q.id, q);
    }
    for (const a of activeAllowlist) {
      this.allowlist.set(a.ipAddress, a);
    }

    return {
      quarantinedCount: activeQuarantines.length,
      allowlistCount: activeAllowlist.length,
    };
  }

  public reset(): void {
    this.quarantines.clear();
    this.allowlist.clear();
  }
}
