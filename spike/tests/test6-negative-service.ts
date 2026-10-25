import pg from "pg";
import { createClient } from "@libsql/client";
import * as path from "node:path";
import * as fs from "node:fs";
import { validateSpikeDatabaseUrl } from "../src/guard.js";
import { allocateHostelBed } from "../src/service.js";

const { Pool } = pg;

export async function runTest6(appDbUrl: string): Promise<{
  totalChecks: number;
  passedChecks: number;
  allPassed: boolean;
  results: Array<{ name: string; dialect: string; passed: boolean; details: string }>;
}> {
  validateSpikeDatabaseUrl(appDbUrl);

  const results: Array<{ name: string; dialect: string; passed: boolean; details: string }> = [];

  // =========================================================================
  // 1. PostgreSQL Negative Paths (running as thaibahive_app)
  // =========================================================================
  const pgPool = new Pool({
    connectionString: appDbUrl,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

  const pgClient = await pgPool.connect();

  try {
    const instId = "inst-a";
    const ayId = "ay-2026";
    const goodWarden = "staff-warden-1";
    const revokedWarden = "staff-warden-revoked";
    const unassignedStaff = "staff-unassigned";

    // Seed test entities
    await pgClient.query(`
      BEGIN;
      SELECT set_config('app.current_tenant_id', 'inst-a', true);

      -- Additional staff
      INSERT INTO staff (id, email, full_name) VALUES 
        ('${revokedWarden}', 'revoked@inst-a.edu', 'Revoked Warden'),
        ('${unassignedStaff}', 'unassigned@inst-a.edu', 'Unassigned Staff')
      ON CONFLICT DO NOTHING;

      INSERT INTO staff_institutions (institution_id, staff_id, role) VALUES 
        ('${instId}', '${revokedWarden}', 'warden'),
        ('${instId}', '${unassignedStaff}', 'warden')
      ON CONFLICT DO NOTHING;

      -- Revoked warden assignment
      INSERT INTO hostel_block_wardens (id, institution_id, block_id, staff_id, assigned_at, revoked_at)
      VALUES ('w-rev-1', '${instId}', 'block-a', '${revokedWarden}', '2026-01-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z')
      ON CONFLICT DO NOTHING;

      -- Female student
      INSERT INTO students (id, institution_id, admission_number, full_name, gender)
      VALUES ('s-female-1', '${instId}', 'ADM-FEM-1', 'Female Student', 'female')
      ON CONFLICT DO NOTHING;

      -- Male student for test
      INSERT INTO students (id, institution_id, admission_number, full_name, gender)
      VALUES ('s-valid-male', '${instId}', 'ADM-VM-1', 'Valid Male Student', 'male')
      ON CONFLICT DO NOTHING;

      -- Maintenance bed
      INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance)
      VALUES ('bed-maint-1', '${instId}', 'room-a1', 'B-MAINT', true)
      ON CONFLICT DO NOTHING;

      -- Soft-deleted bed
      INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance, deleted_at)
      VALUES ('bed-del-1', '${instId}', 'room-a1', 'B-DEL', false, '2026-10-25T00:00:00.000Z')
      ON CONFLICT DO NOTHING;

      -- Soft-deleted room
      INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity, deleted_at)
      VALUES ('room-del-1', '${instId}', 'block-a', 'R-DEL', 10, '2026-10-25T00:00:00.000Z')
      ON CONFLICT DO NOTHING;
      INSERT INTO hostel_beds (id, institution_id, room_id, bed_number)
      VALUES ('bed-under-del-room', '${instId}', 'room-del-1', 'B-UDR')
      ON CONFLICT DO NOTHING;

      -- Soft-deleted block
      INSERT INTO hostel_blocks (id, institution_id, name, gender, deleted_at)
      VALUES ('block-del-1', '${instId}', 'Block Deleted', 'boys', '2026-10-25T00:00:00.000Z')
      ON CONFLICT DO NOTHING;
      INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity)
      VALUES ('room-under-del-block', '${instId}', 'block-del-1', 'R-UDB', 10)
      ON CONFLICT DO NOTHING;
      INSERT INTO hostel_beds (id, institution_id, room_id, bed_number)
      VALUES ('bed-under-del-block', '${instId}', 'room-under-del-block', 'B-UDB')
      ON CONFLICT DO NOTHING;

      COMMIT;
    `);

    // Standard valid bed for other checks
    const goodBed = "stress-bed-0"; // exists from test 4 setup or let's create a dedicated one
    await pgClient.query(`
      BEGIN;
      SELECT set_config('app.current_tenant_id', 'inst-a', true);
      INSERT INTO hostel_beds (id, institution_id, room_id, bed_number)
      VALUES ('bed-good-control', '${instId}', 'room-a1', 'B-GOOD') ON CONFLICT DO NOTHING;
      COMMIT;
    `);

    // Case 1: Unknown student
    const pgC1 = await allocateHostelBed(pgClient, {
      institutionId: instId,
      bedId: "bed-good-control",
      studentId: "s-non-existent-999",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    });
    results.push({
      name: "Unknown student rejected",
      dialect: "Postgres",
      passed: !pgC1.success && pgC1.error === "Student not found.",
      details: pgC1.error || "unexpected success",
    });

    // Case 2: Gender mismatch (female in boys block)
    const pgC2 = await allocateHostelBed(pgClient, {
      institutionId: instId,
      bedId: "bed-good-control",
      studentId: "s-female-1",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    });
    results.push({
      name: "Gender mismatch rejected",
      dialect: "Postgres",
      passed: !pgC2.success && (pgC2.error?.includes("Gender parity violation") ?? false),
      details: pgC2.error || "unexpected success",
    });

    // Case 3: Bed under maintenance
    const pgC3 = await allocateHostelBed(pgClient, {
      institutionId: instId,
      bedId: "bed-maint-1",
      studentId: "s-valid-male",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    });
    results.push({
      name: "Bed under maintenance rejected",
      dialect: "Postgres",
      passed: !pgC3.success && pgC3.error === "Bed is currently under maintenance.",
      details: pgC3.error || "unexpected success",
    });

    // Case 4: Soft-deleted bed
    const pgC4 = await allocateHostelBed(pgClient, {
      institutionId: instId,
      bedId: "bed-del-1",
      studentId: "s-valid-male",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    });
    results.push({
      name: "Soft-deleted bed rejected",
      dialect: "Postgres",
      passed: !pgC4.success && (pgC4.error?.includes("deleted") ?? false),
      details: pgC4.error || "unexpected success",
    });

    // Case 5: Bed in soft-deleted room
    const pgC5 = await allocateHostelBed(pgClient, {
      institutionId: instId,
      bedId: "bed-under-del-room",
      studentId: "s-valid-male",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    });
    results.push({
      name: "Bed in soft-deleted room rejected",
      dialect: "Postgres",
      passed: !pgC5.success && (pgC5.error?.includes("deleted") ?? false),
      details: pgC5.error || "unexpected success",
    });

    // Case 6: Bed in soft-deleted block
    const pgC6 = await allocateHostelBed(pgClient, {
      institutionId: instId,
      bedId: "bed-under-del-block",
      studentId: "s-valid-male",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    });
    results.push({
      name: "Bed in soft-deleted block rejected",
      dialect: "Postgres",
      passed: !pgC6.success && (pgC6.error?.includes("deleted") ?? false),
      details: pgC6.error || "unexpected success",
    });

    // Case 7: Unassigned staff allocating bed
    const pgC7 = await allocateHostelBed(pgClient, {
      institutionId: instId,
      bedId: "bed-good-control",
      studentId: "s-valid-male",
      academicYearId: ayId,
      staffId: unassignedStaff,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    });
    results.push({
      name: "Unassigned staff member rejected",
      dialect: "Postgres",
      passed: !pgC7.success && (pgC7.error?.includes("not an active assigned warden") ?? false),
      details: pgC7.error || "unexpected success",
    });

    // Case 8: Revoked warden allocating bed
    const pgC8 = await allocateHostelBed(pgClient, {
      institutionId: instId,
      bedId: "bed-good-control",
      studentId: "s-valid-male",
      academicYearId: ayId,
      staffId: revokedWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    });
    results.push({
      name: "Revoked warden assignment rejected",
      dialect: "Postgres",
      passed: !pgC8.success && (pgC8.error?.includes("not an active assigned warden") ?? false),
      details: pgC8.error || "unexpected success",
    });

    // Case 9: Live passes after CAS race verification
    await pgClient.query("BEGIN;");
    await pgClient.query("SELECT set_config('app.current_tenant_id', 'inst-a', true);");
    const passCountRes = await pgClient.query(`
      SELECT count(*)::int as live_count
      FROM hostel_gate_passes
      WHERE status != 'revoked' AND leave_id LIKE 'leave-cas-%';
    `);
    await pgClient.query("COMMIT;");
    // In test 4, 10 CAS race iterations ran. Exactly 10 live passes must exist (1 per leave_id)
    results.push({
      name: "CAS gate pass race leaves exactly one live pass per leave",
      dialect: "Postgres",
      passed: passCountRes.rows[0].live_count === 10,
      details: `Live passes found: ${passCountRes.rows[0].live_count} across 10 leaves`,
    });
  } finally {
    pgClient.release();
    await pgPool.end();
  }

  // =========================================================================
  // 2. LibSQL / SQLite Negative Paths
  // =========================================================================
  const sqliteDbPath = path.resolve("./spike-sqlite-schema.db");
  const sqliteClient = createClient({ url: `file:${sqliteDbPath}` });

  try {
    const instId = "inst-1";
    const ayId = "ay-1";
    const goodWarden = "staff-1";

    // Seed SQLite entities
    await sqliteClient.execute(`
      INSERT OR IGNORE INTO hostel_block_wardens (id, institution_id, block_id, staff_id, assigned_at)
      VALUES ('w-sqlite-1', '${instId}', 'b-1', '${goodWarden}', '2026-10-25T00:00:00.000Z');
    `);
    await sqliteClient.execute(`
      INSERT OR IGNORE INTO staff (id, email, full_name) VALUES ('staff-sqlite-revoked', 'rev@sqlite.org', 'Revoked SQLite');
    `);
    await sqliteClient.execute(`
      INSERT OR IGNORE INTO staff_institutions (institution_id, staff_id, role) VALUES ('${instId}', 'staff-sqlite-revoked', 'warden');
    `);
    await sqliteClient.execute(`
      INSERT OR IGNORE INTO hostel_block_wardens (id, institution_id, block_id, staff_id, assigned_at, revoked_at)
      VALUES ('w-sqlite-rev', '${instId}', 'b-1', 'staff-sqlite-revoked', '2026-01-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');
    `);
    await sqliteClient.execute(`
      INSERT OR IGNORE INTO students (id, institution_id, admission_number, full_name, gender)
      VALUES ('s-sqlite-fem', '${instId}', 'ADM-SQL-F', 'Female SQLite', 'female');
    `);
    await sqliteClient.execute(`
      INSERT OR IGNORE INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance)
      VALUES ('bed-sqlite-maint', '${instId}', 'r-1', 'B-SQL-M', 1);
    `);
    await sqliteClient.execute(`
      INSERT OR IGNORE INTO hostel_beds (id, institution_id, room_id, bed_number, deleted_at)
      VALUES ('bed-sqlite-del', '${instId}', 'r-1', 'B-SQL-D', '2026-10-25T00:00:00.000Z');
    `);

    // SQLite Case 1: Unknown student
    const sqC1 = await allocateHostelBed(sqliteClient, {
      institutionId: instId,
      bedId: "bed-libsql-1",
      studentId: "s-missing-sqlite",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    }, { isPostgres: false });
    results.push({
      name: "Unknown student rejected",
      dialect: "LibSQL",
      passed: !sqC1.success && sqC1.error === "Student not found.",
      details: sqC1.error || "unexpected success",
    });

    // SQLite Case 2: Gender mismatch
    const sqC2 = await allocateHostelBed(sqliteClient, {
      institutionId: instId,
      bedId: "bed-libsql-1",
      studentId: "s-sqlite-fem",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    }, { isPostgres: false });
    results.push({
      name: "Gender mismatch rejected",
      dialect: "LibSQL",
      passed: !sqC2.success && (sqC2.error?.includes("Gender parity violation") ?? false),
      details: sqC2.error || "unexpected success",
    });

    // SQLite Case 3: Maintenance bed
    const sqC3 = await allocateHostelBed(sqliteClient, {
      institutionId: instId,
      bedId: "bed-sqlite-maint",
      studentId: "s-libsql-1",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    }, { isPostgres: false });
    results.push({
      name: "Bed under maintenance rejected",
      dialect: "LibSQL",
      passed: !sqC3.success && sqC3.error === "Bed is currently under maintenance.",
      details: sqC3.error || "unexpected success",
    });

    // SQLite Case 4: Soft-deleted bed
    const sqC4 = await allocateHostelBed(sqliteClient, {
      institutionId: instId,
      bedId: "bed-sqlite-del",
      studentId: "s-libsql-1",
      academicYearId: ayId,
      staffId: goodWarden,
      allocatedAt: "2026-10-25T00:00:00.000Z",
    }, { isPostgres: false });
    results.push({
      name: "Soft-deleted bed rejected",
      dialect: "LibSQL",
      passed: !sqC4.success && (sqC4.error?.includes("deleted") ?? false),
      details: sqC4.error || "unexpected success",
    });

    // SQLite Case 5: Revoked warden
    const sqC5 = await allocateHostelBed(sqliteClient, {
      institutionId: instId,
      bedId: "bed-libsql-1",
      studentId: "s-libsql-1",
      academicYearId: ayId,
      staffId: "staff-sqlite-revoked",
      allocatedAt: "2026-10-25T00:00:00.000Z",
    }, { isPostgres: false });
    results.push({
      name: "Revoked warden assignment rejected",
      dialect: "LibSQL",
      passed: !sqC5.success && (sqC5.error?.includes("not an active assigned warden") ?? false),
      details: sqC5.error || "unexpected success",
    });
  } finally {
    sqliteClient.close();
  }

  const passedChecks = results.filter((r) => r.passed).length;

  return {
    totalChecks: results.length,
    passedChecks,
    allPassed: passedChecks === results.length,
    results,
  };
}
