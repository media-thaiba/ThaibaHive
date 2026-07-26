import * as sqliteSchema from "./schema";
import * as pgSchema from "./schema.pg";

import { drizzle as sqliteDrizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export * from "./schema";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any;

if (isPostgres) {
  console.log("[@thaiba/db] Initializing database in PostgreSQL mode");
  
  // Use connection pooling. Target Supabase pooler if configured.
  const pool = new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === "production" ? 10 : 3, // Safe limits for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const pgDb = pgDrizzle(pool, { schema: pgSchema });

  dbInstance = wrapPgDb(pgDb);
} else {
  console.log("[@thaiba/db] Initializing database in SQLite/LibSQL mode");
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  client.execute("PRAGMA foreign_keys = ON;").catch((e) => console.error("Failed to enable foreign keys:", e));
  dbInstance = sqliteDrizzle(client, { schema: sqliteSchema });
}

// Export the db client typed as SQLite client to keep typescript check happy with .get(), .all(), .run()
export const db = dbInstance as ReturnType<typeof sqliteDrizzle>;

// Helper to wrap PostgreSQL Drizzle client to shim SQLite's .get(), .all(), and .run() APIs
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic interception proxy bridges Node/PostgreSQL and SQLite query methods
function wrapPgDb(pgDb: any): any {
  return new Proxy(pgDb, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(target: any, prop: string | symbol, receiver: any): any {
      const val = Reflect.get(target, prop, receiver);

      if (typeof val === "function" && ["select", "insert", "update", "delete"].includes(prop as string)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return function(...args: any[]) {
          const builder = val.apply(target, args);
          return wrapBuilder(builder);
        };
      }

      if (prop === "transaction") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return function(callback: (tx: any) => Promise<any>, config: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic interception proxy bridges Node/PostgreSQL and SQLite query methods
function wrapBuilder(builder: any): any {
  return new Proxy(builder, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(target: any, prop: string | symbol, receiver: any): any {
      if (prop === "get") {
        return function() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return target.then((res: any) => {
            return Array.isArray(res) ? res[0] : (res?.rows ? res.rows[0] : undefined);
          });
        };
      }

      if (prop === "all") {
        return function() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return target.then((res: any) => {
            return Array.isArray(res) ? res : (res?.rows ? res.rows : []);
          });
        };
      }

      if (prop === "run") {
        return function() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
