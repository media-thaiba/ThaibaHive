import { db } from "../packages/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Initializing connection test...");
  try {
    // If DATABASE_URL is not PostgreSQL, it will test on SQLite client
    const result = await db.run(sql`SELECT 1 + 1 AS result`);

    console.log("[+] Database connection/execution test PASSED!");
    console.log("Raw Result details:", JSON.stringify(result));
    process.exit(0);
  } catch (err: any) {
    console.error("[-] Database connection test FAILED:", err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Unhandled test error:", err);
  process.exit(1);
});
