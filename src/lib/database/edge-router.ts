import { db } from "../../db";
import { clusterNodes } from "../../db/schema";
import { eq, and } from "drizzle-orm";

// In-memory routing topology cache to bypass constant DB lookups on edge
let cachedTopology: Array<{ role: string; endpoint: string; isHealthy: boolean; replicationLagMs: number }> = [];
let lastFetchedTopology = 0;

/**
 * Dynamically resolves database connection query paths for geographically closest replicas.
 * Automatically fails back to primary node if Standby replica lag exceeds thresholds.
 */
export async function routeDatabaseQuery(
  region: string,
  isWriteOperation: boolean,
  lagLimitMs = 2000
): Promise<string> {
  // 1. Write operations MUST always go to the Primary Node
  if (isWriteOperation) {
    const primary = await getPrimaryEndpoint();
    return primary;
  }

  // 2. Fetch and cache node topologies
  const now = Date.now();
  if (cachedTopology.length === 0 || now - lastFetchedTopology > 5000) {
    try {
      const records = await db.select().from(clusterNodes);
      if (records.length === 0) {
        cachedTopology = getMockTopology();
      } else {
        cachedTopology = records.map((r) => ({
          role: r.role,
          endpoint: r.endpoint,
          isHealthy: !!r.isHealthy,
          replicationLagMs: r.replicationLagMs,
        }));
      }
      lastFetchedTopology = now;
    } catch {
      // Fallback in standalone test runs
      if (cachedTopology.length === 0) {
        cachedTopology = getMockTopology();
      }
    }
  }

  // 3. Filter healthy replicas
  const replicas = cachedTopology.filter(
    (n) => n.role === "READ_REPLICA" && n.isHealthy && n.replicationLagMs <= lagLimitMs
  );

  if (replicas.length === 0) {
    // If no replicas are healthy or replication lag is too high, fallback to primary node
    return getPrimaryEndpoint();
  }

  // Select closest replica matching region (mock geographic routing resolution)
  if (region === "EU" && replicas.some((r) => r.endpoint.includes("eu"))) {
    return replicas.find((r) => r.endpoint.includes("eu"))!.endpoint;
  }

  // Default to first available healthy replica
  return replicas[0].endpoint;
}

async function getPrimaryEndpoint(): Promise<string> {
  const primaryNode = cachedTopology.find((n) => n.role === "PRIMARY" && n.isHealthy);
  if (primaryNode) return primaryNode.endpoint;

  // Fallback default
  return "postgresql://primary-db.thaibahive.local:5432/main";
}

function getMockTopology() {
  return [
    {
      role: "PRIMARY",
      endpoint: "postgresql://primary-db.thaibahive.local:5432/main",
      isHealthy: true,
      replicationLagMs: 0,
    },
    {
      role: "READ_REPLICA",
      endpoint: "postgresql://us-replica.thaibahive.local:5432/main",
      isHealthy: true,
      replicationLagMs: 100,
    },
    {
      role: "READ_REPLICA",
      endpoint: "postgresql://eu-replica.thaibahive.local:5432/main",
      isHealthy: true,
      replicationLagMs: 1500,
    },
  ];
}

export function clearTopologyCache() {
  cachedTopology = [];
  lastFetchedTopology = 0;
}
