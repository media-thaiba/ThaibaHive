import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { migrate as pgMigrate } from "drizzle-orm/node-postgres/migrator";
import { db, rawPgDb, isPostgres } from "../../packages/db";

function getEnvUrl(): { url: string; authToken?: string } {
  let url = process.env.DATABASE_URL || "";
  let authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url && fs.existsSync(".env")) {
    for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
      if (l.startsWith("DATABASE_URL=")) url = l.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
      if (l.startsWith("DATABASE_AUTH_TOKEN=")) authToken = l.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
    }
  }

  return { url: url || "file:./dev.db", authToken };
}

export async function runMigrations() {
  if (isPostgres) {
    console.log("[db:migrate] Running PostgreSQL migrations from ./drizzle/postgres...");
    await pgMigrate(rawPgDb || (db as any), { migrationsFolder: "./drizzle/postgres" });
  } else {
    const { url, authToken } = getEnvUrl();
    console.log(`[db:migrate] Applying SQLite/LibSQL migrations from ./drizzle to ${url.split("@").pop()}...`);
    const client = createClient({ url, authToken });

    // In SQLite, foreign key checks must be disabled during DDL table rebuilds
    await client.execute("PRAGMA foreign_keys = OFF");

    // Ensure migration tracking table exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "__drizzle_applied_migrations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL UNIQUE,
        "applied_at" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `);

    const appliedRes = await client.execute("SELECT name FROM __drizzle_applied_migrations");
    const appliedSet = new Set(appliedRes.rows.map(r => r.name as string));

    const drizzleDir = path.resolve(process.cwd(), "drizzle");
    const migrationFiles = fs.readdirSync(drizzleDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    let appliedCount = 0;
    for (const file of migrationFiles) {
      if (appliedSet.has(file)) continue;

      const rawSql = fs.readFileSync(path.join(drizzleDir, file), "utf8");
      const stmts = rawSql
        .split("--> statement-breakpoint")
        .map(s => s.trim())
        .filter(Boolean);

      console.log(`[db:migrate] Applying ${file} (${stmts.length} statements)...`);

      // Transactional execution per migration file
      const tx = await client.transaction("write");
      try {
        for (const stmt of stmts) {
          try {
            await tx.execute(stmt);
          } catch (err: any) {
            // Strict idempotency check: only allow re-running already existing objects
            const isIdempotentSkip =
              err.message?.includes("already exists") ||
              err.message?.includes("duplicate column") ||
              err.message?.includes("columns are not unique");

            if (isIdempotentSkip) {
              console.warn(`[db:migrate] ℹ️ Idempotent skip in ${file}: ${err.message.slice(0, 80)}`);
            } else {
              // Fail hard on real errors (like 'no such table', syntax error, etc.)
              console.error(`[db:migrate] ❌ Error executing statement in ${file}:`, stmt);
              throw err;
            }
          }
        }

        await tx.execute({
          sql: "INSERT OR IGNORE INTO __drizzle_applied_migrations (name) VALUES (?)",
          args: [file],
        });

        await tx.commit();
        appliedCount++;
        console.log(`[db:migrate] ✅ ${file} applied and committed.`);
      } catch (err) {
        await tx.rollback();
        console.error(`[db:migrate] Rolled back ${file} due to failure.`);
        throw err;
      } finally {
        tx.close();
      }
    }

    await client.execute("PRAGMA foreign_keys = ON");

    if (appliedCount === 0) {
      console.log("[db:migrate] All SQLite/LibSQL migrations are already up to date.");
    } else {
      console.log(`[db:migrate] Successfully applied ${appliedCount} migration(s).`);
    }
  }
  console.log("[db:migrate] Migrations completed successfully.");
}

if (require.main === module || process.argv[1]?.includes("migrate")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[db:migrate] Migration error:", err);
      process.exit(1);
    });
}
