import { db, isPostgres } from "../../packages/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

export interface BackfillStats {
  table: string;
  updated: number;
  skippedNoActor: number;
  ambiguousMultiInst: number;
  ambiguousSampleIds: string[];
}

export interface BackfillReport {
  timestamp: string;
  dialect: string;
  totalUpdated: number;
  totalSkipped: number;
  totalAmbiguous: number;
  tableStats: BackfillStats[];
}

export async function runInstitutionBackfill(customReportPath?: string): Promise<BackfillReport> {
  console.log("[db:backfill] Starting institution ID backfill across 8 scoped tables...");

  const report: BackfillReport = {
    timestamp: new Date().toISOString(),
    dialect: isPostgres ? "postgres" : "sqlite",
    totalUpdated: 0,
    totalSkipped: 0,
    totalAmbiguous: 0,
    tableStats: [],
  };

  const CHUNK_SIZE = 5000;

  // Helper to query multi-institution actors to track ambiguity
  const multiInstActorRows: { staffId: string; instCount: number }[] = await db.all(sql`
    SELECT staff_id as "staffId", COUNT(DISTINCT institution_id) as "instCount"
    FROM staff_institutions
    GROUP BY staff_id
    HAVING COUNT(DISTINCT institution_id) > 1
  `);

  const multiInstActorSet = new Set(
    (multiInstActorRows || []).map((r) => r.staffId)
  );

  async function backfillTable(
    tableName: string,
    idCol: string,
    actorColExpr: string,
    fallbackJoinSql?: string
  ) {
    let tableUpdated = 0;
    let tableSkipped = 0;
    let tableAmbiguous = 0;
    const ambiguousIds: string[] = [];

    // Find all rows where institution_id IS NULL
    const rowsQuery = fallbackJoinSql
      ? sql.raw(`SELECT ${tableName}.${idCol} as id, ${actorColExpr} as actor_id FROM ${tableName} ${fallbackJoinSql} WHERE ${tableName}.institution_id IS NULL`)
      : sql.raw(`SELECT ${idCol} as id, ${actorColExpr} as actor_id FROM ${tableName} WHERE institution_id IS NULL`);

    const unassignedRows: { id: string; actor_id: string | null }[] = await db.all(rowsQuery);

    if (!unassignedRows || unassignedRows.length === 0) {
      report.tableStats.push({
        table: tableName,
        updated: 0,
        skippedNoActor: 0,
        ambiguousMultiInst: 0,
        ambiguousSampleIds: [],
      });
      return;
    }

    // Process in chunks of CHUNK_SIZE
    for (let i = 0; i < unassignedRows.length; i += CHUNK_SIZE) {
      const chunk = unassignedRows.slice(i, i + CHUNK_SIZE);
      
      for (const row of chunk) {
        if (!row.actor_id) {
          tableSkipped++;
          continue;
        }

        if (multiInstActorSet.has(row.actor_id)) {
          tableAmbiguous++;
          if (ambiguousIds.length < 20) {
            ambiguousIds.push(row.id);
          }
        }

        // Resolve single primary / LIMIT 1 institution identical to getUserInstitutionScope
        const instQuery = sql`SELECT institution_id as "institutionId" FROM staff_institutions WHERE staff_id = ${row.actor_id} LIMIT 1`;
        const instResult: { institutionId: string }[] = await db.all(instQuery);

        const targetInstId = instResult?.[0]?.institutionId;
        if (targetInstId) {
          const updateSql = sql.raw(`UPDATE ${tableName} SET institution_id = '${targetInstId}' WHERE ${idCol} = '${row.id}' AND institution_id IS NULL`);
          await db.run(updateSql);
          tableUpdated++;
        } else {
          tableSkipped++;
        }
      }
    }

    report.totalUpdated += tableUpdated;
    report.totalSkipped += tableSkipped;
    report.totalAmbiguous += tableAmbiguous;

    report.tableStats.push({
      table: tableName,
      updated: tableUpdated,
      skippedNoActor: tableSkipped,
      ambiguousMultiInst: tableAmbiguous,
      ambiguousSampleIds: ambiguousIds,
    });
  }

  // Backfill order: Folders must pass BEFORE Assets
  // 1. leave_requests
  await backfillTable("leave_requests", "id", "staff_id");
  // 2. meal_notifications
  await backfillTable("meal_notifications", "id", "staff_id");
  // 3. help_desk_tickets (submitted_by_id OR assigned_to_id)
  await backfillTable("help_desk_tickets", "id", "COALESCE(submitted_by_id, assigned_to_id)");
  // 4. tasks (assigned_by_id OR assigned_to_id)
  await backfillTable("tasks", "id", "COALESCE(assigned_by_id, assigned_to_id)");
  // 5. visitors (host_staff_id)
  await backfillTable("visitors", "id", "host_staff_id");
  // 6. bookings (booker_id)
  await backfillTable("bookings", "id", "booker_id");
  // 7. media_folders (created_by_id)
  await backfillTable("media_folders", "id", "created_by_id");
  // 8. media_assets (created_by_id)
  await backfillTable("media_assets", "id", "created_by_id");

  // Output report artifact (skip default file write in test mode to avoid dirtying git working tree)
  if (process.env.NODE_ENV !== "test" || customReportPath) {
    const reportsDir = path.resolve(__dirname, "../../docs/reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = customReportPath || path.join(reportsDir, "backfill-institution-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

    console.log(`[db:backfill] Backfill completed. Total updated: ${report.totalUpdated}, skipped: ${report.totalSkipped}, ambiguous: ${report.totalAmbiguous}. Report written to ${reportPath}`);
  }
  return report;
}

if (require.main === module || process.argv[1]?.includes("backfill")) {
  runInstitutionBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[db:backfill] Backfill error:", err);
      process.exit(1);
    });
}
