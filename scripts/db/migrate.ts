import { execSync } from "child_process";
import { migrate as pgMigrate } from "drizzle-orm/node-postgres/migrator";
import { db, isPostgres } from "../../packages/db";

export async function runMigrations() {
  if (isPostgres) {
    console.log("[db:migrate] Running PostgreSQL migrations from ./drizzle/postgres...");
    await pgMigrate(db as any, { migrationsFolder: "./drizzle/postgres" });
  } else {
    console.log("[db:migrate] Synchronizing SQLite/LibSQL schema via drizzle-kit push...");
    execSync("drizzle-kit push", { stdio: "inherit", env: process.env });
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
