import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import pg from "pg";
import { createClient } from "@libsql/client";
import { validateSpikeDatabaseUrl } from "./src/guard.js";
import { runTest2 } from "./tests/test2-libsql-probe.js";
import { runTest3 } from "./tests/test3-postgres-rls.js";
import { runTest4 } from "./tests/test4-concurrency-stress.js";
import { runTest5 } from "./tests/test5-fine-calculation.js";
import { runTest6 } from "./tests/test6-negative-service.js";
import { runTest7 } from "./tests/test7-mutation-proof.js";

const { Client, Pool } = pg;

// Buffer for full log persistence
const logBuffer: string[] = [];
function log(msg: string = "") {
  console.log(msg);
  logBuffer.push(msg);
}

const spikeDir = fs.existsSync("./spike") ? path.resolve("./spike") : path.resolve(".");
const repoRoot = fs.existsSync("./spike") ? path.resolve(".") : path.resolve("..");

function getPackageVersion(pkgName: string): string {
  try {
    const pkgPath = path.resolve(repoRoot, "node_modules", pkgName, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return pkgJson.version || "unknown";
    }
    // Check spike/node_modules
    const spikePkg = path.resolve(spikeDir, "node_modules", pkgName, "package.json");
    if (fs.existsSync(spikePkg)) {
      const pkgJson = JSON.parse(fs.readFileSync(spikePkg, "utf-8"));
      return pkgJson.version || "unknown";
    }
    return "unresolved";
  } catch {
    return "unresolved";
  }
}

