import pg from "pg";
import { validateSpikeDatabaseUrl } from "../src/guard.js";
import { runTest3 } from "./test3-postgres-rls.js";

const { Client } = pg;

export async function runTest7(
  maintUrl: string,
  appUrl: string
): Promise<{
  allMutationsCaught: boolean;
  mutationResults: Array<{ mutation: string; redVerified: boolean; greenVerified: boolean; caught: boolean; errorObserved: string; details: string }>;
}> {
  validateSpikeDatabaseUrl(maintUrl);
  validateSpikeDatabaseUrl(appUrl);

  const maint = new Client({ connectionString: maintUrl });
  await maint.connect();

  const results: Array<{ mutation: string; redVerified: boolean; greenVerified: boolean; caught: boolean; errorObserved: string; details: string }> = [];

  try {
    // -----------------------------------------------------------------------
    // Mutation 1: Drop one RLS policy (tenant_isolation_policy on hostel_settings)
    // -----------------------------------------------------------------------
    await maint.query("DROP POLICY tenant_isolation_policy ON hostel_settings;");
    let m1Red = false;
    let m1Error = "";
    try {
      await runTest3(maintUrl, appUrl);
    } catch (e: any) {
      m1Red = true;
      m1Error = e.message;
    } finally {
      // Revert Mutation 1
      await maint.query(`
        CREATE POLICY tenant_isolation_policy ON hostel_settings 
        FOR ALL TO thaibahive_app 
        USING (institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')) 
        WITH CHECK (institution_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
      `);
    }
    let m1Green = false;
    try {
      const res = await runTest3(maintUrl, appUrl);
      m1Green = res.namedPoliciesCount === 11;
    } catch (_) {}

    results.push({
      mutation: "1. Drop tenant_isolation_policy on hostel_settings",
      redVerified: m1Red && m1Error.includes("Expected exactly 11 tenant_isolation_policy"),
      greenVerified: m1Green,
      caught: m1Red && m1Green,
      errorObserved: m1Error || "Passed",
      details: `RED: Caught '${m1Error}' | GREEN: Reverted successfully (11 policies)`,
    });

    // -----------------------------------------------------------------------
    // Mutation 2: Drop partial index idx_active_student_allocation
    // -----------------------------------------------------------------------
    // Setup test bed allocation
    await maint.query(`
      INSERT INTO institutions (id, name, code, created_at) VALUES ('inst-mut', 'Mut College', 'MUT', '2026-10-25T00:00:00.000Z') ON CONFLICT DO NOTHING;
      INSERT INTO hostel_blocks (id, institution_id, name, gender) VALUES ('blk-mut-1', 'inst-mut', 'Mut Block', 'boys') ON CONFLICT DO NOTHING;
      INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity) VALUES ('rm-mut-1', 'inst-mut', 'blk-mut-1', '101', 5) ON CONFLICT DO NOTHING;
      INSERT INTO hostel_beds (id, institution_id, room_id, bed_number) VALUES ('bed-mut-1', 'inst-mut', 'rm-mut-1', 'B1'), ('bed-mut-2', 'inst-mut', 'rm-mut-1', 'B2') ON CONFLICT DO NOTHING;
      INSERT INTO staff (id, employee_id, email, first_name, last_name, role) VALUES ('stf-mut-1', 'EMP-M1', 'mut@inst.edu', 'Mut', 'Staff', 'staff') ON CONFLICT DO NOTHING;
      INSERT INTO staff_institutions (id, institution_id, staff_id) VALUES ('si-mut-1', 'inst-mut', 'stf-mut-1') ON CONFLICT DO NOTHING;
      INSERT INTO academic_years (id, institution_id, name, start_date, end_date) VALUES ('ay-mut-1', 'inst-mut', '2026', '2026-06-01', '2027-05-31') ON CONFLICT DO NOTHING;
      INSERT INTO students (id, institution_id, admission_no, first_name, last_name, gender) VALUES ('stu-mut-1', 'inst-mut', 'ADM-M1', 'Mut', 'Student', 'male') ON CONFLICT DO NOTHING;
      
      INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_staff_id, allocated_at)
      VALUES ('alloc-mut-orig', 'inst-mut', 'bed-mut-1', 'stu-mut-1', 'ay-mut-1', 'stf-mut-1', '2026-10-25T00:00:00.000Z')
      ON CONFLICT DO NOTHING;
    `);

    // Drop partial index
    await maint.query("DROP INDEX IF EXISTS idx_active_student_allocation;");
    let m2Red = false;
    let m2RedDetails = "";
    try {
      // Attempt double-allocation of same student to different bed while index is dropped
      await maint.query(`
        INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_staff_id, allocated_at)
        VALUES ('alloc-mut-dupe', 'inst-mut', 'bed-mut-2', 'stu-mut-1', 'ay-mut-1', 'stf-mut-1', '2026-10-25T00:00:00.000Z');
      `);
      m2Red = true; // Double allocation succeeded undetected (RED)
      m2RedDetails = "Double active student allocation unexpectedly succeeded without index";
      // Clean up duplicate allocation
      await maint.query("DELETE FROM hostel_bed_allocations WHERE id = 'alloc-mut-dupe';");
    } catch (err: any) {
      m2RedDetails = `Failed unexpectedly: ${err.message}`;
    } finally {
      // Revert Mutation 2
      await maint.query(`
        CREATE UNIQUE INDEX idx_active_student_allocation 
        ON hostel_bed_allocations(institution_id, student_id) 
        WHERE vacated_at IS NULL;
      `);
    }

    // Now test that index is restored and blocks duplicate allocation with 23505
    let m2Green = false;
    let m2GreenConstraint = "";
    try {
      await maint.query(`
        INSERT INTO hostel_bed_allocations (id, institution_id, bed_id, student_id, academic_year_id, allocated_staff_id, allocated_at)
        VALUES ('alloc-mut-dupe', 'inst-mut', 'bed-mut-2', 'stu-mut-1', 'ay-mut-1', 'stf-mut-1', '2026-10-25T00:00:00.000Z');
      `);
    } catch (err: any) {
      if (err.code === "23505") {
        m2Green = true;
        m2GreenConstraint = err.constraint;
      }
    }

    results.push({
      mutation: "2. Drop partial index idx_active_student_allocation",
      redVerified: m2Red,
      greenVerified: m2Green,
      caught: m2Red && m2Green,
      errorObserved: m2RedDetails || "Passed",
      details: `RED: ${m2RedDetails} | GREEN: Blocked by ${m2GreenConstraint} [23505] upon revert`,
    });

    // -----------------------------------------------------------------------
    // Mutation 3: Remove FORCE ROW LEVEL SECURITY from hostel_blocks
    // -----------------------------------------------------------------------
    await maint.query("ALTER TABLE hostel_blocks NO FORCE ROW LEVEL SECURITY;");
    let m3Red = false;
    let m3Error = "";
    try {
      await runTest3(maintUrl, appUrl);
    } catch (e: any) {
      m3Red = true;
      m3Error = e.message;
    } finally {
      // Revert Mutation 3
      await maint.query("ALTER TABLE hostel_blocks FORCE ROW LEVEL SECURITY;");
    }
    let m3Green = false;
    try {
      const res = await runTest3(maintUrl, appUrl);
      m3Green = res.forcedRlsTableCount === 11;
    } catch (_) {}

    results.push({
      mutation: "3. Remove FORCE ROW LEVEL SECURITY from hostel_blocks",
      redVerified: m3Red && m3Error.includes("Expected exactly 11 tables with FORCE RLS"),
      greenVerified: m3Green,
      caught: m3Red && m3Green,
      errorObserved: m3Error || "Passed",
      details: `RED: Caught '${m3Error}' | GREEN: Reverted successfully (11 tables FORCE RLS)`,
    });

    // -----------------------------------------------------------------------
    // Mutation 4: Ledger Mutation Under Table Owner (Immunity & Trigger Test)
    // -----------------------------------------------------------------------
    // Seed test fine & action
    await maint.query(`
      INSERT INTO hostel_fines (id, institution_id, student_id, fine_category, total_amount, paid_amount, status, created_at, updated_at)
      VALUES ('fine-mut-trg', 'inst-mut', 'stu-mut-1', 'damage', 8000, 0, 'assessed', '2026-10-25T12:00:00.000Z', '2026-10-25T12:00:00.000Z')
      ON CONFLICT DO NOTHING;
      INSERT INTO hostel_fine_actions (id, institution_id, fine_id, action_type, amount, idempotency_key, payload_hash, actor_type, created_at)
      VALUES ('act-mut-trg', 'inst-mut', 'fine-mut-trg', 'ASSESSED', 8000, 'idemp-mut-trg', 'hash-mut-trg', 'system', '2026-10-25T12:00:00.000Z')
      ON CONFLICT DO NOTHING;
    `);

    // Step 1: As table owner (maint role), verify UPDATE is BLOCKED by trigger
    let ownerBlockedByTrigger = false;
    let triggerErrCode = "";
    try {
      await maint.query("UPDATE hostel_fine_actions SET amount = 0 WHERE id = 'act-mut-trg';");
    } catch (err: any) {
      triggerErrCode = err.code;
      ownerBlockedByTrigger = err.code === "55000";
    }

    // Step 2: Drop trigger -> verify table owner CAN mutate ledger (RED)
    await maint.query("DROP TRIGGER IF EXISTS trg_immutable_hostel_fine_actions ON hostel_fine_actions;");
    let m4Red = false;
    try {
      await maint.query("UPDATE hostel_fine_actions SET amount = 1234 WHERE id = 'act-mut-trg';");
      const checkRes = await maint.query("SELECT amount FROM hostel_fine_actions WHERE id = 'act-mut-trg';");
      m4Red = checkRes.rows[0].amount === 1234; // Ledger mutated by owner!
    } catch (_) {}

    // Step 3: Recreate trigger -> verify table owner is BLOCKED AGAIN (GREEN)
    await maint.query(`
      CREATE TRIGGER trg_immutable_hostel_fine_actions
      BEFORE UPDATE OR DELETE ON hostel_fine_actions
      FOR EACH ROW EXECUTE FUNCTION prevent_hostel_ledger_mutation();
    `);
    let m4Green = false;
    try {
      await maint.query("UPDATE hostel_fine_actions SET amount = 5678 WHERE id = 'act-mut-trg';");
    } catch (err: any) {
      m4Green = err.code === "55000";
    }

    results.push({
      mutation: "4. Ledger mutation under table owner (Trigger Immutability Test)",
      redVerified: m4Red,
      greenVerified: m4Green,
      caught: ownerBlockedByTrigger && m4Red && m4Green,
      errorObserved: `Owner blocked by trigger: ${ownerBlockedByTrigger}`,
      details: `Trigger active: Blocked owner [${triggerErrCode}] | RED: Dropping trigger permitted owner mutation (amount=1234) | GREEN: Recreated trigger blocked owner [55000]`,
    });
  } finally {
    await maint.end();
  }

  const allMutationsCaught = results.every((r) => r.caught);

  return {
    allMutationsCaught,
    mutationResults: results,
  };
}
