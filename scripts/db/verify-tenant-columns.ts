import { db, isPostgres } from "../../packages/db";
import { sql } from "drizzle-orm";

const REQUIRED_SCOPED_TABLES = [
  "leave_requests",
  "meal_notifications",
  "help_desk_tickets",
  "tasks",
  "visitors",
  "bookings",
  "media_folders",
  "media_assets",
];

export async function verifyTenantColumns(): Promise<boolean> {
  console.log(`[verify-tenant-columns] Verifying institution_id column on ${REQUIRED_SCOPED_TABLES.length} tables (${isPostgres ? "PostgreSQL" : "SQLite"})...`);

  const missing: string[] = [];

  for (const tableName of REQUIRED_SCOPED_TABLES) {
    if (isPostgres) {
      const res: any = await db.all(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = ${tableName} AND column_name = 'institution_id'
      `);
      const count = Number(res[0]?.count ?? res[0]?.["count"] ?? 0);
      if (count === 0) {
        missing.push(tableName);
      }
    } else {
      const infoQuery = sql.raw(`PRAGMA table_info(${tableName})`);
      const cols: any = await db.all(infoQuery);
      const hasCol = (cols || []).some((c: any) => c.name === "institution_id");
      if (!hasCol) {
        missing.push(tableName);
      }
    }
  }

  if (missing.length > 0) {
    console.error(`[verify-tenant-columns] ❌ Missing institution_id column on tables: ${missing.join(", ")}`);
    return false;
  }

  console.log(`[verify-tenant-columns] ✅ All ${REQUIRED_SCOPED_TABLES.length} scoped tables possess institution_id column.`);
  return true;
}

if (require.main === module || process.argv[1]?.includes("verify-tenant-columns")) {
  verifyTenantColumns()
    .then((ok) => {
      if (!ok) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[verify-tenant-columns] Error during verification:", err);
      process.exit(1);
    });
}
