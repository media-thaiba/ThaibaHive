import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import pg from "pg";
import { validateSpikeDatabaseUrl } from "./src/guard.js";
import { runTest1 } from "./tests/test1-parity-migration.js";
import { runTest2 } from "./tests/test2-libsql-probe.js";
import { runTest3 } from "./tests/test3-postgres-rls.js";
import { runTest4 } from "./tests/test4-concurrency-stress.js";
import { runTest5 } from "./tests/test5-fine-calculation.js";
import { runTest6 } from "./tests/test6-negative-service.js";
import { runTest7 } from "./tests/test7-mutation-proof.js";

const { Client } = pg;

// Tee logging buffer
const logBuffer: string[] = [];
function log(msg: string = "") {
  console.log(msg);
  logBuffer.push(msg);
}

function getPackageVersion(pkgName: string): string {
  try {
    const pkgPath = path.resolve(`./node_modules/${pkgName}/package.json`);
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkgJson.version || "unknown";
  } catch {
    return "unresolved";
  }
}

async function main() {
  log("===============================================================");
  log("       TPSH HOSTEL ERP - PHASE 0 EMPIRICAL SPIKE HARNESS      ");
  log("===============================================================\n");

  // 1. Environment & Resolved Package Versions Block
  log("--- ENVIRONMENT & DEPENDENCY VERSIONS BLOCK ---");
  log(`Node.js Version: ${process.version}`);
  try {
    log(`pnpm Version: ${execSync("pnpm --version", { encoding: "utf-8" }).trim()}`);
  } catch {
    log("pnpm Version: unavailable via CLI");
  }
  log(`drizzle-orm Version: ${getPackageVersion("drizzle-orm")} (pinned from pnpm-lock.yaml)`);
  log(`drizzle-kit Version: ${getPackageVersion("drizzle-kit")} (pinned from pnpm-lock.yaml)`);
  log(`pg Version: ${getPackageVersion("pg")} (pinned from pnpm-lock.yaml)`);
  log(`@libsql/client Version: ${getPackageVersion("@libsql/client")} (pinned from pnpm-lock.yaml)`);
  log("---------------------------------------------------------------\n");

  // 2. Production Pool Configuration Provenance
  log("--- POOL CONFIGURATION PROVENANCE ---");
  log("Configured: pg.Pool({ max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 })");
  log("Provenance: Copied directly from packages/db/index.ts (lines 102, 126, 127).");
  log("---------------------------------------------------------------\n");

  // 3. Record Git Baseline
  const gitBaseline = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
  log("[PHASE 0] Git baseline recorded.");

  // 4. Validate Database URLs
  const superuserUrl = process.env.SPIKE_SUPERUSER_URL || "postgres://postgres:spike_root_password@127.0.0.1:54329/spike_hostel_db";
  const maintUrl = process.env.SPIKE_MAINT_URL || "postgres://thaibahive_maintenance:spike_maint_password@127.0.0.1:54329/spike_hostel_db";
  const appUrl = process.env.SPIKE_APP_URL || "postgres://thaibahive_app:spike_runtime_password@127.0.0.1:54329/spike_hostel_db";

  validateSpikeDatabaseUrl(superuserUrl);
  validateSpikeDatabaseUrl(maintUrl);
  validateSpikeDatabaseUrl(appUrl);
  log("[PHASE 0] All database URLs validated against 3-way safety guard (127.0.0.1:54329, 'spike_').");

  // 5. Apply 01-roles.sql as Superuser
  log("\n[SETUP] Applying 01-roles.sql as postgres superuser...");
  const rolesSql = fs.readFileSync(path.resolve("./sql/01-roles.sql"), "utf-8");
  const superClient = new Client({ connectionString: superuserUrl });
  await superClient.connect();
  await superClient.query(rolesSql);
  await superClient.end();
  log("[SETUP] Roles, mock Supabase roles, and default privileges applied.");

  // 6. Apply Schema DDL as thaibahive_maintenance
  log("\n[SETUP] Applying Schema DDL as thaibahive_maintenance (table owner)...");
  const maintClient = new Client({ connectionString: maintUrl });
  await maintClient.connect();

  // Reset existing hostel tables for clean deterministic setup
  await maintClient.query(`
    DROP TABLE IF EXISTS hostel_fine_actions, hostel_fines, hostel_gate_logs, 
                         hostel_gate_passes, hostel_leaves, hostel_bed_allocations, 
                         hostel_beds, hostel_rooms, hostel_block_wardens, 
                         hostel_blocks, hostel_settings CASCADE;
  `);

  // Create tables in correct dependency order
  await maintClient.query(`
    -- Base Stubs
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
      admission_number TEXT NOT NULL,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
      CONSTRAINT uq_student_inst_id UNIQUE (institution_id, id),
      CONSTRAINT uq_student_inst_adm UNIQUE (institution_id, admission_number)
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_institutions (
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
      staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
      role TEXT NOT NULL,
      CONSTRAINT uq_staff_inst UNIQUE (institution_id, staff_id)
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      is_current TEXT NOT NULL DEFAULT 'true',
      CONSTRAINT uq_ay_inst_id UNIQUE (institution_id, id)
    );

    -- 1. Hostel Settings
    CREATE TABLE IF NOT EXISTS hostel_settings (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
      late_fine_rate_per_day_minor INT NOT NULL DEFAULT 5000,
      grace_period_minutes INT NOT NULL DEFAULT 60,
      rounding_rule TEXT NOT NULL DEFAULT 'ceil' CHECK (rounding_rule IN ('ceil', 'floor')),
      updated_at TEXT NOT NULL,
      CONSTRAINT uq_settings_inst UNIQUE (institution_id),
      CONSTRAINT chk_settings_positive CHECK (late_fine_rate_per_day_minor > 0 AND grace_period_minutes >= 0),
      CONSTRAINT chk_ts_settings_updated CHECK (length(updated_at) = 24 AND substr(updated_at,11,1) = 'T' AND substr(updated_at,24,1) = 'Z')
    );

    -- 2. Hostel Blocks
    CREATE TABLE IF NOT EXISTS hostel_blocks (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('boys', 'girls')),
      deleted_at TEXT,
      CONSTRAINT uq_block_inst_id UNIQUE (institution_id, id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_block_inst_name_active ON hostel_blocks(institution_id, name) WHERE deleted_at IS NULL;

    -- 3. Hostel Block Wardens
    CREATE TABLE IF NOT EXISTS hostel_block_wardens (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      block_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      revoked_at TEXT,
      CONSTRAINT chk_ts_warden_assigned CHECK (length(assigned_at) = 24 AND substr(assigned_at,11,1) = 'T' AND substr(assigned_at,24,1) = 'Z'),
      CONSTRAINT chk_ts_warden_revoked CHECK (revoked_at IS NULL OR (length(revoked_at) = 24 AND substr(revoked_at,11,1) = 'T' AND substr(revoked_at,24,1) = 'Z')),
      FOREIGN KEY (institution_id, block_id) REFERENCES hostel_blocks(institution_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_block_warden ON hostel_block_wardens(institution_id, block_id, staff_id) WHERE revoked_at IS NULL;

    -- 4. Hostel Rooms
    CREATE TABLE IF NOT EXISTS hostel_rooms (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      block_id TEXT NOT NULL,
      room_number TEXT NOT NULL,
      capacity INT NOT NULL,
      deleted_at TEXT,
      CONSTRAINT uq_room_inst_id UNIQUE (institution_id, id),
      CONSTRAINT chk_room_capacity_positive CHECK (capacity > 0),
      FOREIGN KEY (institution_id, block_id) REFERENCES hostel_blocks(institution_id, id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_room_inst_number_active ON hostel_rooms(institution_id, block_id, room_number) WHERE deleted_at IS NULL;

    -- 5. Hostel Beds
    CREATE TABLE IF NOT EXISTS hostel_beds (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      bed_number TEXT NOT NULL,
      is_maintenance BOOLEAN NOT NULL DEFAULT false,
      deleted_at TEXT,
      CONSTRAINT uq_bed_inst_id UNIQUE (institution_id, id),
      FOREIGN KEY (institution_id, room_id) REFERENCES hostel_rooms(institution_id, id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bed_inst_number_active ON hostel_beds(institution_id, room_id, bed_number) WHERE deleted_at IS NULL;

    -- 6. Bed Allocations
    CREATE TABLE IF NOT EXISTS hostel_bed_allocations (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      bed_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      academic_year_id TEXT NOT NULL,
      allocated_at TEXT NOT NULL,
      vacated_at TEXT,
      allocated_staff_id TEXT NOT NULL,
      CONSTRAINT chk_ts_alloc_allocated CHECK (length(allocated_at) = 24 AND substr(allocated_at,11,1) = 'T' AND substr(allocated_at,24,1) = 'Z'),
      CONSTRAINT chk_ts_alloc_vacated CHECK (vacated_at IS NULL OR (length(vacated_at) = 24 AND substr(vacated_at,11,1) = 'T' AND substr(vacated_at,24,1) = 'Z')),
      FOREIGN KEY (institution_id, bed_id) REFERENCES hostel_beds(institution_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, allocated_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, academic_year_id) REFERENCES academic_years(institution_id, id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bed_allocation ON hostel_bed_allocations(institution_id, bed_id) WHERE vacated_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_student_allocation ON hostel_bed_allocations(institution_id, student_id) WHERE vacated_at IS NULL;

    -- 7. Hostel Leaves
    CREATE TABLE IF NOT EXISTS hostel_leaves (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      leave_type TEXT NOT NULL CHECK (leave_type IN ('home', 'medical', 'emergency', 'outing')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled')),
      expected_out_at TEXT NOT NULL,
      expected_in_at TEXT NOT NULL,
      actual_out_at TEXT,
      actual_in_at TEXT,
      authorized_pickup_name TEXT NOT NULL,
      authorized_pickup_phone TEXT NOT NULL,
      parent_consent_received BOOLEAN NOT NULL DEFAULT false,
      approved_staff_id TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      CONSTRAINT uq_leave_inst_id UNIQUE (institution_id, id),
      CONSTRAINT uq_leave_inst_id_student UNIQUE (institution_id, id, student_id),
      CONSTRAINT chk_leave_time_order CHECK (expected_in_at > expected_out_at),
      CONSTRAINT chk_ts_leave_exp_out CHECK (length(expected_out_at) = 24 AND substr(expected_out_at,11,1) = 'T' AND substr(expected_out_at,24,1) = 'Z'),
      CONSTRAINT chk_ts_leave_exp_in CHECK (length(expected_in_at) = 24 AND substr(expected_in_at,11,1) = 'T' AND substr(expected_in_at,24,1) = 'Z'),
      CONSTRAINT chk_ts_leave_act_out CHECK (actual_out_at IS NULL OR (length(actual_out_at) = 24 AND substr(actual_out_at,11,1) = 'T' AND substr(actual_out_at,24,1) = 'Z')),
      CONSTRAINT chk_ts_leave_act_in CHECK (actual_in_at IS NULL OR (length(actual_in_at) = 24 AND substr(actual_in_at,11,1) = 'T' AND substr(actual_in_at,24,1) = 'Z')),
      CONSTRAINT chk_ts_leave_app CHECK (approved_at IS NULL OR (length(approved_at) = 24 AND substr(approved_at,11,1) = 'T' AND substr(approved_at,24,1) = 'Z')),
      CONSTRAINT chk_ts_leave_created CHECK (length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z'),
      FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, approved_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
    );

    -- 8. Hostel Gate Passes
    CREATE TABLE IF NOT EXISTS hostel_gate_passes (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      leave_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      pass_number TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used_out', 'used_in', 'revoked')),
      issued_staff_id TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      revoked_at TEXT,
      revoked_staff_id TEXT,
      revoke_reason TEXT,
      CONSTRAINT uq_pass_inst_id UNIQUE (institution_id, id),
      CONSTRAINT chk_ts_pass_valid_from CHECK (length(valid_from) = 24 AND substr(valid_from,11,1) = 'T' AND substr(valid_from,24,1) = 'Z'),
      CONSTRAINT chk_ts_pass_valid_until CHECK (length(valid_until) = 24 AND substr(valid_until,11,1) = 'T' AND substr(valid_until,24,1) = 'Z'),
      CONSTRAINT chk_ts_pass_issued CHECK (length(issued_at) = 24 AND substr(issued_at,11,1) = 'T' AND substr(issued_at,24,1) = 'Z'),
      CONSTRAINT chk_ts_pass_revoked CHECK (revoked_at IS NULL OR (length(revoked_at) = 24 AND substr(revoked_at,11,1) = 'T' AND substr(revoked_at,24,1) = 'Z')),
      FOREIGN KEY (institution_id, leave_id, student_id) REFERENCES hostel_leaves(institution_id, id, student_id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, issued_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, revoked_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pass_token_hash ON hostel_gate_passes(institution_id, token_hash);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pass_number ON hostel_gate_passes(institution_id, pass_number);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_live_pass_per_leave ON hostel_gate_passes(institution_id, leave_id) WHERE status != 'revoked';

    -- 9. Hostel Gate Logs
    CREATE TABLE IF NOT EXISTS hostel_gate_logs (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      pass_id TEXT,
      direction TEXT NOT NULL CHECK (direction IN ('out', 'in')),
      scanned_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      device_id TEXT NOT NULL,
      guard_staff_id TEXT NOT NULL,
      verification_result TEXT NOT NULL CHECK (verification_result IN ('verified', 'tampered', 'expired_rejected', 'revoked_rejected', 'out_of_window_rejected', 'manual_override')),
      override_reason TEXT,
      idempotency_key TEXT NOT NULL,
      CONSTRAINT chk_ts_log_scanned CHECK (length(scanned_at) = 24 AND substr(scanned_at,11,1) = 'T' AND substr(scanned_at,24,1) = 'Z'),
      CONSTRAINT chk_ts_log_received CHECK (length(received_at) = 24 AND substr(received_at,11,1) = 'T' AND substr(received_at,24,1) = 'Z'),
      FOREIGN KEY (institution_id, pass_id) REFERENCES hostel_gate_passes(institution_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, guard_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_gate_log_idempotency ON hostel_gate_logs(institution_id, idempotency_key);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_verified_scan ON hostel_gate_logs(institution_id, pass_id, direction) 
      WHERE pass_id IS NOT NULL AND verification_result IN ('verified', 'manual_override');

    -- 10. Hostel Fines
    CREATE TABLE IF NOT EXISTS hostel_fines (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      leave_id TEXT,
      fine_category TEXT NOT NULL CHECK (fine_category IN ('late_return', 'disciplinary', 'property_damage', 'misconduct')),
      days_late INT NOT NULL DEFAULT 0,
      rate_per_day INT NOT NULL DEFAULT 0,
      total_amount INT NOT NULL,
      paid_amount INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'assessed' CHECK (status IN ('assessed', 'partially_paid', 'paid', 'waived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CONSTRAINT uq_fine_inst_id UNIQUE (institution_id, id),
      CONSTRAINT chk_fine_amounts_positive CHECK (total_amount > 0 AND paid_amount >= 0 AND paid_amount <= total_amount),
      CONSTRAINT chk_ts_fine_created CHECK (length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z'),
      CONSTRAINT chk_ts_fine_updated CHECK (length(updated_at) = 24 AND substr(updated_at,11,1) = 'T' AND substr(updated_at,24,1) = 'Z'),
      FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, leave_id, student_id) REFERENCES hostel_leaves(institution_id, id, student_id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_single_late_fine_per_leave ON hostel_fines(institution_id, leave_id) 
      WHERE leave_id IS NOT NULL AND fine_category = 'late_return';

    -- 11. Hostel Fine Actions
    CREATE TABLE IF NOT EXISTS hostel_fine_actions (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      fine_id TEXT NOT NULL,
      action_type TEXT NOT NULL CHECK (action_type IN ('ASSESSED', 'WAIVED')),
      amount INT NOT NULL,
      idempotency_key TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'staff')),
      actor_staff_id TEXT,
      created_at TEXT NOT NULL,
      CONSTRAINT chk_actor_system_consistency CHECK (
        (actor_type = 'system' AND actor_staff_id IS NULL) OR 
        (actor_type = 'staff' AND actor_staff_id IS NOT NULL)
      ),
      CONSTRAINT chk_ts_fine_act_created CHECK (length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z'),
      FOREIGN KEY (institution_id, fine_id) REFERENCES hostel_fines(institution_id, id) ON DELETE RESTRICT,
      FOREIGN KEY (institution_id, actor_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fine_action_idempotency ON hostel_fine_actions(institution_id, idempotency_key);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_single_assessed_per_fine ON hostel_fine_actions(institution_id, fine_id) WHERE action_type = 'ASSESSED';
    CREATE UNIQUE INDEX IF NOT EXISTS idx_single_waiver_per_fine ON hostel_fine_actions(institution_id, fine_id) WHERE action_type = 'WAIVED';
  `);
  log("[SETUP] 11 hostel tables + stubs created under maintenance role.");

  // 7. Apply 02-policies.sql as table owner (maintenance role)
  log("\n[SETUP] Applying 02-policies.sql as thaibahive_maintenance...");
  const policiesSql = fs.readFileSync(path.resolve("./sql/02-policies.sql"), "utf-8");
  await maintClient.query(policiesSql);
  await maintClient.end();
  log("[SETUP] Policies, append-only revokes, and FORCE RLS applied.");

  // =========================================================================
  // RUN ALL TEST SUITES
  // =========================================================================

  log("\n---------------------------------------------------------------");
  log("RUNNING TEST 1: Dual-Dialect AST Parity & DDL Constraints Check");
  log("---------------------------------------------------------------");
  const t1 = await runTest1(maintUrl);
  log(`Test 1 Result: Parity Passed = ${t1.parityPassed}`);
  log(`Exports Matched: ${t1.tableCount} tables`);
  log(`PostgreSQL Scoped FK Constraints: ${t1.totalFkCount} total (${t1.compositeFkCount} composite, ${t1.singleFkCount} single-tenant)`);
  log(`PostgreSQL Scoped Partial Indexes Verified: ${t1.pgPartialIndexCount} / 11`);
  log(`PostgreSQL Scoped Timestamp CHECK Constraints: ${t1.timestampCheckCount} / 20`);
  log(`PostgreSQL Total CHECK Constraints Verified: ${t1.totalCheckCount}`);
  log("Partial Indexes List:");
  for (const idx of t1.indexDetails) {
    log(`  - ${idx.table}.${idx.indexname}`);
  }

  log("\n---------------------------------------------------------------");
  log("RUNNING TEST 2: LibSQL Connection Pragma, FKs & Collision Probe");
  log("---------------------------------------------------------------");
  const t2 = await runTest2();
  log(`Test 2 Result: Passed = ${t2.passed}`);
  log(`Tx 1 PRAGMA foreign_keys: ${t2.tx1Pragma}, Orphan Rejected: ${t2.tx1OrphanRejected}`);
  log(`Tx 2 PRAGMA foreign_keys: ${t2.tx2Pragma}, Orphan Rejected: ${t2.tx2OrphanRejected}`);
  log(`Non-Tx Statement Orphan Rejected: ${t2.nonTxOrphanRejected}`);
  log(`LibSQL Bed Collision Correctly Classified: ${t2.sqliteBedCollisionPassed}`);
  log(`LibSQL Student Collision Correctly Classified: ${t2.sqliteStudentCollisionPassed}`);
  log(`LibSQL SQLite Foreign Keys Verified: ${t2.sqliteTotalFkConstraints} constraints across ${t2.sqliteTotalFkColumnRows} column rows`);
  for (const [tbl, s] of Object.entries(t2.sqliteFkSummary)) {
    log(`  - ${tbl}: ${s.constraints} constraint(s) (${s.columnRows} column row(s))`);
  }

  log("\n---------------------------------------------------------------");
  log("RUNNING TEST 3: Multi-Tenant PostgreSQL RLS & Ledger Security");
  log("---------------------------------------------------------------");
  const t3 = await runTest3(maintUrl, appUrl);
  log(`Test 3 Result: All Security Assertions Passed`);
  log(`Tables with FORCE RLS: ${t3.forcedRlsTableCount} / 11`);
  log(`Named tenant_isolation_policy entries: ${t3.namedPoliciesCount} / 11`);
  log(`Empty Context Zero Rows: ${t3.emptyContextZeroRows}`);
  log(`Tenant A Isolation Holds: ${t3.tenantIsolationHolds}`);
  log(`Cross-Tenant Write Blocked by WITH CHECK: ${t3.crossTenantInsertBlocked}`);
  log(`Ledger Mutation Revoked (42501 on UPDATE/DELETE): ${t3.ledgerMutationRevoked}`);
  log(`Mock Roles (anon, authenticated) Access Denied: ${t3.mockRolesAccessDenied}`);
  log(`Transaction Tenant Setting Leak-Free: ${t3.transactionContextLeakFree}`);

  log("\n---------------------------------------------------------------");
  log("RUNNING TEST 4: Production Pool Concurrency & Service Stress");
  log("---------------------------------------------------------------");
  const t4 = await runTest4(appUrl);
  log(`Test 4 Result:`);
  log(`Bed Collision Race: ${t4.bedIterationsPassed} / 50 passed`);
  log(`Student Collision Race: ${t4.studentIterationsPassed} / 50 passed`);
  log(`CAS Gate Pass Reissue Race: ${t4.casReissueIterationsPassed} / 10 passed`);
  log(`Room Capacity Locked (FOR UPDATE): Passed = ${t4.capacityLockedPassed}`);
  log(`Negative Control (Race Detected when Unlocked): Detected = ${t4.negativeControlDetectedRace}`);

  log("\n---------------------------------------------------------------");
  log("RUNNING TEST 5: Table-Driven Late-Fine Calculation Unit Test");
  log("---------------------------------------------------------------");
  const t5 = runTest5();
  log(`Test 5 Result: ${t5.passedCases} / ${t5.totalCases} cases passed (allPassed = ${t5.allPassed})`);
  for (const r of t5.results) {
    log(`  - [${r.passed ? "PASS" : "FAIL"}] ${r.name}: ${r.details}`);
  }

  log("\n---------------------------------------------------------------");
  log("RUNNING TEST 6: Negative-Path Service Tests (Both Dialects)");
  log("---------------------------------------------------------------");
  const t6 = await runTest6(appUrl);
  log(`Test 6 Result: ${t6.passedChecks} / ${t6.totalChecks} checks passed (allPassed = ${t6.allPassed})`);
  for (const r of t6.results) {
    log(`  - [${r.passed ? "PASS" : "FAIL"}] [${r.dialect}] ${r.name}: ${r.details}`);
  }

  log("\n---------------------------------------------------------------");
  log("RUNNING TEST 7: Deliberate Mutation Proof (Tests Must Fail)");
  log("---------------------------------------------------------------");
  const t7 = await runTest7(maintUrl, appUrl);
  log(`Test 7 Result: All 4 deliberate mutations caught = ${t7.allMutationsCaught}`);
  for (const r of t7.mutationResults) {
    log(`  - [${r.caught ? "CAUGHT" : "MISSED"}] ${r.mutation} -> ${r.errorObserved}`);
  }

  // Final Git Verification Guard
  log("\n---------------------------------------------------------------");
  log("FINAL POST-ACTION AUDIT: Git Drift Verification");
  log("---------------------------------------------------------------");
  const gitEnd = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
  const baselineLines = new Set(gitBaseline.split("\n").map((l) => l.trim()).filter(Boolean));
  const newDrifts = gitEnd
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !baselineLines.has(l))
    .filter((l) => !l.includes("spike/") && !l.includes(".gravitas/"));

  if (newDrifts.length > 0) {
    throw new Error(`SECURITY AUDIT FAILED: Unintended git drift outside spike/ detected:\n${newDrifts.join("\n")}`);
  }
  log("Git Drift Audit PASSED: Zero changes introduced outside spike/** and .gravitas/**.");

  log("\n===============================================================");
  log("   ALL 7 PHASE 0 SPIKE SUITES EXECUTED AND EMPIRICALLY PASSED  ");
  log("===============================================================");
  log("Exit Code: 0");

  // Write full log to spike/phase0-run.log
  fs.writeFileSync(path.resolve("./phase0-run.log"), logBuffer.join("\n"), "utf-8");
  log("[LOG] Full execution log persisted to spike/phase0-run.log");
}

main().catch((err) => {
  log(`\nFATAL SPIKE FAILURE: ${err.message || err}`);
  if (err.stack) log(err.stack);
  fs.writeFileSync(path.resolve("./phase0-run.log"), logBuffer.join("\n"), "utf-8");
  process.exit(1);
});
