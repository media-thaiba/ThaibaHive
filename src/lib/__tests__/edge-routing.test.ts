import { routeDatabaseQuery, clearTopologyCache } from "../database/edge-router";
import { EdgeConnectionPool } from "../database/edge-pool";
import { db, clusterNodes } from "@thaiba/db";

describe("Phase 4: Edge Database Query Routing & Connection Pooling Tests", () => {
  beforeEach(async () => {
    clearTopologyCache();
    try {
      await db.delete(clusterNodes).run();
    } catch {
      // Fail-silent
    }
  });

  describe("Dynamic Geolocation Query Router", () => {
    it("should route write operations directly to primary node endpoint", async () => {
      const endpoint = await routeDatabaseQuery("US", true); // isWrite = true
      expect(endpoint).toBe("postgresql://primary-db.thaibahive.local:5432/main");
    });

    it("should route read operations to closest region replica when healthy", async () => {
      const endpoint = await routeDatabaseQuery("EU", false); // isWrite = false
      expect(endpoint).toBe("postgresql://eu-replica.thaibahive.local:5432/main");
    });

    it("should fallback to primary node if replication lag exceeds threshold limit", async () => {
      // Set very tight lag limit of 50ms. Since all replicas have higher lag, it should fallback to primary.
      const endpoint = await routeDatabaseQuery("EU", false, 50); 
      expect(endpoint).toBe("postgresql://primary-db.thaibahive.local:5432/main");
    });
  });

  describe("Edge Connection Pooler", () => {
    it("should acquire, track connection counts, and release them", async () => {
      const pool = new EdgeConnectionPool(3); // Max connections: 3
      const node = "postgresql://us-replica.thaibahive.local:5432/main";

      await pool.acquireConnection(node);
      await pool.acquireConnection(node);
      expect(pool.getPoolSize(node)).toBe(2);

      await pool.releaseConnection(node);
      expect(pool.getPoolSize(node)).toBe(1);
    });

    it("should throw error if connection count exceeds maximum capacity limit", async () => {
      const pool = new EdgeConnectionPool(2);
      const node = "postgresql://us-replica.thaibahive.local:5432/main";

      await pool.acquireConnection(node);
      await pool.acquireConnection(node);

      await expect(pool.acquireConnection(node)).rejects.toThrow("Edge Connection Exhausted");
    });
  });
});
