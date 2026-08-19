/**
 * Database Connection Pool Configuration
 * Task P1-34: DB Connection Pooling for production PostgreSQL
 *
 * This file documents the pooling configuration and exports pool limits
 * for use in the Drizzle ORM production connection.
 *
 * Environment:
 * - Development (SQLite/LibSQL): No pooling needed
 * - Production (PostgreSQL/Supabase): Pool via pg or Supabase connection pooler
 *
 * Recommended production setup:
 * 1. Enable Supabase connection pooler (Transaction mode, port 6543)
 *    DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true
 *
 * 2. Or deploy PgBouncer alongside the app:
 *    - Pool mode: transaction
 *    - max_client_conn: 100
 *    - default_pool_size: 20
 *    - server_lifetime: 600
 *
 * 3. Or use Neon serverless with HTTP transport (no TCP pooling needed)
 *    DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb
 *
 * Pool Limits (adjust per instance count):
 */

export const DB_POOL_CONFIG = {
  /** Max simultaneous connections per Node.js instance */
  max: parseInt(process.env.DB_POOL_MAX ?? "10", 10),
  /** Min idle connections to maintain */
  min: parseInt(process.env.DB_POOL_MIN ?? "2", 10),
  /** Idle timeout before releasing connection (ms) */
  idleTimeoutMs: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? "60000", 10),
  /** Max time to wait for a connection from the pool (ms) */
  acquireTimeoutMs: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT_MS ?? "10000", 10),
};

/**
 * Returns pool config for pg/postgres drivers.
 * Pass to Drizzle ORM postgres() or Pool() constructor.
 */
export function getPoolConfig() {
  return {
    max: DB_POOL_CONFIG.max,
    min: DB_POOL_CONFIG.min,
    idleTimeoutMillis: DB_POOL_CONFIG.idleTimeoutMs,
    connectionTimeoutMillis: DB_POOL_CONFIG.acquireTimeoutMs,
  };
}
