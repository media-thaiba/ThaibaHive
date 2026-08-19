import { MeshNodeHealth } from "./types";

export class RegionHealthManager {
  private nodes: Map<string, MeshNodeHealth> = new Map();

  constructor(initialNodes: MeshNodeHealth[] = []) {
    for (const n of initialNodes) {
      this.nodes.set(n.regionId, { ...n });
    }
  }

  public registerNode(node: MeshNodeHealth): void {
    this.nodes.set(node.regionId, { ...node });
  }

  public updateHeartbeat(regionId: string, latencyMs: number, status: "ONLINE" | "DEGRADED" | "OFFLINE" = "ONLINE"): void {
    const existing = this.nodes.get(regionId);
    if (existing) {
      existing.latencyMs = latencyMs;
      existing.status = status;
      existing.lastHeartbeat = Date.now();
    } else {
      this.nodes.set(regionId, {
        regionId,
        nodeName: `Node-${regionId}`,
        endpoint: `https://${regionId}.api.thaibahive.org`,
        status,
        latencyMs,
        lastHeartbeat: Date.now(),
      });
    }
  }

  public getNodeHealth(regionId: string): MeshNodeHealth | undefined {
    return this.nodes.get(regionId);
  }

  public getAllNodes(): MeshNodeHealth[] {
    return Array.from(this.nodes.values());
  }

  public getHealthyNodes(): MeshNodeHealth[] {
    const now = Date.now();
    return Array.from(this.nodes.values()).filter((n) => {
      const isFresh = now - n.lastHeartbeat <= 15000; // 15s heartbeat window
      return (n.status === "ONLINE" || n.status === "DEGRADED") && isFresh;
    });
  }

  public selectBestNode(preferredRegionId?: string): MeshNodeHealth | null {
    const healthy = this.getHealthyNodes();
    if (healthy.length === 0) return null;

    if (preferredRegionId) {
      const preferred = healthy.find((n) => n.regionId === preferredRegionId && n.status === "ONLINE");
      if (preferred) return preferred;
    }

    // Sort by lowest latency
    healthy.sort((a, b) => a.latencyMs - b.latencyMs);
    return healthy[0];
  }
}
