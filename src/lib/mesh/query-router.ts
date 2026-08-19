import { RegionHealthManager } from "./region-health";
import { MeshNodeHealth } from "./types";

export interface QueryRouteRequest {
  tenantId: string;
  queryType: "READ" | "WRITE";
  entityName: string;
  preferredRegion?: string;
  bypassCache?: boolean;
}

export interface QueryRouteDecision {
  targetRegionId: string;
  endpoint: string;
  isCachedRead: boolean;
  routingLatencyMs: number;
  failoverApplied: boolean;
}

export class GlobalQueryRouter {
  private healthManager: RegionHealthManager;
  private primaryRegionByTenant: Map<string, string> = new Map();
  private readCache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor(healthManager: RegionHealthManager) {
    this.healthManager = healthManager;
  }

  public setTenantPrimaryRegion(tenantId: string, regionId: string): void {
    this.primaryRegionByTenant.set(tenantId, regionId);
  }

  public cacheQueryResult(key: string, data: any, ttlMs: number = 30000): void {
    this.readCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  public getCachedQueryResult(key: string): any | null {
    const cached = this.readCache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.readCache.delete(key);
      return null;
    }
    return cached.data;
  }

  public routeQuery(req: QueryRouteRequest): QueryRouteDecision {
    const startTime = Date.now();
    const primaryRegion = this.primaryRegionByTenant.get(req.tenantId) || req.preferredRegion || "us-east";

    if (req.queryType === "WRITE") {
      // WRITE queries always go to primary region or best healthy primary
      const primaryHealth = this.healthManager.getNodeHealth(primaryRegion);
      let targetNode: MeshNodeHealth | null = null;
      let failoverApplied = false;

      if (primaryHealth && primaryHealth.status === "ONLINE") {
        targetNode = primaryHealth;
      } else {
        targetNode = this.healthManager.selectBestNode();
        failoverApplied = true;
      }

      if (!targetNode) {
        throw new Error(`No healthy database node available for WRITE query on tenant ${req.tenantId}`);
      }

      return {
        targetRegionId: targetNode.regionId,
        endpoint: targetNode.endpoint,
        isCachedRead: false,
        routingLatencyMs: Date.now() - startTime,
        failoverApplied,
      };
    } else {
      // READ queries can go to nearest healthy node / replica
      let targetNode = this.healthManager.selectBestNode(req.preferredRegion || primaryRegion);
      let failoverApplied = false;

      if (!targetNode) {
        targetNode = this.healthManager.selectBestNode();
        failoverApplied = true;
      }

      if (!targetNode) {
        throw new Error(`No healthy database node available for READ query on tenant ${req.tenantId}`);
      }

      return {
        targetRegionId: targetNode.regionId,
        endpoint: targetNode.endpoint,
        isCachedRead: false,
        routingLatencyMs: Date.now() - startTime,
        failoverApplied: targetNode.regionId !== primaryRegion,
      };
    }
  }
}
