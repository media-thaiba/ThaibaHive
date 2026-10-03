import { db } from "@thaiba/db";
import { sql } from "drizzle-orm";

async function main() {
  const queryStr = `
    SELECT s.id, s.email, s.first_name, s.last_name, s.role, s.is_active
    FROM staff s
    LEFT JOIN staff_institutions si ON s.id = si.staff_id
    WHERE s.role NOT IN ('super_admin', 'admin', 'system')
      AND s.is_active = 1
      AND si.id IS NULL
  `;
  
  console.log("=== SQL QUERY ===");
  console.log(queryStr.trim());
  console.log("\n=== EXECUTING ON DATABASE ===");

  const results = await db.all(sql.raw(queryStr));

  console.log("=== RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nTotal unmapped active non-admin staff count: ${results.length}`);
}

main().catch((err) => {
  console.error("Error checking unmapped staff:", err);
  process.exit(1);
});
