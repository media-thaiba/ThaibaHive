import { db } from "@/db";
import { sql } from "drizzle-orm";

async function checkDuplicates() {
  console.log("[duplicate-check] Checking for duplicate (staff_id, institution_id) in staff_institutions...");
  const rawRows = await db.all(
    sql`SELECT staff_id, institution_id, COUNT(*) as duplicate_count FROM staff_institutions GROUP BY staff_id, institution_id HAVING COUNT(*) > 1`
  );
  console.log(`[duplicate-check] Duplicates found: ${rawRows.length}`);
  if (rawRows.length > 0) {
    console.table(rawRows);
  } else {
    console.log("[duplicate-check] Clean: Zero duplicate (staff_id, institution_id) records in staff_institutions.");
  }
}

checkDuplicates().catch((err) => {
  console.error("[duplicate-check] Error running check:", err);
  process.exit(1);
});
