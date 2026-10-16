import { db, isPostgres } from "../../packages/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

/**
 * Deterministic institution_id backfill for attendance_logs and presence_logs.
 *
 * Disambiguation hierarchy (Phase 12 D5 pattern — never guess):
 *   1. attendance_logs: nfc_tag_id -> attendance_locations.institution_id
 *      (the checkpoint that physically recorded the tap owns the row)
 *   2. attendance_logs: staff_institutions membership — resolved ONLY when the
 *      staff member has exactly one active institution. Multi-campus staff are
 *      tracked as ambiguous and left NULL (staff_institutions has no is_primary
 *      column, so any pick among several would be a guess).
 *   3. presence_logs: attendance_id -> attendance_logs.institution_id
 *      (already backfilled by step 1/2 above)
 *   4. presence_logs: single-membership staff fallback (same rule as 2)
 *   5. Otherwise leave NULL.
 */

export interface AttendanceBackfillStats {
  table: string;
  updatedViaLocation: number;
  updatedViaSingleMembership: number;
  updatedViaAttendance: number;
  skippedNoActor: number;
  ambiguousMultiInst: number;
  ambiguousSampleIds: string[];
}

export interface AttendanceBackfillReport {
  timestamp: string;
  dialect: string;
  dryRun: boolean;
  totalUpdated: number;
  totalSkipped: number;
  tableStats: AttendanceBackfillStats[];
}

export interface AttendanceBackfillOptions {
  apply?: boolean;
  customReportPath?: string;
}

