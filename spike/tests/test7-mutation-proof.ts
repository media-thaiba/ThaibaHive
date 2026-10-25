import pg from "pg";
import { validateSpikeDatabaseUrl } from "../src/guard.js";
import { runTest1 } from "./test1-parity-migration.js";
import { runTest3 } from "./test3-postgres-rls.js";

const { Client } = pg;

export async function runTest7(
  maintUrl: string,
  appUrl: string
): Promise<{
  allMutationsCaught: boolean;
  mutationResults: Array<{ mutation: string; caught: boolean; errorObserved: string }>;
}> {
  validateSpikeDatabaseUrl(maintUrl);
  validateSpikeDatabaseUrl(appUrl);

  const maint = new Client({ connectionString: maintUrl });
  await maint.connect();

  const results: Array<{ mutation: string; caught: boolean; errorObserved: string }> = [];

  try {
    // -----------------------------------------------------------------------
    // Mutation 1: Drop one RLS policy (tenant_isolation_policy on hostel_settings)
    // -----------------------------------------------------------------------
    await maint.query("DROP POLICY tenant_isolation_policy ON hostel_settings;");
    let m1Caught = false;
    let m1Error = "";
    try {
      await runTest3(maintUrl, appUrl);
    } catch (e: any) {
      m1Caught = true;
      m1Error = e.message;
    } finally {
      // Revert Mutation 1
      await maint.query(`
        CREATE POLICY tenant_isolation_policy ON hostel_settings 
        FOR ALL TO thaibahive_app 
        USING (institution_id = current_setting('app.current_tenant_id', true)) 
        WITH CHECK (institution_id = current_setting('app.current_tenant_id', true));
      `);
    }
    results.push({
      mutation: "1. Drop tenant_isolation_policy on hostel_settings",
      caught: m1Caught && m1Error.includes("Expected exactly 11 tenant_isolation_policy"),
      errorObserved: m1Error,
    });

    // -----------------------------------------------------------------------
    // Mutation 2: Drop idx_active_student_allocation
    // -----------------------------------------------------------------------
    await maint.query("DROP INDEX idx_active_student_allocation;");
    let m2Caught = false;
    let m2Error = "";
    try {
      const res = await runTest1(maintUrl);
      if (res.pgPartialIndexCount !== 11) {
        throw new Error(`Test 1 caught missing partial index: found ${res.pgPartialIndexCount} partial indexes (expected 11)`);
      }
    } catch (e: any) {
      m2Caught = true;
      m2Error = e.message;
    } finally {
      // Revert Mutation 2
      await maint.query(`
        CREATE UNIQUE INDEX idx_active_student_allocation 
        ON hostel_bed_allocations(institution_id, student_id) 
        WHERE vacated_at IS NULL;
      `);
    }
    results.push({
      mutation: "2. Drop partial index idx_active_student_allocation",
      caught: m2Caught,
      errorObserved: m2Error,
    });

    // -----------------------------------------------------------------------
    // Mutation 3: Remove FORCE ROW LEVEL SECURITY from hostel_blocks
    // -----------------------------------------------------------------------
    await maint.query("ALTER TABLE hostel_blocks NO FORCE ROW LEVEL SECURITY;");
    let m3Caught = false;
    let m3Error = "";
    try {
      await runTest3(maintUrl, appUrl);
    } catch (e: any) {
      m3Caught = true;
      m3Error = e.message;
    } finally {
      // Revert Mutation 3
      await maint.query("ALTER TABLE hostel_blocks FORCE ROW LEVEL SECURITY;");
    }
    results.push({
      mutation: "3. Remove FORCE ROW LEVEL SECURITY from hostel_blocks",
      caught: m3Caught && m3Error.includes("Expected exactly 11 tables with FORCE RLS"),
      errorObserved: m3Error,
    });

    // -----------------------------------------------------------------------
    // Mutation 4: Grant UPDATE on hostel_gate_logs to thaibahive_app
    // -----------------------------------------------------------------------
    await maint.query("GRANT UPDATE ON hostel_gate_logs TO thaibahive_app;");
    let m4Caught = false;
    let m4Error = "";
    try {
      await runTest3(maintUrl, appUrl);
    } catch (e: any) {
      m4Caught = true;
      m4Error = e.message;
    } finally {
      // Revert Mutation 4
      await maint.query("REVOKE UPDATE ON hostel_gate_logs FROM thaibahive_app;");
    }
    results.push({
      mutation: "4. Grant UPDATE on append-only hostel_gate_logs to thaibahive_app",
      caught: m4Caught && m4Error.includes("Ledger mutation revocation failed"),
      errorObserved: m4Error,
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
