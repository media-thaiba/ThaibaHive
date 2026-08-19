const { db } = require("../packages/db");
const { migrate } = require("drizzle-orm/libsql/migrator");

async function main() {
  console.log("Running migrations directly via drizzle-orm/libsql/migrator...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully!");
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
