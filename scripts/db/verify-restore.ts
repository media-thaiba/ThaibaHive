import { db, isPostgres } from "../../packages/db";
import { sql } from "drizzle-orm";

interface TableCountCheck {
  tableName: string;
  minExpectedRows?: number;
}

const CORE_TABLES: TableCountCheck[] = [
  { tableName: "institutions", minExpectedRows: 1 },
  { tableName: "staff", minExpectedRows: 1 },
  { tableName: "departments" },
  { tableName: "classes" },
  { tableName: "students" },
  { tableName: "academic_years" },
  { tableName: "leave_requests" },
  { tableName: "help_desk_tickets" },
];

export async function verifyRestoredDatabase(): Promise<boolean> {
  console.log(`[verify-restore] Verifying restored database integrity (Dialect: ${isPostgres ? "PostgreSQL" : "SQLite"})...`);

  let allPassed = true;
  const results: Record<string, number> = {};

  for (const { tableName, minExpectedRows = 0 } of CORE_TABLES) {
    try {
      const query = sql.raw(`SELECT COUNT(*) as "count" FROM ${tableName}`);
      const row: any = await db.all(query);
      const count = Number(row?.[0]?.count ?? row?.[0]?.["count"] ?? 0);
      results[tableName] = count;

      if (count < minExpectedRows) {
        console.error(`[verify-restore] FAIL: Table '${tableName}' has ${count} rows (expected >= ${minExpectedRows}).`);
        allPassed = false;
      } else {
        console.log(`[verify-restore] OK: Table '${tableName}' present with ${count} rows.`);
      }
    } catch (err) {
      console.error(`[verify-restore] ERROR: Failed to query table '${tableName}':`, err);
      allPassed = false;
    }
  }

  console.log("[verify-restore] Summary Results:", JSON.stringify(results, null, 2));

  if (!allPassed) {
    throw new Error("[verify-restore] Database restore verification failed.");
  }

  console.log("[verify-restore] Database restore verification completed successfully.");
  return true;
}

if (require.main === module || process.argv[1]?.includes("verify-restore")) {
  verifyRestoredDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[verify-restore] Fatal error:", err);
      process.exit(1);
    });
}
