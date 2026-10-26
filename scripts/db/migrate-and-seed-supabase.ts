// @ts-expect-error missing types for pg in script context
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as pgSchema from "../../packages/db/schema.pg";
import { sql } from "drizzle-orm";

async function main() {
  const connStr = "postgresql://postgres.gdsbefqqsdzjjoigbaxu:TH%40supabase@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";

  console.log("=================================================");
  console.log("Connecting to Supabase (aws-0-ap-northeast-2.pooler.supabase.com:5432)...");
  
  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  const db = drizzle(pool, { schema: pgSchema });

  console.log("Running Drizzle PostgreSQL migrations from ./drizzle/postgres...");
  const startTime = Date.now();
  await migrate(db, { migrationsFolder: "./drizzle/postgres" });
  console.log(`Migrations applied successfully in ${((Date.now() - startTime) / 1000).toFixed(2)}s!`);

  console.log("Checking staff table for root super admin...");
  const staffTable = pgSchema.staff;
  const existing = await db
    .select()
    .from(staffTable)
    .where(sql`lower(${staffTable.email}) = lower('media@thaibagarden.com')`);

  if (existing.length === 0) {
    console.log("Seeding root super_admin media@thaibagarden.com...");
    await db.insert(staffTable).values({
      id: "staff_root_media_admin",
      email: "media@thaibagarden.com",
      employeeId: "ROOT-DIR-001",
      firstName: "Media",
      lastName: "Admin",
      role: "super_admin",
      isActive: true,
      isFirstLogin: false,
      googleSub: null,
      tokenVersion: 0,
    });
    console.log("Successfully seeded media@thaibagarden.com as super_admin!");
  } else {
    console.log("media@thaibagarden.com already exists:", existing[0]);
  }

  // Count total tables
  const tablesRes = await pool.query(`
    SELECT count(*)::int as table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);

  // Count staff rows
  const staffRes = await pool.query(`
    SELECT id, email, role, is_active, is_first_login, google_sub 
    FROM staff;
  `);

  console.log("=================================================");
  console.log(`Total Public Tables Created: ${tablesRes.rows[0].table_count}`);
  console.log(`Staff Roster on Supabase:`, staffRes.rows);
  console.log("=================================================");

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
