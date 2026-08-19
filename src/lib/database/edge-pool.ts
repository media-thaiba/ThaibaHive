/**
 * Connection pool agent optimized for edge worker invocations.
 * Manages database socket re-use across short-lived edge operations.
 */
export class EdgeConnectionPool {
  private activePools = new Map<string, { connections: number; lastUsed: number }>();
  private maxConnectionsPerNode: number;

  constructor(maxConnections = 5) {
    this.maxConnectionsPerNode = maxConnections;
  }

  /**
   * Acquires a database connection for a specific node endpoint.
   */
  async acquireConnection(endpoint: string): Promise<boolean> {
    let pool = this.activePools.get(endpoint);

    if (!pool) {
      pool = { connections: 0, lastUsed: Date.now() };
      this.activePools.set(endpoint, pool);
    }

    if (pool.connections >= this.maxConnectionsPerNode) {
      throw new Error(`Edge Connection Exhausted: max connections (${this.maxConnectionsPerNode}) reached for node ${endpoint}`);
    }

    pool.connections += 1;
    pool.lastUsed = Date.now();
    return true;
  }

  /**
   * Releases a connection back to the pool.
   */
  async releaseConnection(endpoint: string): Promise<void> {
    const pool = this.activePools.get(endpoint);
    if (pool && pool.connections > 0) {
      pool.connections -= 1;
      pool.lastUsed = Date.now();
    }
  }

  /**
   * Recycles idle connection sockets.
   */
  recycleIdleConnections(idleTimeoutMs = 10000): void {
    const now = Date.now();
    this.activePools.forEach((pool, endpoint) => {
      if (pool.connections === 0 && now - pool.lastUsed > idleTimeoutMs) {
        this.activePools.delete(endpoint);
      }
    });
  }

  getPoolSize(endpoint: string): number {
    return this.activePools.get(endpoint)?.connections || 0;
  }

  clearPools() {
    this.activePools.clear();
  }
}

export const defaultEdgePool = new EdgeConnectionPool();
