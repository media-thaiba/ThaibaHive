import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const isProd = process.env.NODE_ENV === "production";

const databaseUrl = process.env.DATABASE_URL;

if (isProd && !databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required in production");
}

let client: ReturnType<typeof createClient>;

client = createClient({
  url: databaseUrl || "file:./dev.db",
});

// Enable WAL mode for SQLite to prevent lockouts during concurrent reads/writes
if (!isProd || databaseUrl?.startsWith("file:")) {
  client.execute("PRAGMA journal_mode=WAL").catch(() => {
    // Ignore errors for non-SQLite drivers (e.g., PostgreSQL)
  });
}

export const db = drizzle(client, { schema });
export const tables = schema;
