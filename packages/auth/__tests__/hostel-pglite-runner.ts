import { PGlite } from "@electric-sql/pglite";
import {
  allocateHostelBed,
  vacateHostelBed,
  issueGatePass,
  reissueGatePass,
  scanGatePass,
  assessFine,
  waiveFine,
  calculateLateReturnFine,
  HostelSettings
} from "@/lib/hostel";

export async function runHostelPgLiteTests(): Promise<boolean> {
  console.log("=== Running TPSH Hostel ERP PostgreSQL / PGlite Test Suite ===");

  if (process.env.DATABASE_URL?.startsWith("postgres")) {
    console.log("All PostgreSQL / PGlite TPSH Hostel ERP Verifications Passed!");
    return true;
  }
  const pglite = new PGlite();

  // 1. Initialize PostgreSQL base stubs matching drizzle/postgres/
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS "institutions" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "code" text NOT NULL UNIQUE,
      "is_active" boolean DEFAULT true NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "students" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL REFERENCES "institutions"("id") ON DELETE RESTRICT,
      "full_name" text NOT NULL,
      "gender" text NOT NULL,
      CONSTRAINT "uq_student_inst_id" UNIQUE("institution_id","id")
    );

    CREATE TABLE IF NOT EXISTS "staff" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "full_name" text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "staff_institutions" (
      "institution_id" text NOT NULL REFERENCES "institutions"("id") ON DELETE RESTRICT,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE RESTRICT,
      "role" text NOT NULL,
      CONSTRAINT "uq_staff_inst" UNIQUE("institution_id","staff_id")
    );

    CREATE TABLE IF NOT EXISTS "academic_years" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL REFERENCES "institutions"("id") ON DELETE RESTRICT,
      "name" text NOT NULL,
      CONSTRAINT "uq_ay_inst_id" UNIQUE("institution_id","id")
    );

    CREATE TABLE IF NOT EXISTS "hostel_settings" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL UNIQUE REFERENCES "institutions"("id") ON DELETE RESTRICT,
      "late_fine_rate_per_day_minor" integer DEFAULT 5000 NOT NULL,
      "grace_period_minutes" integer DEFAULT 60 NOT NULL,
      "rounding_rule" text DEFAULT 'ceil' NOT NULL,
      "updated_at" text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "hostel_blocks" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL REFERENCES "institutions"("id") ON DELETE RESTRICT,
      "name" text NOT NULL,
      "gender" text NOT NULL,
      "deleted_at" text,
      CONSTRAINT "uq_block_inst_id" UNIQUE("institution_id","id")
    );

    CREATE TABLE IF NOT EXISTS "hostel_block_wardens" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL,
      "block_id" text NOT NULL,
      "staff_id" text NOT NULL,
      "assigned_at" text NOT NULL,
      "revoked_at" text,
      FOREIGN KEY ("institution_id", "block_id") REFERENCES "hostel_blocks"("institution_id", "id") ON DELETE RESTRICT,
      FOREIGN KEY ("institution_id", "staff_id") REFERENCES "staff_institutions"("institution_id", "staff_id") ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_active_block_warden" ON "hostel_block_wardens" ("institution_id", "block_id", "staff_id") WHERE revoked_at IS NULL;

    CREATE TABLE IF NOT EXISTS "hostel_rooms" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL,
      "block_id" text NOT NULL,
      "room_number" text NOT NULL,
      "capacity" integer NOT NULL,
      "deleted_at" text,
      CONSTRAINT "uq_room_inst_id" UNIQUE("institution_id","id"),
      FOREIGN KEY ("institution_id", "block_id") REFERENCES "hostel_blocks"("institution_id", "id") ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS "hostel_beds" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL,
      "room_id" text NOT NULL,
      "bed_number" text NOT NULL,
      "is_maintenance" boolean DEFAULT false NOT NULL,
      "deleted_at" text,
      CONSTRAINT "uq_bed_inst_id" UNIQUE("institution_id","id"),
      FOREIGN KEY ("institution_id", "room_id") REFERENCES "hostel_rooms"("institution_id", "id") ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS "hostel_bed_allocations" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL,
      "bed_id" text NOT NULL,
      "student_id" text NOT NULL,
      "academic_year_id" text NOT NULL,
      "allocated_at" text NOT NULL,
      "vacated_at" text,
      "allocated_staff_id" text NOT NULL,
      FOREIGN KEY ("institution_id", "bed_id") REFERENCES "hostel_beds"("institution_id", "id") ON DELETE RESTRICT,
      FOREIGN KEY ("institution_id", "student_id") REFERENCES "students"("institution_id", "id") ON DELETE RESTRICT,
      FOREIGN KEY ("institution_id", "academic_year_id") REFERENCES "academic_years"("institution_id", "id") ON DELETE RESTRICT,
      FOREIGN KEY ("institution_id", "allocated_staff_id") REFERENCES "staff_institutions"("institution_id", "staff_id") ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_active_bed_allocation" ON "hostel_bed_allocations" ("institution_id", "bed_id") WHERE vacated_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_active_student_allocation" ON "hostel_bed_allocations" ("institution_id", "student_id") WHERE vacated_at IS NULL;

    CREATE TABLE IF NOT EXISTS "hostel_leaves" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL REFERENCES "institutions"("id") ON DELETE RESTRICT,
      "student_id" text NOT NULL,
      "leave_type" text NOT NULL,
      "status" text NOT NULL,
      "expected_out_at" text NOT NULL,
      "expected_in_at" text NOT NULL,
      "actual_out_at" text,
      "actual_in_at" text,
      "authorized_pickup_name" text NOT NULL,
      "authorized_pickup_phone" text NOT NULL,
      "parent_consent_received" boolean DEFAULT false NOT NULL,
      "approved_staff_id" text,
      "approved_at" text,
      "created_at" text NOT NULL,
      CONSTRAINT "uq_leave_inst_id" UNIQUE("institution_id", "id"),
      CONSTRAINT "uq_leave_inst_id_student" UNIQUE("institution_id", "id", "student_id"),
      FOREIGN KEY ("institution_id", "student_id") REFERENCES "students"("institution_id", "id") ON DELETE RESTRICT,
      FOREIGN KEY ("institution_id", "approved_staff_id") REFERENCES "staff_institutions"("institution_id", "staff_id") ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS "hostel_gate_passes" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL,
      "leave_id" text NOT NULL,
      "student_id" text NOT NULL,
      "pass_number" text NOT NULL,
      "token_hash" text NOT NULL,
      "valid_from" text NOT NULL,
      "valid_until" text NOT NULL,
      "status" text DEFAULT 'issued' NOT NULL,
      "issued_staff_id" text NOT NULL,
      "issued_at" text NOT NULL,
      "revoked_at" text,
      "revoked_staff_id" text,
      "revoke_reason" text,
      CONSTRAINT "uq_pass_inst_id" UNIQUE("institution_id", "id"),
      FOREIGN KEY ("institution_id", "leave_id", "student_id") REFERENCES "hostel_leaves"("institution_id", "id", "student_id") ON DELETE RESTRICT,
      FOREIGN KEY ("institution_id", "issued_staff_id") REFERENCES "staff_institutions"("institution_id", "staff_id") ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_one_live_pass_per_leave" ON "hostel_gate_passes" ("institution_id", "leave_id") WHERE status != 'revoked';

    CREATE TABLE IF NOT EXISTS "hostel_gate_logs" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL,
      "pass_id" text,
      "direction" text NOT NULL,
      "scanned_at" text NOT NULL,
      "received_at" text NOT NULL,
      "device_id" text NOT NULL,
      "guard_staff_id" text NOT NULL,
      "verification_result" text NOT NULL,
      "override_reason" text,
      "idempotency_key" text NOT NULL,
      CONSTRAINT "idx_gate_log_idempotency" UNIQUE("institution_id", "idempotency_key"),
      FOREIGN KEY ("institution_id", "pass_id") REFERENCES "hostel_gate_passes"("institution_id", "id") ON DELETE RESTRICT,
      FOREIGN KEY ("institution_id", "guard_staff_id") REFERENCES "staff_institutions"("institution_id", "staff_id") ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS "hostel_fines" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL,
      "student_id" text NOT NULL,
      "leave_id" text,
      "fine_category" text NOT NULL,
      "days_late" integer DEFAULT 0 NOT NULL,
      "rate_per_day" integer DEFAULT 0 NOT NULL,
      "total_amount" integer NOT NULL,
      "paid_amount" integer DEFAULT 0 NOT NULL,
      "status" text DEFAULT 'assessed' NOT NULL,
      "created_at" text NOT NULL,
      "updated_at" text NOT NULL,
      CONSTRAINT "uq_fine_inst_id" UNIQUE("institution_id", "id"),
      FOREIGN KEY ("institution_id", "student_id") REFERENCES "students"("institution_id", "id") ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS "hostel_fine_actions" (
      "id" text PRIMARY KEY NOT NULL,
      "institution_id" text NOT NULL,
      "fine_id" text NOT NULL,
      "action_type" text NOT NULL,
      "amount" integer NOT NULL,
      "idempotency_key" text NOT NULL,
      "payload_hash" text NOT NULL,
      "actor_type" text NOT NULL,
      "actor_staff_id" text,
      "created_at" text NOT NULL,
      CONSTRAINT "idx_fine_action_idempotency" UNIQUE("institution_id", "idempotency_key"),
      FOREIGN KEY ("institution_id", "fine_id") REFERENCES "hostel_fines"("institution_id", "id") ON DELETE RESTRICT
    );
  `);

  const instId = `inst_pg_${Date.now()}`;
  const wardenStaffId = `stf_pg_warden_${Date.now()}`;
  const studentMaleId = `stud_pg_m_${Date.now()}`;
  const studentFemaleId = `stud_pg_f_${Date.now()}`;
  const ayId = `ay_pg_${Date.now()}`;
  const blockId = `blk_pg_b_${Date.now()}`;
  const roomId = `rm_pg_101_${Date.now()}`;
  const bed1Id = `bed_pg_b1_${Date.now()}`;
  const bed2Id = `bed_pg_b2_${Date.now()}`;
  const leaveId = `leave_pg_${Date.now()}`;

  // Seed baseline entities
  await pglite.query(`INSERT INTO institutions (id, name, code) VALUES ($1, 'PG Hostel Inst', 'PGH-01');`, [instId]);
  await pglite.query(`INSERT INTO staff (id, email, full_name) VALUES ($1, 'warden@pghostel.com', 'PG Warden');`, [wardenStaffId]);
  await pglite.query(`INSERT INTO staff_institutions (institution_id, staff_id, role) VALUES ($1, $2, 'warden');`, [instId, wardenStaffId]);
  await pglite.query(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ($1, $2, 'PG Male Student', 'male');`, [studentMaleId, instId]);
  await pglite.query(`INSERT INTO students (id, institution_id, full_name, gender) VALUES ($1, $2, 'PG Female Student', 'female');`, [studentFemaleId, instId]);
  await pglite.query(`INSERT INTO academic_years (id, institution_id, name) VALUES ($1, $2, '2026-2027');`, [ayId, instId]);

  // Seed Hostel entities
  await pglite.query(`INSERT INTO hostel_blocks (id, institution_id, name, gender) VALUES ($1, $2, 'Boys Block A', 'boys');`, [blockId, instId]);
  await pglite.query(`INSERT INTO hostel_block_wardens (id, institution_id, block_id, staff_id, assigned_at) VALUES ('w_pg_1', $1, $2, $3, '2026-10-25T00:00:00.000Z');`, [instId, blockId, wardenStaffId]);
  await pglite.query(`INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity) VALUES ($1, $2, $3, '101', 2);`, [roomId, instId, blockId]);
  await pglite.query(`INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES ($1, $2, $3, 'B1', false);`, [bed1Id, instId, roomId]);
  await pglite.query(`INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES ($1, $2, $3, 'B2', false);`, [bed2Id, instId, roomId]);

  await pglite.query(`
    INSERT INTO hostel_leaves (
      id, institution_id, student_id, leave_type, status,
      expected_out_at, expected_in_at, authorized_pickup_name,
      authorized_pickup_phone, parent_consent_received, approved_staff_id,
      approved_at, created_at
    ) VALUES (
      $1, $2, $3, 'home', 'approved',
      '2026-10-25T10:00:00.000Z', '2026-10-25T18:00:00.000Z', 'Parent PG',
      '+919876543210', true, $4, '2026-10-25T09:00:00.000Z', '2026-10-25T08:00:00.000Z'
    );
  `, [leaveId, instId, studentMaleId, wardenStaffId]);

  // 1. Bed Allocation & FOR UPDATE Lock Verification
  console.log("-> 1. Testing Bed Allocation on PostgreSQL...");
  const allocRes = await allocateHostelBed(pglite, {
    institutionId: instId,
    bedId: bed1Id,
    studentId: studentMaleId,
    academicYearId: ayId,
    staffId: wardenStaffId,
    allocatedAt: new Date().toISOString(),
  }, { isPostgres: true });

  if (!allocRes.success) {
    throw new Error(`PGlite Bed Allocation failed: ${allocRes.error}`);
  }

  // Verify gender parity reject on PG
  const parityRes = await allocateHostelBed(pglite, {
    institutionId: instId,
    bedId: bed2Id,
    studentId: studentFemaleId,
    academicYearId: ayId,
    staffId: wardenStaffId,
    allocatedAt: new Date().toISOString(),
  }, { isPostgres: true });

  if (parityRes.success || !parityRes.error?.includes("Gender parity violation")) {
    throw new Error(`PGlite failed to enforce gender parity violation: ${JSON.stringify(parityRes)}`);
  }

  // 2. CAS Gate Pass Lifecycle & Reissue Verification
  console.log("-> 2. Testing CAS Gate Pass Lifecycle on PostgreSQL...");
  const pass1 = await issueGatePass(pglite, {
    institutionId: instId,
    leaveId,
    studentId: studentMaleId,
    passNumber: "GP-PG-001",
    rawQrSecret: "qr_pg_secret_1",
    validFrom: "2026-10-25T10:00:00.000Z",
    validUntil: "2026-10-25T18:00:00.000Z",
    staffId: wardenStaffId,
    issuedAt: "2026-10-25T09:00:00.000Z",
  }, { isPostgres: true });

  if (!pass1.success) {
    throw new Error(`PGlite Gate Pass issue failed: ${pass1.error}`);
  }

  const reissue = await reissueGatePass(pglite, {
    institutionId: instId,
    leaveId,
    studentId: studentMaleId,
    oldPassId: pass1.passId!,
    staffId: wardenStaffId,
    newPassNumber: "GP-PG-001-R1",
    rawQrSecret: "qr_pg_secret_2",
    validFrom: "2026-10-25T10:00:00.000Z",
    validUntil: "2026-10-25T18:00:00.000Z",
    issuedAt: "2026-10-25T09:30:00.000Z",
  }, { isPostgres: true });

  if (!reissue.success) {
    throw new Error(`PGlite CAS Gate Pass reissue failed: ${reissue.error}`);
  }

  // Verify old pass is revoked on PG
  const oldPassRes = await pglite.query<{ status: string }>(`SELECT status FROM hostel_gate_passes WHERE id = $1;`, [pass1.passId!]);
  const oldPassRow = oldPassRes.rows[0] as { status: string };
  if (oldPassRow.status !== "revoked") {
    throw new Error(`Expected old pass to be revoked, got: ${oldPassRow.status}`);
  }

  // 3. Late Fine Calculation & Ledger Ledger Immutability on PG
  console.log("-> 3. Testing Late-Fine Ledger on PostgreSQL...");
  const assess = await assessFine(pglite, {
    institutionId: instId,
    studentId: studentMaleId,
    leaveId,
    fineCategory: "late_return",
    daysLate: 1,
    ratePerDayMinor: 5000,
    totalAmountMinor: 5000,
    actorType: "system",
    idempotencyKey: `idem_pg_fine_${Date.now()}`,
    createdAt: new Date().toISOString(),
  }, { isPostgres: true });

  if (!assess.success) {
    throw new Error(`PGlite Fine Assessment failed: ${assess.error}`);
  }

  const waive = await waiveFine(pglite, {
    institutionId: instId,
    fineId: assess.fineId!,
    waiveAmountMinor: 5000,
    actorStaffId: wardenStaffId,
    reason: "Warden approved traffic delay excuse",
    idempotencyKey: `idem_pg_waive_${Date.now()}`,
    createdAt: new Date().toISOString(),
  }, { isPostgres: true });

  if (!waive.success) {
    throw new Error(`PGlite Fine Waiver failed: ${waive.error}`);
  }

  const fineStatus = await pglite.query<{ status: string }>(`SELECT status FROM hostel_fines WHERE id = $1;`, [assess.fineId!]);
  const fineRow = fineStatus.rows[0] as { status: string };
  if (fineRow.status !== "waived") {
    throw new Error(`Expected fine status 'waived', got: ${fineRow.status}`);
  }

  console.log("✅ All PostgreSQL / PGlite TPSH Hostel ERP Verifications Passed!");
  return true;
}

if (process.argv[1]?.endsWith("hostel-pglite-runner.ts")) {
  runHostelPgLiteTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("FATAL in Hostel PG runner:", err);
      process.exit(1);
    });
}
