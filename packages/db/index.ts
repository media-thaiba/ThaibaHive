import * as sqliteSchema from "./schema";
import * as pgSchema from "./schema.pg";

import { drizzle as sqliteDrizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ReplicaQueryRouter } from "./replica-router";
import { TenantRouter } from "./tenant-router";

export * from "./schema";
export * from "drizzle-orm";
export * from "./replica-router";
export * from "./tenant-router";

export const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
export const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

export function logSlowQuery(op: string, durationMs: number) {
  if (durationMs > 500) {
    console.warn(`[SLOW_QUERY] ${op} took ${durationMs.toFixed(2)}ms (>500ms threshold)`);
  }
}

let dbInstance: any;
const replicaInstances: any[] = [];
const replicaUrls: string[] = [];

if (isPostgres) {
  console.log("[@thaiba/db] Initializing database in PostgreSQL mode");
  
  // Primary connection pool
  const pool = new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const pgDb = pgDrizzle(pool, { schema: pgSchema });
  dbInstance = wrapPgDb(pgDb);

  // Parse replica URLs if configured (e.g. DB_REPLICA_URLS="postgres://...,postgres://...")
  const envReplicaUrls = (process.env.DB_REPLICA_URLS || "").split(",").map(u => u.trim()).filter(Boolean);
  for (const rUrl of envReplicaUrls) {
    try {
      const replicaPool = new Pool({
        connectionString: rUrl,
        max: process.env.NODE_ENV === "production" ? 10 : 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      const repPg = pgDrizzle(replicaPool, { schema: pgSchema });
      replicaInstances.push(wrapPgDb(repPg));
      replicaUrls.push(rUrl);
    } catch (e) {
      console.warn("[@thaiba/db] Failed to initialize replica pool:", rUrl, e);
    }
  }
} else {
  console.log("[@thaiba/db] Initializing database in SQLite/LibSQL mode");
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  client.execute("PRAGMA foreign_keys = ON;").catch((e) => console.error("Failed to enable foreign keys:", e));
  client.execute("PRAGMA busy_timeout = 15000;").catch((e) => console.error("Failed to set busy timeout:", e));
  client.execute(`
    CREATE TABLE IF NOT EXISTS audit_merkle_roots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      root_hash TEXT NOT NULL,
      start_audit_id TEXT,
      end_audit_id TEXT,
      leaf_count INTEGER NOT NULL DEFAULT 0,
      tree_depth INTEGER NOT NULL DEFAULT 0,
      signature TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `).catch(() => {});
  client.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload TEXT,
      previous_hash TEXT,
      current_hash TEXT NOT NULL,
      merkle_root_id TEXT,
      merkle_proof TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `).catch(() => {});
  client.execute(`
    CREATE TABLE IF NOT EXISTS compliance_violations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      rule_id TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'MEDIUM',
      actor_id TEXT,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      resolution_notes TEXT,
      resolved_by TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `).catch(() => {});
  client.execute(`
    CREATE TABLE IF NOT EXISTS forensic_snapshots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      snapshot_type TEXT NOT NULL DEFAULT 'SCHEDULED',
      storage_uri TEXT NOT NULL,
      checksum_sha256 TEXT NOT NULL,
      signature TEXT,
      signer_public_key TEXT,
      entity_counts TEXT,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      retention_tier TEXT NOT NULL DEFAULT 'HOT',
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `).catch(() => {});
  dbInstance = sqliteDrizzle(client, { schema: sqliteSchema });

  // Optional LibSQL read replicas
  const envReplicaUrls = (process.env.DB_REPLICA_URLS || "").split(",").map(u => u.trim()).filter(Boolean);
  for (const rUrl of envReplicaUrls) {
    try {
      const repClient = createClient({
        url: rUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      });
      replicaInstances.push(sqliteDrizzle(repClient, { schema: sqliteSchema }));
      replicaUrls.push(rUrl);
    } catch (e) {
      console.warn("[@thaiba/db] Failed to initialize replica client:", rUrl, e);
    }
  }
}

// Global Replica Router instance
export const replicaRouter = new ReplicaQueryRouter(dbInstance, replicaInstances, {
  primaryUrl: databaseUrl,
  replicaUrls,
  enabled: process.env.DB_READ_REPLICAS_ENABLED !== "false" && replicaInstances.length > 0,
  sessionStickinessTtlMs: 2000,
});

// Global Multi-Tenant Router instance
export const tenantRouter = new TenantRouter(dbInstance, {
  defaultRegion: "default",
  enabled: process.env.TENANT_GEO_ROUTING_ENABLED !== "false",
});

// Helper router exports
export function getReadDb(sessionId?: string): ReturnType<typeof sqliteDrizzle> {
  return replicaRouter.getReadDb(sessionId);
}

export function getWriteDb(sessionId?: string): ReturnType<typeof sqliteDrizzle> {
  return replicaRouter.getWriteDb(sessionId);
}

export function getTenantDb(tenantId: string): ReturnType<typeof sqliteDrizzle> {
  return tenantRouter.getTenantDb(tenantId);
}

// Export the db client typed as SQLite client to keep typescript check happy with .get(), .all(), .run()
export const db = dbInstance as ReturnType<typeof sqliteDrizzle>;

// Helper to wrap PostgreSQL Drizzle client to shim SQLite's .get(), .all(), and .run() APIs
export function wrapPgDb(pgDb: any): any {
  return new Proxy(pgDb, {
    get(target: any, prop: string | symbol, receiver: any): any {
      const val = Reflect.get(target, prop, receiver);

      if (typeof val === "function" && ["select", "insert", "update", "delete"].includes(prop as string)) {
        return function(...args: any[]) {
          const builder = val.apply(target, args);
          return wrapBuilder(builder);
        };
      }

      if (prop === "transaction") {
        return function(callback: (tx: any) => Promise<any>, config: any) {
          return val.call(target, async (tx: any) => {
            const wrappedTx = wrapPgDb(tx);
            return callback(wrappedTx);
          }, config);
        };
      }

      return val;
    }
  });
}

function wrapBuilder(builder: any): any {
  return new Proxy(builder, {
    get(target: any, prop: string | symbol, receiver: any): any {
      if (prop === "get") {
        return function() {
          return target.then((res: any) => {
            return Array.isArray(res) ? res[0] : (res?.rows ? res.rows[0] : undefined);
          });
        };
      }

      if (prop === "all") {
        return function() {
          return target.then((res: any) => {
            return Array.isArray(res) ? res : (res?.rows ? res.rows : []);
          });
        };
      }

      if (prop === "run") {
        return function() {
          return target.then((res: any) => {
            return {
              changes: res?.rowCount ?? 0,
              lastInsertRowid: undefined,
            };
          });
        };
      }

      const val = Reflect.get(target, prop, receiver);
      if (typeof val === "function") {
        return function(...args: any[]) {
          const result = val.apply(target, args);
          if (result && (typeof result === "object" || typeof result === "function")) {
            return wrapBuilder(result);
          }
          return result;
        };
      }

      return val;
    }
  });
}