export async function runAttendanceInstitutionBackfill(
  options?: AttendanceBackfillOptions
): Promise<AttendanceBackfillReport> {
  const isApply =
    options?.apply ??
    (process.argv.includes("--apply") ||
      process.env.BACKFILL_APPLY === "true");

  console.log(
    `[db:backfill:attendance] Starting attendance/presence institution backfill (Mode: ${isApply ? "APPLY" : "DRY-RUN"})...`
  );

  const report: AttendanceBackfillReport = {
    timestamp: new Date().toISOString(),
    dialect: isPostgres ? "postgres" : "sqlite",
    dryRun: !isApply,
    totalUpdated: 0,
    totalSkipped: 0,
    tableStats: [],
  };

  const CHUNK_SIZE = 5000;

  // Resolve single-membership staff once (multi-membership staff are ambiguous)
  const multiMembershipRows: { staffId: string }[] = await db.all(sql`
    SELECT staff_id as "staffId"
    FROM staff_institutions
    GROUP BY staff_id
    HAVING COUNT(DISTINCT institution_id) > 1
  `);
  const multiMembershipSet = new Set(
    (multiMembershipRows || []).map((r) => r.staffId)
  );

  async function resolveSingleMembership(
    staffId: string | null
  ): Promise<string | null> {
    if (!staffId) return null;
    if (multiMembershipSet.has(staffId)) return "AMBIGUOUS";
    const rows: { institutionId: string }[] = await db.all(sql`
      SELECT institution_id as "institutionId"
      FROM staff_institutions
      WHERE staff_id = ${staffId}
      LIMIT 2
    `);
    if (rows.length === 1 && rows[0].institutionId) return rows[0].institutionId;
    if (rows.length > 1) return "AMBIGUOUS";
    return null;
  }

  // ── attendance_logs ──
  const attendanceStats: AttendanceBackfillStats = {
    table: "attendance_logs",
    updatedViaLocation: 0,
    updatedViaSingleMembership: 0,
    updatedViaAttendance: 0,
    skippedNoActor: 0,
    ambiguousMultiInst: 0,
    ambiguousSampleIds: [],
  };

  const attendanceRows: {
    id: string;
    staffId: string | null;
    nfcTagId: string | null;
  }[] = await db.all(sql`
    SELECT id, staff_id as "staffId", nfc_tag_id as "nfcTagId"
    FROM attendance_logs
    WHERE institution_id IS NULL
  `);

  for (let i = 0; i < attendanceRows.length; i += CHUNK_SIZE) {
    const chunk = attendanceRows.slice(i, i + CHUNK_SIZE);

    for (const row of chunk) {
      let targetInstId: string | null = null;

      // Priority 1: NFC checkpoint location owns the row
      if (row.nfcTagId) {
        const locRows: { institutionId: string | null }[] = await db.all(
          sql`
            SELECT institution_id as "institutionId"
            FROM attendance_locations
            WHERE nfc_tag_id = ${row.nfcTagId}
              AND deleted_at IS NULL
              AND institution_id IS NOT NULL
            LIMIT 1
          `
        );
        targetInstId = locRows?.[0]?.institutionId ?? null;
        if (targetInstId) {
          attendanceStats.updatedViaLocation++;
          if (isApply) {
            await db.run(
              sql`UPDATE attendance_logs SET institution_id = ${targetInstId} WHERE id = ${row.id} AND institution_id IS NULL`
            );
          }
          report.totalUpdated++;
          continue;
        }
      }

      // Priority 2: deterministic single-membership staff
      const resolved = await resolveSingleMembership(row.staffId);
      if (resolved && resolved !== "AMBIGUOUS") {
        attendanceStats.updatedViaSingleMembership++;
        if (isApply) {
          await db.run(
            sql`UPDATE attendance_logs SET institution_id = ${resolved} WHERE id = ${row.id} AND institution_id IS NULL`
          );
        }
        report.totalUpdated++;
        continue;
      }
      if (resolved === "AMBIGUOUS") {
        attendanceStats.ambiguousMultiInst++;
        if (attendanceStats.ambiguousSampleIds.length < 20) {
          attendanceStats.ambiguousSampleIds.push(row.id);
        }
        report.totalSkipped++;
        continue;
      }

      // No staff linkage at all
      attendanceStats.skippedNoActor++;
      report.totalSkipped++;
    }
  }

  report.tableStats.push(attendanceStats);

  // ── presence_logs (attendance row must be resolved first) ──
  const presenceStats: AttendanceBackfillStats = {
    table: "presence_logs",
    updatedViaLocation: 0,
    updatedViaSingleMembership: 0,
    updatedViaAttendance: 0,
    skippedNoActor: 0,
    ambiguousMultiInst: 0,
    ambiguousSampleIds: [],
  };

  const presenceRows: {
    id: string;
    staffId: string;
    attendanceId: string;
  }[] = await db.all(sql`
    SELECT p.id, p.staff_id as "staffId", p.attendance_id as "attendanceId"
    FROM presence_logs p
    WHERE p.institution_id IS NULL
  `);

  for (let i = 0; i < presenceRows.length; i += CHUNK_SIZE) {
    const chunk = presenceRows.slice(i, i + CHUNK_SIZE);

    for (const row of chunk) {
      // Priority 1: inherit from the attendance log it belongs to
      const attRows: { institutionId: string | null }[] = await db.all(
        sql`
          SELECT institution_id as "institutionId"
          FROM attendance_logs
          WHERE id = ${row.attendanceId}
          LIMIT 1
        `
      );
      const attInst = attRows?.[0]?.institutionId ?? null;
      if (attInst) {
        presenceStats.updatedViaAttendance++;
        if (isApply) {
          await db.run(
            sql`UPDATE presence_logs SET institution_id = ${attInst} WHERE id = ${row.id} AND institution_id IS NULL`
          );
        }
        report.totalUpdated++;
        continue;
      }

      // Priority 2: deterministic single-membership staff
      const resolved = await resolveSingleMembership(row.staffId);
      if (resolved && resolved !== "AMBIGUOUS") {
        presenceStats.updatedViaSingleMembership++;
        if (isApply) {
          await db.run(
            sql`UPDATE presence_logs SET institution_id = ${resolved} WHERE id = ${row.id} AND institution_id IS NULL`
          );
        }
        report.totalUpdated++;
        continue;
      }
      if (resolved === "AMBIGUOUS") {
        presenceStats.ambiguousMultiInst++;
        if (presenceStats.ambiguousSampleIds.length < 20) {
          presenceStats.ambiguousSampleIds.push(row.id);
        }
        report.totalSkipped++;
        continue;
      }

      presenceStats.skippedNoActor++;
      report.totalSkipped++;
    }
  }

  report.tableStats.push(presenceStats);

  // Output report artifact
  if (process.env.NODE_ENV !== "test" || options?.customReportPath) {
    const reportsDir = path.resolve(__dirname, "../../docs/reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath =
      options?.customReportPath ||
      path.join(reportsDir, "backfill-attendance-institution-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

    console.log(
      `[db:backfill:attendance] Done (${isApply ? "APPLIED" : "DRY-RUN"}). Updated: ${report.totalUpdated}, unresolved: ${report.totalSkipped}. Report: ${reportPath}`
    );
  }

  return report;
}

if (
  require.main === module ||
  process.argv[1]?.includes("backfill-attendance")
) {
  runAttendanceInstitutionBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[db:backfill:attendance] Error:", err);
      process.exit(1);
    });
}
