import { db, rawPgDb, isPostgres, sql } from "../../packages/db";

const REDUNDANT_INDEXES = [
  "uq_staff_inst",       // redundant with staff_institutions (staff_id, institution_id) uniqueIndex
  "uq_ay_inst_id",       // redundant with academic_years (id) PK
  "uq_student_inst_id",  // redundant with students (id) PK
];

export async function dropRedundantIndexes(): Promise<void> {
  if (!isPostgres) {
    console.log("[drop-indexes] SQLite/LibSQL mode detected — skipping DROP INDEX CONCURRENTLY.");
    return;
  }

  const targetDb = rawPgDb || (db as any);
  console.log("[drop-indexes] Scanning PostgreSQL for redundant indexes...");

  for (const indexName of REDUNDANT_INDEXES) {
    try {
      const checkRes: any = await targetDb.execute(
        sql.raw(`SELECT indexname FROM pg_indexes WHERE indexname = '${indexName}'`)
      );

      const rows = Array.isArray(checkRes) ? checkRes : (checkRes?.rows || []);
      if (rows.length === 0) {
        console.log(`[drop-indexes] Index '${indexName}' does not exist or was already dropped.`);
        continue;
      }

      console.log(`[drop-indexes] Dropping '${indexName}' CONCURRENTLY outside transaction...`);
      // NOTE: DROP INDEX CONCURRENTLY cannot be executed inside a transaction block
      await targetDb.execute(sql.raw(`DROP INDEX CONCURRENTLY IF EXISTS "${indexName}"`));
      console.log(`[drop-indexes] ✅ Successfully dropped '${indexName}'.`);
    } catch (err: any) {
      console.warn(`[drop-indexes] Notice for '${indexName}':`, err?.message || err);
    }
  }
}

const isMainModule = typeof require !== "undefined"
  ? require.main === module
  : process.argv[1]?.includes("drop-redundant-indexes");

if (isMainModule || process.argv[1]?.includes("drop-redundant-indexes")) {
  dropRedundantIndexes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[drop-indexes] Fatal error:", err);
      process.exit(1);
    });
}
