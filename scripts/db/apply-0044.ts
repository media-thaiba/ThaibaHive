import fs from "fs";
import { createClient } from "@libsql/client";

async function main() {
  const sqlContent = fs.readFileSync("drizzle/0044_odd_mephistopheles.sql", "utf-8");
  const statements = sqlContent
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(Boolean);

  const client = createClient({ url: "file:dev.db" });
  for (const statement of statements) {
    try {
      await client.execute(statement);
      console.log("Executed statement successfully.");
    } catch (err: any) {
      if (err.message && (err.message.includes("already exists") || err.message.includes("duplicate column"))) {
        console.log("Skipping already existing:", err.message);
      } else {
        console.error("Statement failed:", statement, err);
        throw err;
      }
    }
  }
  client.close();
  console.log("Migration 0044 applied to dev.db successfully!");
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
