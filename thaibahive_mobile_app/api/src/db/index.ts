import { drizzle as sqliteDrizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as sqliteSchema from "./schema";

import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as pgSchema from "./schema.pg";

const isProd = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

if (isProd && !databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required in production");
}

const isPostgres = databaseUrl?.startsWith("postgres://") || databaseUrl?.startsWith("postgresql://");

let dbInstance: any;
let exportSchema: any;

if (isPostgres) {
  console.log("[Mobile API DB] Initializing PostgreSQL client connection pool");
  const pool = new Pool({
    connectionString: databaseUrl,
    max: isProd ? 15 : 3, // Persistent VM server limits
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const pgDb = pgDrizzle(pool, { schema: pgSchema });

  dbInstance = wrapPgDb(pgDb);
  exportSchema = pgSchema;
} else {
  console.log("[Mobile API DB] Initializing LibSQL/SQLite client");
  const client = createClient({
    url: databaseUrl || "file:./dev.db",
  });

  // Enable WAL mode for SQLite to prevent lockouts during concurrent reads/writes
  if (!isProd || databaseUrl?.startsWith("file:")) {
    client.execute("PRAGMA journal_mode=WAL").catch(() => {
      // Ignore errors for non-SQLite drivers
    });
  }

  dbInstance = sqliteDrizzle(client, { schema: sqliteSchema });
  exportSchema = sqliteSchema;
}

export const db = dbInstance as ReturnType<typeof sqliteDrizzle>;
export const tables = exportSchema;

// Helper to wrap PostgreSQL Drizzle client to shim SQLite's .get(), .all(), and .run() APIs
function wrapPgDb(pgDb: any): any {
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
          if (result && typeof result.then === "function") {
            return wrapBuilder(result);
          }
          return result;
        };
      }

      return val;
    }
  });
}
