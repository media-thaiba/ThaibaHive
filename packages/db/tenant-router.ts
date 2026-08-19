/**
 * Global Multi-Tenant Cross-Region Database Router & Isolation Gate
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

export type TenantRegion = "us-east" | "eu-central" | "ap-south" | "default";

export class TenantIsolationError extends Error {
  constructor(message: string) {
    super(`[TenantIsolationViolation] ${message}`);
    this.name = "TenantIsolationError";
  }
}

export interface TenantRoutingConfig {
  defaultRegion: TenantRegion;
  enabled: boolean;
}

export class TenantRouter {
  private defaultDb: any;
  private regionPools: Map<TenantRegion, any> = new Map();
  private tenantRegionMap: Map<string, TenantRegion> = new Map();
  private enabled: boolean;
  private defaultRegion: TenantRegion;

  constructor(defaultDb: any, config: Partial<TenantRoutingConfig> = {}) {
    this.defaultDb = defaultDb;
    this.enabled = config.enabled ?? (process.env.TENANT_GEO_ROUTING_ENABLED !== "false");
    this.defaultRegion = config.defaultRegion || "default";
    this.regionPools.set("default", defaultDb);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public registerRegionPool(region: TenantRegion, poolDb: any): void {
    this.regionPools.set(region, poolDb);
  }

  public getRegionPool(region: TenantRegion): any {
    return this.regionPools.get(region) || this.defaultDb;
  }

  public registerTenantRegion(tenantId: string, region: TenantRegion): void {
    if (!tenantId) throw new Error("tenantId is required");
    this.tenantRegionMap.set(tenantId, region);
  }

  public getTenantRegion(tenantId: string): TenantRegion {
    if (!tenantId) return this.defaultRegion;
    return this.tenantRegionMap.get(tenantId) || this.defaultRegion;
  }

  public getTenantDb(tenantId: string): any {
    if (!this.enabled) {
      return this.defaultDb;
    }

    const region = this.getTenantRegion(tenantId);
    const pool = this.regionPools.get(region);

    if (!pool) {
      // Fallback to default pool if regional pool is not explicitly registered
      return this.defaultDb;
    }

    return pool;
  }

  public validateIsolation(tenantId: string, targetRegion: TenantRegion): boolean {
    if (!this.enabled) return true;
    const assignedRegion = this.getTenantRegion(tenantId);
    if (assignedRegion !== targetRegion && targetRegion !== "default" && assignedRegion !== "default") {
      throw new TenantIsolationError(
        `Cross-tenant partition access blocked: Tenant '${tenantId}' is assigned to '${assignedRegion}' but attempted access on '${targetRegion}'`
      );
    }
    return true;
  }

  public migrateTenantRegion(tenantId: string, newRegion: TenantRegion): {
    tenantId: string;
    previousRegion: TenantRegion;
    newRegion: TenantRegion;
    migratedAt: string;
  } {
    const previousRegion = this.getTenantRegion(tenantId);
    this.tenantRegionMap.set(tenantId, newRegion);

    return {
      tenantId,
      previousRegion,
      newRegion,
      migratedAt: new Date().toISOString(),
    };
  }

  public getAllTenantMappings(): Record<string, TenantRegion> {
    const result: Record<string, TenantRegion> = {};
    for (const [tenantId, region] of this.tenantRegionMap.entries()) {
      result[tenantId] = region;
    }
    return result;
  }
}
