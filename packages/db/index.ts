import * as sqliteSchema from "./schema";
import * as pgSchema from "./schema.pg";

import { drizzle as sqliteDrizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { getTableColumns, isTable } from "drizzle-orm";
import { Pool } from "pg";
import { ReplicaQueryRouter } from "./replica-router";
import { TenantRouter } from "./tenant-router";

export * from "./schema";
export * from "drizzle-orm";
export * from "./replica-router";
export * from "./tenant-router";

const rawDatabaseUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "file:./dev.db").trim().replace(/^["']|["']$/g, "");
export const databaseUrl = rawDatabaseUrl;
export const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

if (process.env.NODE_ENV === "production" && !isPostgres && process.env.REQUIRE_POSTGRES === "true") {
  throw new Error(
    "[@thaiba/db] FATAL: Production requires a real DATABASE_URL (postgres://...). " +
    `Got fallback "${databaseUrl}". Set DATABASE_URL or POSTGRES_URL.`
  );
}

/**
 * Ensures column mappers on exported schema tables work seamlessly in both
 * SQLite and PostgreSQL modes (prevents SQLite 1/0 boolean coercion and
 * double JSON.parse on PostgreSQL jsonb columns, plus syncs dialect column names).
 */
const originalColMeta = new WeakMap<object, { name: string; mapToDriverValue?: any; mapFromDriverValue?: any }>();

export function syncSchemaColumnMappers(forPostgres: boolean = isPostgres): void {
  const sqliteEntries = Object.entries(sqliteSchema);
  const pgRecord = pgSchema as Record<string, unknown>;

  for (const [tableKey, sqliteTableVal] of sqliteEntries) {
    if (!isTable(sqliteTableVal)) continue;
    const sqliteCols = getTableColumns(sqliteTableVal) as Record<string, any>;
    const pgTableVal = pgRecord[tableKey];
    const pgCols = pgTableVal && isTable(pgTableVal) ? (getTableColumns(pgTableVal) as Record<string, any>) : null;

    for (const [colKey, sqliteCol] of Object.entries(sqliteCols)) {
      if (!sqliteCol) continue;

      if (!originalColMeta.has(sqliteCol)) {
        originalColMeta.set(sqliteCol, {
          name: sqliteCol.name,
          mapToDriverValue: sqliteCol.mapToDriverValue,
          mapFromDriverValue: sqliteCol.mapFromDriverValue,
        });
      }
      const original = originalColMeta.get(sqliteCol)!;

      // Always make JSON column mapFromDriverValue resilient to pre-parsed objects (PG jsonb or in-memory)
      if (sqliteCol.columnType === "SQLiteTextJson") {
        sqliteCol.mapFromDriverValue = (value: unknown): unknown => {
          if (value === null || value === undefined) return value;
          if (typeof value === "string") {
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          }
          return value;
        };
      }

      if (forPostgres) {
        const pgCol = pgCols?.[colKey];
        if (pgCol && typeof pgCol.name === "string" && pgCol.name !== sqliteCol.name) {
          sqliteCol.name = pgCol.name;
        }
        if (sqliteCol.columnType === "SQLiteBoolean") {
          sqliteCol.mapToDriverValue = (value: unknown): boolean => Boolean(value);
          sqliteCol.mapFromDriverValue = (value: unknown): boolean =>
            value === true || value === 1 || value === "1" || value === "true" || value === "t";
        } else if (sqliteCol.columnType === "SQLiteTextJson") {
          sqliteCol.mapToDriverValue = (value: unknown): unknown =>
            typeof value === "string" ? value : JSON.stringify(value);
        }
      } else {
        sqliteCol.name = original.name;
        sqliteCol.mapToDriverValue = original.mapToDriverValue;
        if (sqliteCol.columnType !== "SQLiteTextJson") {
          sqliteCol.mapFromDriverValue = original.mapFromDriverValue;
        }
      }
    }
  }
}

syncSchemaColumnMappers(isPostgres);

export function logSlowQuery(op: string, durationMs: number) {
  if (durationMs > 500) {
    console.warn(`[SLOW_QUERY] ${op} took ${durationMs.toFixed(2)}ms (>500ms threshold)`);
  }
}

let dbInstance: any;
export let rawPgDb: any = null;
const replicaInstances: any[] = [];
const replicaUrls: string[] = [];

export interface PgPoolOptions {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statement_timeout?: number;
  lock_timeout?: number;
  idle_in_transaction_session_timeout?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export function getPgPoolConfig(connStr: string = databaseUrl): PgPoolOptions {
  let max = 3;
  if (process.env.DB_POOL_MAX) {
    max = parseInt(process.env.DB_POOL_MAX, 10);
  } else if (process.env.VERCEL) {
    // Serverless lambdas: pool size = 3 to prevent exhausting pooler connections
    max = 3;
  } else if (process.env.NODE_ENV === "production") {
    max = 10;
  } else {
    max = 3;
  }

  let ssl: boolean | { rejectUnauthorized: boolean } | undefined;
  const isSupabaseHost =
    connStr.includes("supabase.co") || connStr.includes("pooler.supabase.com");

  if (process.env.DB_SSL === "false") {
    ssl = false;
  } else if (isSupabaseHost) {
    ssl = {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
    };
  } else if (process.env.DB_SSL === "true" || process.env.NODE_ENV === "production") {
    ssl = {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
    };
  }

  const statementTimeout = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || "10000", 10);
  const lockTimeout = parseInt(process.env.DB_LOCK_TIMEOUT_MS || "5000", 10);
  const idleInTxTimeout = parseInt(process.env.DB_IDLE_IN_TX_TIMEOUT_MS || "30000", 10);

  return {
    connectionString: connStr,
    max,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || "10000", 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || "5000", 10),
    statement_timeout: statementTimeout,
    lock_timeout: lockTimeout,
    idle_in_transaction_session_timeout: idleInTxTimeout,
    ...(ssl !== undefined ? { ssl } : {}),
  };
}

if (isPostgres) {
  console.log("[@thaiba/db] Initializing database in PostgreSQL mode");
  
  // Primary connection pool
  const pool = new Pool(getPgPoolConfig(databaseUrl));
  pool.on("error", (err) => {
    console.error("[@thaiba/db] Critical idle PostgreSQL pool client error:", err);
  });

  const pgDb = pgDrizzle(pool, { schema: pgSchema });
  rawPgDb = pgDb;
  dbInstance = wrapPgDb(pgDb);

  // Parse replica URLs if configured (e.g. DB_REPLICA_URLS="postgres://...,postgres://...")
  const envReplicaUrls = (process.env.DB_REPLICA_URLS || "").split(",").map(u => u.trim()).filter(Boolean);
  for (const rUrl of envReplicaUrls) {
    try {
      const replicaPool = new Pool(getPgPoolConfig(rUrl));
      replicaPool.on("error", (err) => {
        console.error("[@thaiba/db] Critical idle PostgreSQL replica pool client error:", err);
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
  // PRAGMA busy_timeout and foreign_keys are only applicable to local file databases;
  // remote LibSQL (Turso) over HTTP/WS rejects PRAGMA busy_timeout with SQL_PARSE_ERROR.
  const isLocalFileDb = databaseUrl.startsWith("file:") || !databaseUrl.includes("://");
  if (isLocalFileDb) {
    void client.execute("PRAGMA foreign_keys = ON;").catch((err) => {
      console.error(`[@thaiba/db] Fatal LibSQL startup error: PRAGMA foreign_keys = ON failed: ${err?.message || err}`);
      if (typeof process !== "undefined" && typeof process.exit === "function") {
        process.exit(1);
      }
    });
    void client.execute("PRAGMA busy_timeout = 15000;").catch((err) => {
      console.error(`[@thaiba/db] Fatal LibSQL startup error: PRAGMA busy_timeout = 15000 failed: ${err?.message || err}`);
      if (typeof process !== "undefined" && typeof process.exit === "function") {
        process.exit(1);
      }
    });
  }
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
  sessionStickinessTtlMs: parseInt(process.env.DB_SESSION_STICKINESS_TTL_MS || "30000", 10),
  maxLagMs: parseInt(process.env.DB_REPLICA_MAX_LAG_MS || "2000", 10),
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
      if (prop === "all") {
        return async function(query: any) {
          const res = await target.execute(query);
          return Array.isArray(res) ? res : (res?.rows ? res.rows : []);
        };
      }

      if (prop === "get") {
        return async function(query: any) {
          const res = await target.execute(query);
          const rows = Array.isArray(res) ? res : (res?.rows ? res.rows : []);
          return rows[0];
        };
      }

      if (prop === "run") {
        return async function(query: any) {
          const res = await target.execute(query);
          return { changes: res?.rowCount ?? 0 };
        };
      }

      if (prop === "execute") {
        return async function(query: any) {
          if (query && typeof query === "object" && typeof query.sql === "string") {
            const args = query.args || [];
            let idx = 0;
            const pgSql = query.sql.replace(/\?/g, () => `$${++idx}`);
            const pool = (pgDb as any).session?.client || (pgDb as any).client || pgDb;
            if (typeof pool?.query === "function") {
              const res = await pool.query(pgSql, args);
              return { rows: res.rows || [] };
            }
          }
          return target.execute(query);
        };
      }

      const val = Reflect.get(target, prop, receiver);
      if (typeof val === "function" && ((val as any).mock || (val as any)._isMockFunction)) {
        return val;
      }

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
            const rows = Array.isArray(res) ? res : (res?.rows ? res.rows : []);
            const lastId = rows[0]?.id ?? undefined;
            return {
              changes: res?.rowCount ?? 0,
              lastInsertRowid: lastId,
            };
          });
        };
      }

      const val = Reflect.get(target, prop, receiver);
      if (typeof val === "function") {
        return function(...args: any[]) {
          const result = val.apply(target, args);
          if (result && typeof result === "object" && typeof result.then === "function") {
            return wrapBuilder(result);
          }
          return result;
        };
      }

      return val;
    }
  });
}