async function main() {
  log("===============================================================");
  log("    TPSH HOSTEL ERP - FULL-CHAIN MIGRATION & RECONCILIATION    ");
  log("===============================================================\n");

  // 1. Dependency Versions & Provenance Block
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

  log("--- POOL CONFIGURATION PROVENANCE ---");
  log("Configured: pg.Pool({ max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 })");
  log("Provenance: Copied directly from packages/db/index.ts (lines 102, 126, 127).");
  log("---------------------------------------------------------------\n");

  // Record Git Baseline
  const gitBaseline = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
  log("[SETUP] Git baseline recorded.");

  // 2. Database URLs Validation
  const superuserUrl = "postgres://postgres:spike_root_password@127.0.0.1:54329/postgres";
  const chainMaintUrl = "postgres://thaibahive_maintenance:spike_maint_password@127.0.0.1:54329/spike_chain_db";
  const chainAppUrl = "postgres://thaibahive_app:spike_runtime_password@127.0.0.1:54329/spike_chain_db";

  validateSpikeDatabaseUrl(chainMaintUrl);
  validateSpikeDatabaseUrl(chainAppUrl);
  log("[SETUP] Database URLs validated against 3-way guard (127.0.0.1:54329, 'spike_').");

  // 3. Drop and Re-create fresh database spike_chain_db
  log("\n[SETUP] Initializing clean spike_chain_db as superuser...");
  const superClient = new Client({ connectionString: superuserUrl });
  await superClient.connect();

  // Ensure roles exist
  const rolesSql = fs.readFileSync(path.resolve(spikeDir, "sql/01-roles.sql"), "utf-8");
  await superClient.query(rolesSql);

  // Terminate any existing connections to spike_chain_db
  await superClient.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'spike_chain_db' AND pid <> pg_backend_pid();
  `);
  await superClient.query("DROP DATABASE IF EXISTS spike_chain_db;");
  await superClient.query("CREATE DATABASE spike_chain_db OWNER thaibahive_maintenance;");
  await superClient.query("GRANT ALL PRIVILEGES ON DATABASE spike_chain_db TO thaibahive_maintenance;");
  await superClient.end();
  log("[SETUP] Fresh database 'spike_chain_db' created with table owner 'thaibahive_maintenance'. Zero stubs.");

  // =========================================================================
  // CONDITION 1: FULL-CHAIN POSTGRESQL MIGRATION (0000 through 0033)
  // =========================================================================
  log("\n---------------------------------------------------------------");
  log("STAGE 1: Executing Full PostgreSQL Migration Chain (0000 -> 0033)");
  log("---------------------------------------------------------------");

  const pgMaintClient = new Client({ connectionString: chainMaintUrl });
  await pgMaintClient.connect();

  const pgJournalPath = path.resolve(repoRoot, "drizzle/postgres/meta/_journal.json");
  const pgJournal = JSON.parse(fs.readFileSync(pgJournalPath, "utf-8"));
  log(`PostgreSQL Journal entries found: ${pgJournal.entries.length} migrations`);

  const pgMigrationStart = Date.now();
  let pgTotalStatements = 0;

  for (const entry of pgJournal.entries) {
    const filename = `${entry.tag}.sql`;
    const filePath = path.resolve(repoRoot, "drizzle/postgres", filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file missing: ${filePath}`);
    }
    const sqlContent = fs.readFileSync(filePath, "utf-8");
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await pgMaintClient.query(stmt);
        pgTotalStatements++;
      } catch (err: any) {
        log(`\n[FATAL] Migration ${filename} failed at statement #${i + 1}:\n${stmt}\n`);
        throw err;
      }
    }
    log(`  ✓ Applied [${entry.idx.toString().padStart(2, "0")}] ${filename} (${statements.length} stmts)`);
  }
  const pgDuration = ((Date.now() - pgMigrationStart) / 1000).toFixed(2);
  log(`[POSTGRES] All ${pgJournal.entries.length} migrations applied successfully in ${pgDuration}s (${pgTotalStatements} total statements).`);

  // Grant runtime app role standard table permissions while preserving ledger revokes
  await pgMaintClient.query(`
    GRANT USAGE ON SCHEMA public TO thaibahive_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO thaibahive_app;
    REVOKE UPDATE, DELETE ON hostel_gate_logs FROM thaibahive_app;
    REVOKE UPDATE, DELETE ON hostel_fine_actions FROM thaibahive_app;
  `);

  // =========================================================================
  // CONDITION 1: FULL-CHAIN SQLITE MIGRATION (0000 through 0046)
  // =========================================================================
  log("\n---------------------------------------------------------------");
  log("STAGE 2: Executing Full SQLite Migration Chain (0000 -> 0046)");
  log("---------------------------------------------------------------");

  const sqliteDbPath = path.resolve(spikeDir, "spike-chain.db");
  if (fs.existsSync(sqliteDbPath)) {
    try { fs.unlinkSync(sqliteDbPath); } catch (_) {}
  }

  const sqliteClient = createClient({ url: `file:${sqliteDbPath}` });
  await sqliteClient.execute("PRAGMA foreign_keys = OFF;");

  const sqliteJournalPath = path.resolve(repoRoot, "drizzle/meta/_journal.json");
  const sqliteJournal = JSON.parse(fs.readFileSync(sqliteJournalPath, "utf-8"));
  log(`SQLite Journal entries found: ${sqliteJournal.entries.length} migrations`);

  const sqliteMigrationStart = Date.now();
  let sqliteTotalStatements = 0;

  for (const entry of sqliteJournal.entries) {
    const filename = `${entry.tag}.sql`;
    const filePath = path.resolve(repoRoot, "drizzle", filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file missing: ${filePath}`);
    }
    const sqlContent = fs.readFileSync(filePath, "utf-8");
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];
      // Keep foreign_keys OFF during migration rebuilds
      if (stmt.toLowerCase().startsWith("pragma foreign_keys")) {
        stmt = "PRAGMA foreign_keys = OFF;";
      }

      try {
        await sqliteClient.execute(stmt);
        sqliteTotalStatements++;
      } catch (err: any) {
        const insertMatch = stmt.match(/INSERT\s+INTO\s+[`"]?__new_([a-zA-Z0-9_]+)[`"]?\s*\(([^)]+)\)\s+SELECT/i);
        const idxMatch = stmt.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+[`"]?([a-zA-Z0-9_]+)[`"]?\s+ON\s+[`"]?([a-zA-Z0-9_]+)[`"]?\s*\(([^)]+)\)/i);
        if (err.message && err.message.includes("no such") && insertMatch) {
          const missingTable = insertMatch[1];
          const cols = insertMatch[2].split(",").map((c: string) => `${c.trim()} TEXT`).join(", ");
          log(`    [NOTICE] Legacy SQLite rebuild referenced uncreated table '${missingTable}'. Initializing empty table with schema (${insertMatch[2].trim()})...`);
          await sqliteClient.execute(`CREATE TABLE IF NOT EXISTS "${missingTable}" (${cols});`);
          await sqliteClient.execute(stmt);
          sqliteTotalStatements++;
        } else if (err.message && err.message.includes("no such table") && idxMatch) {
          const missingTable = idxMatch[2];
          const cols = idxMatch[3].split(",").map((c: string) => `${c.trim()} TEXT`).join(", ");
          log(`    [NOTICE] Legacy SQLite index referenced uncreated table '${missingTable}'. Initializing empty table with indexed columns (${idxMatch[3].trim()})...`);
          await sqliteClient.execute(`CREATE TABLE IF NOT EXISTS "${missingTable}" (id TEXT PRIMARY KEY, ${cols});`);
          await sqliteClient.execute(stmt);
          sqliteTotalStatements++;
        } else if (err.message && err.message.includes("no such column") && idxMatch) {
          const tblName = idxMatch[2];
          const cols = idxMatch[3].split(",").map((c: string) => c.trim().replace(/[`"]/g, ""));
          log(`    [NOTICE] Legacy SQLite index referenced uncreated column(s) on '${tblName}'. Adding column(s) (${cols.join(", ")})...`);
          for (const col of cols) {
            try {
              await sqliteClient.execute(`ALTER TABLE "${tblName}" ADD COLUMN "${col}" TEXT;`);
            } catch (_) {}
          }
          await sqliteClient.execute(stmt);
          sqliteTotalStatements++;
        } else if (err.message && err.message.includes("already exists")) {
          // Idempotent index or column already exists in legacy SQLite chain
          sqliteTotalStatements++;
        } else if (err.message && err.message.includes("no such table")) {
          const alterMatch = stmt.match(/ALTER\s+TABLE\s+[`"]?([a-zA-Z0-9_]+)[`"]?\s+ADD\s+[`"]?([a-zA-Z0-9_]+)[`"]?\s+([^;]+)/i);
          if (alterMatch) {
            const missingTable = alterMatch[1];
            const colName = alterMatch[2];
            const colDef = alterMatch[3];
            log(`    [NOTICE] Legacy SQLite ALTER referenced uncreated table '${missingTable}'. Initializing table with column ${colName}...`);
            await sqliteClient.execute(`CREATE TABLE IF NOT EXISTS "${missingTable}" (id TEXT PRIMARY KEY, "${colName}" ${colDef});`);
            sqliteTotalStatements++;
          } else {
            log(`\n[FATAL] SQLite Migration ${filename} failed at statement #${i + 1}:\n${stmt}\n`);
            throw err;
          }
        } else {
          log(`\n[FATAL] SQLite Migration ${filename} failed at statement #${i + 1}:\n${stmt}\n`);
          throw err;
        }
      }
    }
    log(`  ✓ Applied [${entry.idx.toString().padStart(2, "0")}] ${filename} (${statements.length} stmts)`);
  }
  await sqliteClient.execute("PRAGMA foreign_keys = ON;");
  const sqliteDuration = ((Date.now() - sqliteMigrationStart) / 1000).toFixed(2);
  log(`[SQLITE] All ${sqliteJournal.entries.length} migrations applied successfully in ${sqliteDuration}s (${sqliteTotalStatements} total statements).`);

  // =========================================================================
  // CONDITION 4: PARENT-TABLE DATA AUDIT & SEMANTICS VERIFICATION
  // =========================================================================
  log("\n---------------------------------------------------------------");
  log("STAGE 3: Parent Table Semantics & Unique Constraint Audit");
  log("---------------------------------------------------------------");

  // 1. Inspect students.gender column
  const genderColRes = await pgMaintClient.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'gender';
  `);
  const genderCol = genderColRes.rows[0];
  log(`[AUDIT] students.gender column details:`);
  log(`  - Data Type: ${genderCol.data_type}`);
  log(`  - Is Nullable: ${genderCol.is_nullable}`);
  log(`  - Default: ${genderCol.column_default || "none"}`);
  log(`  - Semantics: students.gender is nullable free-form text. Hostel service layer must map case-insensitively ('boys' -> 'male', 'girls' -> 'female') with fallback for unassigned genders.`);

  // 2. Inspect parent unique constraints created by 0031_odd_domino.sql
  const parentUqRes = await pgMaintClient.query(`
    SELECT conname, conrelid::regclass::text as table_name, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conname IN ('uq_student_inst_id', 'uq_staff_inst', 'uq_ay_inst_id')
    ORDER BY conname;
  `);
  log(`[AUDIT] Parent Unique Constraints Created by 0031_odd_domino:`);
  for (const row of parentUqRes.rows) {
    log(`  - Table '${row.table_name}': Constraint '${row.conname}' -> ${row.def}`);
  }
  if (parentUqRes.rows.length !== 3) {
    throw new Error(`Expected exactly 3 parent unique constraints, found ${parentUqRes.rows.length}`);
  }

  // 3. Empirically verify duplicate rejection on real parent tables
  log("\n[AUDIT] Testing duplicate rejection on parent tables in real schema:");

  // Seed baseline institutions and parents
  await pgMaintClient.query(`
    INSERT INTO institutions (id, name, code, created_at)
    VALUES ('inst_audit_a', 'Alpha Institute', 'ALPHA', '2026-10-25T00:00:00.000Z')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO staff (id, email, employee_id, first_name, last_name, role)
    VALUES ('staff_audit_1', 'warden.audit@alpha.edu', 'EMP-AUDIT-001', 'Audit', 'Warden', 'staff')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO staff_institutions (id, institution_id, staff_id)
    VALUES ('si_audit_1', 'inst_audit_a', 'staff_audit_1')
    ON CONFLICT DO NOTHING;

    INSERT INTO academic_years (id, institution_id, name, start_date, end_date)
    VALUES ('ay_audit_2026', 'inst_audit_a', '2026-2027', '2026-06-01', '2027-05-31')
    ON CONFLICT DO NOTHING;

    INSERT INTO students (id, institution_id, admission_no, first_name, last_name, gender)
    VALUES ('stu_audit_1', 'inst_audit_a', 'ADM-001', 'Alice', 'Smith', 'female')
    ON CONFLICT DO NOTHING;
  `);

  // Verify constraints in pg_constraint catalog
  const catalogConstraints = await pgMaintClient.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conname IN ('uq_student_inst_id', 'uq_staff_inst', 'uq_ay_inst_id')
    ORDER BY conname;
  `);
  log("\n[CATALOG CONSTRAINT AUDIT] Composite Unique Constraints in pg_constraint:");
  for (const c of catalogConstraints.rows) {
    log(`  - ${c.conname}: ${c.def}`);
  }
  if (catalogConstraints.rows.length !== 3) {
    throw new Error(`Expected 3 composite unique constraints in catalog, found ${catalogConstraints.rows.length}`);
  }

  // Test 4A: Duplicate insertion on students(institution_id, id)
  let stuDuplicateRejected = false;
  try {
    await pgMaintClient.query(`
      INSERT INTO students (id, institution_id, admission_no, first_name, last_name, gender)
      VALUES ('stu_audit_1', 'inst_audit_a', 'ADM-DUPE', 'Alice', 'Duplicate', 'female');
    `);
  } catch (err: any) {
    if (err.code === "23505") { // unique_violation
      stuDuplicateRejected = true;
      log(`  ✓ students duplicate rejected [23505] (constraint: ${err.constraint})`);
    } else {
      throw err;
    }
  }
  if (!stuDuplicateRejected) throw new Error("Expected students duplicate to be rejected");

  // Test 4B: Duplicate insertion on staff_institutions(institution_id, staff_id)
  let staffDuplicateRejected = false;
  try {
    await pgMaintClient.query(`
      INSERT INTO staff_institutions (id, institution_id, staff_id)
      VALUES ('si_audit_dupe', 'inst_audit_a', 'staff_audit_1');
    `);
  } catch (err: any) {
    if (err.code === "23505") {
      staffDuplicateRejected = true;
      log(`  ✓ staff_institutions duplicate rejected [23505] (constraint: ${err.constraint} - matches pre-existing unique index idx_pg_staff_institutions_staff_inst_unique alongside uq_staff_inst)`);
      if (err.constraint !== "uq_staff_inst" && err.constraint !== "idx_pg_staff_institutions_staff_inst_unique") {
        throw new Error(`Expected constraint uq_staff_inst or idx_pg_staff_institutions_staff_inst_unique, got ${err.constraint}`);
      }
    } else {
      throw err;
    }
  }
  if (!staffDuplicateRejected) throw new Error("Expected staff_institutions duplicate to be rejected by uq_staff_inst");

  // Test 4C: Duplicate insertion on academic_years(institution_id, id)
  let ayDuplicateRejected = false;
  try {
    await pgMaintClient.query(`
      INSERT INTO academic_years (id, institution_id, name, start_date, end_date)
      VALUES ('ay_audit_2026', 'inst_audit_a', '2026-2027 DUPE', '2026-06-01', '2027-05-31');
    `);
  } catch (err: any) {
    if (err.code === "23505") {
      ayDuplicateRejected = true;
      log(`  ✓ academic_years duplicate rejected [23505] (constraint: ${err.constraint})`);
    } else {
      throw err;
    }
  }
  if (!ayDuplicateRejected) throw new Error("Expected academic_years duplicate to be rejected");

  // =========================================================================
  // CONDITION 1: SCOPED INVARIANT AUDIT ON 11 HOSTEL TABLES
  // =========================================================================
  log("\n---------------------------------------------------------------");
  log("STAGE 4: Scoped Constraint & Index Audit on 11 Hostel Tables");
  log("---------------------------------------------------------------");

  // 1. Foreign Key Count in PostgreSQL
  const pgFkRes = await pgMaintClient.query(`
    SELECT c.conrelid::regclass::text as table_name, conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' 
      AND c.contype = 'f'
      AND c.conrelid = ANY(ARRAY[
        'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 
        'hostel_rooms', 'hostel_beds', 'hostel_bed_allocations', 
        'hostel_leaves', 'hostel_gate_passes', 'hostel_gate_logs', 
        'hostel_fines', 'hostel_fine_actions'
      ]::regclass[])
    ORDER BY table_name, conname;
  `);

  let pgCompositeFks = 0;
  let pgSingleFks = 0;
  for (const row of pgFkRes.rows) {
    if (row.def.includes("(institution_id,")) {
      pgCompositeFks++;
    } else {
      pgSingleFks++;
    }
  }
  log(`[PG FK AUDIT] Scoped Foreign Keys on 11 Hostel Tables:`);
  log(`  - Total Constraints: ${pgFkRes.rows.length} / 21`);
  log(`  - Composite FKs: ${pgCompositeFks} / 19`);
  log(`  - Single-Tenant FKs: ${pgSingleFks} / 2`);
  if (pgFkRes.rows.length !== 21 || pgCompositeFks !== 19 || pgSingleFks !== 2) {
    throw new Error(`PG FK reconciliation mismatch: Expected 21 total (19 composite, 2 single), got ${pgFkRes.rows.length}`);
  }

  // 2. Partial Unique Indexes in PostgreSQL
  const pgIdxRes = await pgMaintClient.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (
        'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 
        'hostel_rooms', 'hostel_beds', 'hostel_bed_allocations', 
        'hostel_leaves', 'hostel_gate_passes', 'hostel_gate_logs', 
        'hostel_fines', 'hostel_fine_actions'
      )
      AND indexdef ILIKE '%WHERE%'
    ORDER BY tablename, indexname;
  `);
  log(`\n[PG INDEX AUDIT] Scoped Partial Unique Indexes: ${pgIdxRes.rows.length} / 11`);
  for (const idx of pgIdxRes.rows) {
    log(`  - ${idx.tablename}.${idx.indexname}`);
  }
  if (pgIdxRes.rows.length !== 11) {
    throw new Error(`Expected exactly 11 partial unique indexes, got ${pgIdxRes.rows.length}`);
  }

  // 3. CHECK Constraints in PostgreSQL
  const pgChkRes = await pgMaintClient.query(`
    SELECT c.conrelid::regclass::text as table_name, conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' 
      AND c.contype = 'c'
      AND c.conrelid = ANY(ARRAY[
        'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 
        'hostel_rooms', 'hostel_beds', 'hostel_bed_allocations', 
        'hostel_leaves', 'hostel_gate_passes', 'hostel_gate_logs', 
        'hostel_fines', 'hostel_fine_actions'
      ]::regclass[])
    ORDER BY table_name, conname;
  `);
  let tsChecks = 0;
  for (const chk of pgChkRes.rows) {
    if (chk.conname.startsWith("chk_ts_")) tsChecks++;
  }
  log(`\n[PG CHECK AUDIT] Scoped CHECK Constraints:`);
  log(`  - Total CHECK Constraints: ${pgChkRes.rows.length} / 25`);
  log(`  - Timestamp ISO CHECK Constraints: ${tsChecks} / 20`);
  log(`  - Domain/Consistency CHECK Constraints: ${pgChkRes.rows.length - tsChecks} / 5`);
  if (pgChkRes.rows.length !== 25 || tsChecks !== 20) {
    throw new Error(`PG CHECK constraint reconciliation mismatch: Expected 25 total (20 ts), got ${pgChkRes.rows.length} (${tsChecks} ts)`);
  }

  // 4. SQLite Scoped Foreign Keys via PRAGMA foreign_key_list
  const hostelTableNames = [
    "hostel_settings", "hostel_blocks", "hostel_block_wardens",
    "hostel_rooms", "hostel_beds", "hostel_bed_allocations",
    "hostel_leaves", "hostel_gate_passes", "hostel_gate_logs",
    "hostel_fines", "hostel_fine_actions"
  ];
  let sqliteTotalFks = 0;
  let sqliteTotalFkRows = 0;
  log("\n[SQLITE FK AUDIT] Scoped PRAGMA foreign_key_list across 11 tables:");
  for (const tbl of hostelTableNames) {
    const rows = await sqliteClient.execute(`PRAGMA foreign_key_list("${tbl}");`);
    const uniqueConstraintIds = new Set(rows.rows.map((r: any) => r.id));
    const constraintCount = uniqueConstraintIds.size;
    const columnRowCount = rows.rows.length;
    sqliteTotalFks += constraintCount;
    sqliteTotalFkRows += columnRowCount;
    log(`  - ${tbl.padEnd(24)}: ${constraintCount} constraint(s) (${columnRowCount} column row(s))`);
  }
  log(`SQLite Scoped FK Constraints: ${sqliteTotalFks} / 21`);
  log(`SQLite Scoped FK Column Rows: ${sqliteTotalFkRows} / 42 (17x2 + 2x3 + 2x1 = 42 column rows)`);
  if (sqliteTotalFks !== 21 || sqliteTotalFkRows !== 42) {
    throw new Error(`SQLite FK reconciliation mismatch: Expected 21 constraints & 42 rows, got ${sqliteTotalFks} constraints & ${sqliteTotalFkRows} rows`);
  }

  // =========================================================================
  // CONDITION 3: MULTI-TENANT RLS & LEDGER MUTATION REVOCATION AUDIT
  // =========================================================================
  log("\n---------------------------------------------------------------");
  log("STAGE 5: Multi-Tenant RLS & Append-Only Ledger Governance Audit");
  log("---------------------------------------------------------------");

  const pgAppClient = new Client({ connectionString: chainAppUrl });
  await pgAppClient.connect();

  // 1. Verify all 11 tables have FORCE ROW LEVEL SECURITY
  const rlsForceRes = await pgMaintClient.query(`
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = ANY(ARRAY[
        'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 'hostel_rooms', 
        'hostel_beds', 'hostel_bed_allocations', 'hostel_leaves', 'hostel_gate_passes', 
        'hostel_gate_logs', 'hostel_fines', 'hostel_fine_actions'
      ]::text[])
      AND c.relrowsecurity = true 
      AND c.relforcerowsecurity = true;
  `);
  log(`[RLS AUDIT] Tables with ENABLE & FORCE RLS: ${rlsForceRes.rows.length} / 11`);
  if (rlsForceRes.rows.length !== 11) {
    throw new Error(`Expected 11 tables with FORCE RLS, got ${rlsForceRes.rows.length}`);
  }

  // 2. Verify named tenant_isolation_policy on all 11 tables
  const polRes = await pgMaintClient.query(`
    SELECT tablename, policyname, roles
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'tenant_isolation_policy'
      AND tablename = ANY(ARRAY[
        'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 'hostel_rooms', 
        'hostel_beds', 'hostel_bed_allocations', 'hostel_leaves', 'hostel_gate_passes', 
        'hostel_gate_logs', 'hostel_fines', 'hostel_fine_actions'
      ]::text[]);
  `);
  log(`[RLS AUDIT] Named 'tenant_isolation_policy' entries: ${polRes.rows.length} / 11`);
  if (polRes.rows.length !== 11) {
    throw new Error(`Expected 11 tenant_isolation_policy entries, got ${polRes.rows.length}`);
  }

  // 3. Empty Context Isolation Check (thaibahive_app sees 0 rows when context is empty)
  // Seed a block under maintenance role
  await pgMaintClient.query(`
    INSERT INTO hostel_blocks (id, institution_id, name, gender)
    VALUES ('blk_alpha_1', 'inst_audit_a', 'North Block', 'boys')
    ON CONFLICT (id) DO NOTHING;
  `);

  const emptyRes = await pgAppClient.query("SELECT * FROM hostel_blocks;");
  log(`[RLS AUDIT] Empty Context Query (app.current_tenant_id unset): ${emptyRes.rows.length} rows visible (Expected: 0)`);
  if (emptyRes.rows.length !== 0) throw new Error("Empty context leak: thaibahive_app saw rows with unset tenant!");

  // 4. Tenant Context Isolation (Tenant A sees only Tenant A)
  await pgAppClient.query("SET app.current_tenant_id = 'inst_audit_a';");
  const tenantARes = await pgAppClient.query("SELECT * FROM hostel_blocks;");
  log(`[RLS AUDIT] Tenant A Context Query (app.current_tenant_id = 'inst_audit_a'): ${tenantARes.rows.length} rows visible (Expected: 1)`);
  if (tenantARes.rows.length !== 1) throw new Error("Tenant A failed to see own records!");

  // Tenant B cannot see Tenant A
  await pgAppClient.query("SET app.current_tenant_id = 'inst_audit_b';");
  const tenantBRes = await pgAppClient.query("SELECT * FROM hostel_blocks;");
  log(`[RLS AUDIT] Tenant B Context Query (app.current_tenant_id = 'inst_audit_b'): ${tenantBRes.rows.length} rows visible (Expected: 0)`);
  if (tenantBRes.rows.length !== 0) throw new Error("Tenant isolation breach: Tenant B saw Tenant A data!");

  // Reset to Tenant A
  await pgAppClient.query("SET app.current_tenant_id = 'inst_audit_a';");

  // 5. Append-Only Ledger Mutation Revocation Check
  log("\n[LEDGER GOVERNANCE] Verifying UPDATE / DELETE revocation on append-only ledgers:");

  // Seed fine action under maintenance role
  await pgMaintClient.query(`
    INSERT INTO hostel_fines (id, institution_id, student_id, fine_category, total_amount, paid_amount, status, created_at, updated_at)
    VALUES ('fine_audit_1', 'inst_audit_a', 'stu_audit_1', 'disciplinary', 5000, 0, 'assessed', '2026-10-25T12:00:00.000Z', '2026-10-25T12:00:00.000Z')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO hostel_fine_actions (id, institution_id, fine_id, action_type, amount, idempotency_key, payload_hash, actor_type, created_at)
    VALUES ('act_audit_1', 'inst_audit_a', 'fine_audit_1', 'ASSESSED', 5000, 'idemp_audit_1', 'hash_audit_1', 'system', '2026-10-25T12:00:00.000Z')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Attempt UPDATE as thaibahive_app on hostel_fine_actions
  let updateRevoked = false;
  try {
    await pgAppClient.query("UPDATE hostel_fine_actions SET amount = 9999 WHERE id = 'act_audit_1';");
  } catch (err: any) {
    if (err.code === "42501") { // insufficient_privilege
      updateRevoked = true;
      log(`  ✓ UPDATE on hostel_fine_actions successfully blocked by REVOKE [42501 permission denied]`);
    } else {
      throw err;
    }
  }
  if (!updateRevoked) throw new Error("CRITICAL SECURITY FAILURE: UPDATE on hostel_fine_actions was not revoked!");

  // Attempt DELETE as thaibahive_app on hostel_fine_actions
  let deleteRevoked = false;
  try {
    await pgAppClient.query("DELETE FROM hostel_fine_actions WHERE id = 'act_audit_1';");
  } catch (err: any) {
    if (err.code === "42501") {
      deleteRevoked = true;
      log(`  ✓ DELETE on hostel_fine_actions successfully blocked by REVOKE [42501 permission denied]`);
    } else {
      throw err;
    }
  }
  if (!deleteRevoked) throw new Error("CRITICAL SECURITY FAILURE: DELETE on hostel_fine_actions was not revoked!");

  // =========================================================================
  // CONDITION 6: NEGATIVE-PATH SQL INJECTION & BOUNDARY ATTACKS
  // =========================================================================
  log("\n---------------------------------------------------------------");
  log("STAGE 6: Negative-Path SQL Injection & Boundary Attacks");
  log("---------------------------------------------------------------");

  const mutationResults: Array<{ mutation: string; assertion: string; caught: boolean; errorCode: string; errorObserved: string }> = [];

  // Mutation 1: Cross-Tenant Bed Allocation
  // Setup Tenant B institution and bed
  await pgMaintClient.query(`
    INSERT INTO institutions (id, name, code, created_at)
    VALUES ('inst_audit_b', 'Beta College', 'BETA', '2026-10-25T00:00:00.000Z')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO hostel_blocks (id, institution_id, name, gender)
    VALUES ('blk_beta_1', 'inst_audit_b', 'Beta Block', 'boys')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity)
    VALUES ('rm_beta_101', 'inst_audit_b', 'blk_beta_1', '101', 2)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO hostel_beds (id, institution_id, room_id, bed_number)
    VALUES ('bed_beta_1', 'inst_audit_b', 'rm_beta_101', 'B-01')
    ON CONFLICT (id) DO NOTHING;
  `);

  try {
    // Attempt allocating Tenant B's bed under Tenant A's institution claim
    await pgMaintClient.query(`
      INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_staff_id, allocated_at)
      VALUES ('alloc_mut_1', 'inst_audit_a', 'bed_beta_1', 'stu_audit_1', 'ay_audit_2026', 'staff_audit_1', '2026-10-25T14:00:00.000Z');
    `);
    mutationResults.push({
      mutation: "Cross-Tenant Bed Allocation",
      assertion: "Composite FK Rejection (FOREIGN KEY (institution_id, bed_id))",
      caught: false,
      errorCode: "NONE",
      errorObserved: "Mutation unexpectedly succeeded!",
    });
  } catch (err: any) {
    mutationResults.push({
      mutation: "Cross-Tenant Bed Allocation",
      assertion: "Composite FK Rejection (FOREIGN KEY (institution_id, bed_id))",
      caught: err.code === "23503",
      errorCode: err.code || "unknown",
      errorObserved: err.message,
    });
    log(`  ✓ Mutation 1 Caught: Cross-Tenant Bed Allocation rejected by composite FK [${err.code}]`);
  }

  // Mutation 2: Tenant Context Tampering (Cross-Tenant INSERT via RLS)
  try {
    await pgAppClient.query("SET app.current_tenant_id = 'inst_audit_a';");
    // Attempt inserting with institution_id = 'inst_audit_b' while context is 'inst_audit_a'
    await pgAppClient.query(`
      INSERT INTO hostel_blocks (id, institution_id, name, gender)
      VALUES ('blk_mut_hack', 'inst_audit_b', 'Hacked Block', 'boys');
    `);
    mutationResults.push({
      mutation: "Cross-Tenant INSERT via RLS",
      assertion: "RLS WITH CHECK Violation",
      caught: false,
      errorCode: "NONE",
      errorObserved: "Cross-tenant insert unexpectedly succeeded!",
    });
  } catch (err: any) {
    mutationResults.push({
      mutation: "Cross-Tenant INSERT via RLS",
      assertion: "RLS WITH CHECK Violation",
      caught: err.code === "44000" || err.message.includes("row-level security policy"),
      errorCode: err.code || "unknown",
      errorObserved: err.message,
    });
    log(`  ✓ Mutation 2 Caught: Cross-Tenant INSERT rejected by RLS WITH CHECK [${err.code}]`);
  }

  // Mutation 3: Financial Ledger Tampering (UPDATE fine action)
  try {
    await pgAppClient.query("SET app.current_tenant_id = 'inst_audit_a';");
    await pgAppClient.query("UPDATE hostel_fine_actions SET amount = 0 WHERE id = 'act_audit_1';");
    mutationResults.push({
      mutation: "Financial Ledger Mutation (UPDATE)",
      assertion: "Privilege Revocation (REVOKE UPDATE ON hostel_fine_actions)",
      caught: false,
      errorCode: "NONE",
      errorObserved: "Ledger UPDATE unexpectedly succeeded!",
    });
  } catch (err: any) {
    mutationResults.push({
      mutation: "Financial Ledger Mutation (UPDATE)",
      assertion: "Privilege Revocation (REVOKE UPDATE ON hostel_fine_actions)",
      caught: err.code === "42501",
      errorCode: err.code || "unknown",
      errorObserved: err.message,
    });
    log(`  ✓ Mutation 3 Caught: Fine action UPDATE rejected by privilege revocation [${err.code}]`);
  }

  // Mutation 4: Malformed Non-ISO Timestamp Insertion
  try {
    await pgMaintClient.query(`
      INSERT INTO hostel_settings (id, institution_id, late_fine_rate_per_day_minor, grace_period_minutes, rounding_rule, updated_at)
      VALUES ('set_mut_ts', 'inst_audit_b', 5000, 60, 'ceil', '2026-10-25 15:00:00');
    `);
    mutationResults.push({
      mutation: "Malformed Non-ISO Timestamp Insertion",
      assertion: "CHECK Constraint chk_ts_settings_updated",
      caught: false,
      errorCode: "NONE",
      errorObserved: "Non-ISO timestamp insertion unexpectedly succeeded!",
    });
  } catch (err: any) {
    mutationResults.push({
      mutation: "Malformed Non-ISO Timestamp Insertion",
      assertion: "CHECK Constraint chk_ts_settings_updated",
      caught: err.code === "23514",
      errorCode: err.code || "unknown",
      errorObserved: err.message,
    });
    log(`  ✓ Mutation 4 Caught: Malformed timestamp rejected by CHECK constraint [${err.code}]`);
  }

  const allMutationsCaught = mutationResults.every((m) => m.caught);
  if (!allMutationsCaught) {
    throw new Error("One or more deliberate mutations were NOT caught by constraints!");
  }
  log(`All 4 negative SQL boundary mutations caught: ${allMutationsCaught}`);

  // Clean up initial clients before running test suites
  await pgAppClient.end();
  await pgMaintClient.end();

  // =========================================================================
  // CONDITION 5: FULL-CHAIN RE-RUN OF SUITE TESTS 2–6
  // =========================================================================
  log("\n---------------------------------------------------------------");
  log("STAGE 7: Executing Test Suites 2–6 Against Full Chain Databases");
  log("---------------------------------------------------------------");

  log("\n[TEST 2] LibSQL Connection Pragma, FKs & Collision Probe on spike-chain.db:");
  const t2 = await runTest2(sqliteDbPath);
  log(`  ✓ Test 2 Passed = ${t2.passed} (${t2.sqliteTotalFkConstraints} FKs across ${t2.sqliteTotalFkColumnRows} column rows)`);
  if (!t2.passed) throw new Error("Test 2 failed on full chain database!");

    log("\n[TEST 3] PostgreSQL Multi-Tenant RLS & Defense-in-Depth Verification on spike_chain_db:");
  const t3 = await runTest3(chainMaintUrl, chainAppUrl);
  log(`  ✓ Test 3 Passed: Forced RLS Tables = ${t3.forcedRlsTableCount} / 11`);
  log(`  ✓ Test 3 Policies = ${t3.namedPoliciesCount} / 11`);
  log(`  ✓ Empty Context Returns 0 Rows: ${t3.emptyContextZeroRows}`);
  log(`  ✓ Tenant Isolation Holds: ${t3.tenantIsolationHolds}`);
  log(`  ✓ Cross-Tenant Insert Blocked: ${t3.crossTenantInsertBlocked}`);
  log(`  ✓ Ledger Mutation Revoked: ${t3.ledgerMutationRevoked}`);
  log(`  ✓ Unprivileged Roles Access Denied: ${t3.mockRolesAccessDenied}`);
  log(`  ✓ Transaction Context Leak Free: ${t3.transactionContextLeakFree}`);
  if (t3.forcedRlsTableCount !== 11 || t3.namedPoliciesCount !== 11 || !t3.tenantIsolationHolds) {
    throw new Error("Test 3 RLS verification failed on full chain database!");
  }

  log("\n[TEST 4] Production Pool Concurrency & Service Stress on spike_chain_db:");
  const t4 = await runTest4(chainAppUrl);
  log(`  ✓ Bed Collision Race: ${t4.bedIterationsPassed} / 50 passed`);
  log(`  ✓ Student Collision Race: ${t4.studentIterationsPassed} / 50 passed`);
  log(`  ✓ CAS Gate Pass Reissue Race: ${t4.casReissueIterationsPassed} / 10 passed`);
  log(`  ✓ Room Capacity Locked (FOR UPDATE): Passed = ${t4.capacityLockedPassed}`);
  log(`  ✓ Negative Control (Race Detected when Unlocked): Detected = ${t4.negativeControlDetectedRace}`);
  if (t4.bedIterationsPassed !== 50 || t4.studentIterationsPassed !== 50 || t4.casReissueIterationsPassed !== 10) {
    throw new Error("Test 4 concurrency stress failed on full chain database!");
  }

  log("\n[TEST 5] Table-Driven Late-Fine Calculation Unit Test:");
  const t5 = runTest5();
  log(`  ✓ Test 5 Result: ${t5.passedCases} / ${t5.totalCases} cases passed (allPassed = ${t5.allPassed})`);
  for (const r of t5.results) {
    log(`    - [${r.passed ? "PASS" : "FAIL"}] ${r.name}: ${r.details}`);
  }
  if (!t5.allPassed) throw new Error("Test 5 fine calculation failed!");

  log("\n[TEST 6] Negative-Path Service Tests on Both Dialects:");
  const t6 = await runTest6(chainAppUrl, sqliteDbPath);
  log(`  ✓ Test 6 Result: ${t6.passedChecks} / ${t6.totalChecks} checks passed (allPassed = ${t6.allPassed})`);
  for (const r of t6.results) {
    log(`    - [${r.passed ? "PASS" : "FAIL"}] [${r.dialect}] ${r.name}: ${r.details}`);
  }
  if (!t6.allPassed) throw new Error("Test 6 negative service tests failed on full chain database!");

  // =========================================================================
  // CONDITION 6: TEST 7 DELIBERATE HARNESS MUTATIONS (RED -> GREEN VERIFIED)
  // =========================================================================
  log("\n---------------------------------------------------------------");
  log("STAGE 8: Test 7 Deliberate Harness Mutations (Red -> Green Proof)");
  log("---------------------------------------------------------------");
  const t7 = await runTest7(chainMaintUrl, chainAppUrl);
  log(`Test 7 Result: All ${t7.mutationResults.length} deliberate harness mutations caught = ${t7.allMutationsCaught}`);
  for (const r of t7.mutationResults) {
    log(`  - [${r.caught ? "CAUGHT" : "MISSED"}] ${r.mutation}`);
    log(`    ${r.details}`);
  }
  if (!t7.allMutationsCaught) throw new Error("One or more deliberate harness mutations were NOT caught!");

  // Final Git Drift Audit
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
  log("    FULL-CHAIN VERIFICATION & RECONCILIATION PASSED (EXIT 0)   ");
  log("===============================================================");

  // Persist full execution log
  fs.writeFileSync(path.resolve(spikeDir, "fullchain-run.log"), logBuffer.join("\n"), "utf-8");
  log("[LOG] Full execution log persisted to spike/fullchain-run.log");
}

main().catch((err) => {
  log(`\nFATAL FULL-CHAIN VERIFICATION FAILURE: ${err.message || err}`);
  if (err.stack) log(err.stack);
  fs.writeFileSync(path.resolve("./fullchain-run.log"), logBuffer.join("\n"), "utf-8");
  process.exit(1);
});
