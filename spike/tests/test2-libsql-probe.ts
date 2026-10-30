import { runLibsqlSequentialTransactionProbe } from "../src/libsql-probe.js";
import { createClient } from "@libsql/client";
import { classifyAllocationViolation } from "../src/errors.js";
import * as path from "node:path";
import * as fs from "node:fs";

export async function runTest2(existingDbPath?: string): Promise<{
  tx1Pragma: number;
  tx1OrphanRejected: boolean;
  tx2Pragma: number;
  tx2OrphanRejected: boolean;
  nonTxOrphanRejected: boolean;
  sqliteTotalFkConstraints: number;
  sqliteTotalFkColumnRows: number;
  sqliteFkSummary: Record<string, { constraints: number; columnRows: number; details: Array<{ id: number; from: string; to: string; table: string }> }>;
  sqliteBedCollisionPassed: boolean;
  sqliteStudentCollisionPassed: boolean;
  passed: boolean;
}> {
  // 1. Connection & sequential transaction pragma probe
  const dbPath = fs.existsSync("./spike") ? path.resolve("./spike/spike-test2.db") : path.resolve("./spike-test2.db");
  const res = await runLibsqlSequentialTransactionProbe(dbPath);
  try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (_) {}

  const pragmaPassed =
    res.tx1Pragma === 1 &&
    res.tx1OrphanRejected &&
    res.tx2Pragma === 1 &&
    res.tx2OrphanRejected &&
    res.nonTxOrphanRejected;

  if (!pragmaPassed) {
    throw new Error(`Test 2 failed: LibSQL foreign key invariant violated: ${JSON.stringify(res)}`);
  }

  // 2. SQLite Schema & PRAGMA foreign_key_list verification on chain database
  const schemaDbPath = existingDbPath || (fs.existsSync("./spike/spike-chain.db") ? path.resolve("./spike/spike-chain.db") : path.resolve("./spike-chain.db"));
  const client = createClient({ url: `file:${schemaDbPath}` });
  await client.execute("PRAGMA foreign_keys = ON;");

  // Query PRAGMA foreign_key_list for all 11 hostel tables
  const hostelTables = [
    "hostel_settings", "hostel_blocks", "hostel_block_wardens",
    "hostel_rooms", "hostel_beds", "hostel_bed_allocations",
    "hostel_leaves", "hostel_gate_passes", "hostel_gate_logs",
    "hostel_fines", "hostel_fine_actions"
  ];

  const sqliteFkSummary: Record<string, { constraints: number; columnRows: number; details: Array<{ id: number; from: string; to: string; table: string }> }> = {};
  let sqliteTotalFkConstraints = 0;
  let sqliteTotalFkColumnRows = 0;

  for (const tbl of hostelTables) {
    const fkRes = await client.execute(`PRAGMA foreign_key_list(${tbl});`);
    const distinctIds = new Set(fkRes.rows.map((r: any) => Number(r.id)));
    sqliteTotalFkConstraints += distinctIds.size;
    sqliteTotalFkColumnRows += fkRes.rows.length;

    sqliteFkSummary[tbl] = {
      constraints: distinctIds.size,
      columnRows: fkRes.rows.length,
      details: fkRes.rows.map((r: any) => ({
        id: Number(r.id),
        from: String(r.from),
        to: String(r.to),
        table: String(r.table),
      })),
    };
  }

  // 3. Real Driver Error Classification on LibSQL (@libsql/client@0.17.4)
  // Seed parent tables with real schema columns
  await client.execute(`INSERT OR IGNORE INTO institutions (id, name, code, created_at) VALUES ('inst-1', 'Inst One', 'CODE-1', '2026-10-25T00:00:00.000Z');`);
  await client.execute(`INSERT OR IGNORE INTO staff (id, employee_id, email, first_name, last_name, role) VALUES ('staff-1', 'EMP-1', 'staff@test.com', 'Staff', 'One', 'staff');`);
  await client.execute(`INSERT OR IGNORE INTO staff_institutions (id, institution_id, staff_id) VALUES ('si-1', 'inst-1', 'staff-1');`);
  await client.execute(`INSERT OR IGNORE INTO academic_years (id, institution_id, name, start_date, end_date) VALUES ('ay-1', 'inst-1', '2026', '2026-06-01', '2027-05-31');`);
  await client.execute(`INSERT OR IGNORE INTO hostel_blocks (id, institution_id, name, gender) VALUES ('b-1', 'inst-1', 'Block 1', 'boys');`);
  await client.execute(`INSERT OR IGNORE INTO hostel_rooms (id, institution_id, block_id, room_number, capacity) VALUES ('r-1', 'inst-1', 'b-1', '101', 10);`);
  await client.execute(`INSERT OR IGNORE INTO hostel_beds (id, institution_id, room_id, bed_number) VALUES ('bed-libsql-1', 'inst-1', 'r-1', 'B1');`);
  await client.execute(`INSERT OR IGNORE INTO students (id, institution_id, admission_no, first_name, last_name, gender) VALUES ('s-libsql-1', 'inst-1', 'ADM-1', 'Student', '1', 'male');`);
  await client.execute(`INSERT OR IGNORE INTO students (id, institution_id, admission_no, first_name, last_name, gender) VALUES ('s-libsql-2', 'inst-1', 'ADM-2', 'Student', '2', 'male');`);

  // (a) First allocation succeeds
  await client.execute({
    sql: `INSERT OR IGNORE INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_at, allocated_staff_id) VALUES ('alloc-1', 'inst-1', 'bed-libsql-1', 's-libsql-1', 'ay-1', '2026-10-25T00:00:00.000Z', 'staff-1');`
  });

  // (b) Bed collision on LibSQL: insert different student on same active bed -> Must throw UNIQUE constraint failed
  let sqliteBedCollisionPassed = false;
  try {
    await client.execute({
      sql: `INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_at, allocated_staff_id) VALUES ('alloc-2', 'inst-1', 'bed-libsql-1', 's-libsql-2', 'ay-1', '2026-10-25T00:00:00.000Z', 'staff-1');`
    });
  } catch (err: any) {
    const classification = classifyAllocationViolation(err);
    if (classification.isViolation && classification.type === "bed_collision") {
      sqliteBedCollisionPassed = true;
    }
  }

  // (c) Student collision on LibSQL: insert same student on second bed -> Must throw UNIQUE constraint failed
  await client.execute(`INSERT OR IGNORE INTO hostel_beds (id, institution_id, room_id, bed_number) VALUES ('bed-libsql-2', 'inst-1', 'r-1', 'B2');`);
  let sqliteStudentCollisionPassed = false;
  try {
    await client.execute({
      sql: `INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_at, allocated_staff_id) VALUES ('alloc-3', 'inst-1', 'bed-libsql-2', 's-libsql-1', 'ay-1', '2026-10-25T00:00:00.000Z', 'staff-1');`
    });
  } catch (err: any) {
    const classification = classifyAllocationViolation(err);
    if (classification.isViolation && classification.type === "student_collision") {
      sqliteStudentCollisionPassed = true;
    }
  }

  const passed = pragmaPassed && sqliteBedCollisionPassed && sqliteStudentCollisionPassed;
  return {
    ...res,
    sqliteTotalFkConstraints,
    sqliteTotalFkColumnRows,
    sqliteFkSummary,
    sqliteBedCollisionPassed,
    sqliteStudentCollisionPassed,
    passed,
  };
}
