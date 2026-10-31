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
    if (!tenantId) {
      throw new TenantIsolationError("tenantId is required");
    }
    const region = this.tenantRegionMap.get(tenantId);
    if (!region) {
      throw new TenantIsolationError(
        `Tenant '${tenantId}' has no region assignment. Register it before accessing.`
      );
    }
    return region;
  }

  public getTenantDb(tenantId: string): any {
    if (!this.enabled) {
      return this.defaultDb;
    }

    // FAIL CLOSED: require explicit region assignment
    const assignedRegion = this.getTenantRegion(tenantId);

    const pool = this.regionPools.get(assignedRegion);
    if (!pool) {
      throw new TenantIsolationError(
        `No database pool registered for region '${assignedRegion}' (tenant '${tenantId}')`
      );
    }

    return pool;
  }

  public validateIsolation(tenantId: string, targetRegion: TenantRegion): boolean {
    if (!this.enabled) return true;

    const assignedRegion = this.getTenantRegion(tenantId);

    // FAIL CLOSED: "default" is not a valid region — it's a sentinel for "unassigned"
    if (assignedRegion === "default" || targetRegion === "default") {
      throw new TenantIsolationError(
        `Tenant '${tenantId}' has no assigned region (got '${assignedRegion}'). ` +
        `Cross-region access requires explicit region assignment.`
      );
    }

    if (assignedRegion !== targetRegion) {
      throw new TenantIsolationError(
        `Cross-tenant partition access blocked: Tenant '${tenantId}' is assigned to '${assignedRegion}' ` +
        `but attempted access on '${targetRegion}'`
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
