import pg from "pg";
import { validateSpikeDatabaseUrl } from "../src/guard.js";

const { Client } = pg;

export async function runTest3(
  maintUrl: string,
  appUrl: string
): Promise<{
  forcedRlsTableCount: number;
  namedPoliciesCount: number;
  emptyContextZeroRows: boolean;
  tenantIsolationHolds: boolean;
  crossTenantInsertBlocked: boolean;
  ledgerMutationRevoked: boolean;
  mockRolesAccessDenied: boolean;
  transactionContextLeakFree: boolean;
}> {
  validateSpikeDatabaseUrl(maintUrl);
  validateSpikeDatabaseUrl(appUrl);

  const maint = new Client({ connectionString: maintUrl });
  await maint.connect();

  const app = new Client({ connectionString: appUrl });
  await app.connect();

  try {
    // 1. Verify 11 tables have relrowsecurity = true AND relforcerowsecurity = true
    const rlsRes = await maint.query(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relname IN (
          'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 'hostel_rooms', 
          'hostel_beds', 'hostel_bed_allocations', 'hostel_leaves', 'hostel_gate_passes', 
          'hostel_gate_logs', 'hostel_fines', 'hostel_fine_actions'
        )
        AND c.relrowsecurity = true 
        AND c.relforcerowsecurity = true;
    `);

    const forcedRlsTableCount = rlsRes.rows.length;
    if (forcedRlsTableCount !== 11) {
      throw new Error(`Expected exactly 11 tables with FORCE RLS, found: ${forcedRlsTableCount}`);
    }

    // 1b. Verify exactly 11 policies named tenant_isolation_policy exist
    const polRes = await maint.query(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public' 
        AND policyname = 'tenant_isolation_policy'
        AND tablename = ANY(ARRAY[
          'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 'hostel_rooms', 
          'hostel_beds', 'hostel_bed_allocations', 'hostel_leaves', 'hostel_gate_passes', 
          'hostel_gate_logs', 'hostel_fines', 'hostel_fine_actions'
        ]);
    `);
    const namedPoliciesCount = polRes.rows.length;
    if (namedPoliciesCount !== 11) {
      throw new Error(`Expected exactly 11 tenant_isolation_policy entries, found: ${namedPoliciesCount}`);
    }

    // 2. Seed Tenant A and Tenant B as maintenance role
    await maint.query(`
      INSERT INTO institutions (id, name, code, created_at) VALUES 
        ('inst-a', 'Institution Alpha', 'ALPHA_T3', '2026-10-25T00:00:00.000Z'),
        ('inst-b', 'Institution Beta', 'BETA_T3', '2026-10-25T00:00:00.000Z')
      ON CONFLICT DO NOTHING;

      INSERT INTO hostel_blocks (id, institution_id, name, gender, deleted_at) VALUES
        ('block-a', 'inst-a', 'Block A1', 'boys', NULL),
        ('block-b', 'inst-b', 'Block B1', 'boys', NULL)
      ON CONFLICT DO NOTHING;
    `);

    // 3. Connect as app role WITHOUT tenant setting -> Must see 0 rows
    const emptyRes = await app.query("SELECT * FROM hostel_blocks;");
    const emptyContextZeroRows = emptyRes.rows.length === 0;
    if (!emptyContextZeroRows) {
      throw new Error(`Empty context query returned ${emptyRes.rows.length} rows (expected 0).`);
    }

    // 4. Set Tenant A context and query -> Must see only Block A1
    await app.query("BEGIN;");
    await app.query("SELECT set_config('app.current_tenant_id', 'inst-a', true);");
    const tenantRes = await app.query("SELECT * FROM hostel_blocks;");
    await app.query("COMMIT;");

    const tenantIsolationHolds =
      tenantRes.rows.length >= 1 &&
      tenantRes.rows.every((r) => r.institution_id === "inst-a");

    if (!tenantIsolationHolds) {
      throw new Error("Tenant isolation failed: seen unexpected rows under inst-a context");
    }

    // 5. Cross-tenant INSERT with app role -> Must be blocked by WITH CHECK
    let crossTenantInsertBlocked = false;
    try {
      await app.query("BEGIN;");
      await app.query("SELECT set_config('app.current_tenant_id', 'inst-a', true);");
      await app.query(`
        INSERT INTO hostel_blocks (id, institution_id, name, gender) 
        VALUES ('block-spoof', 'inst-b', 'Spoofed Block', 'boys');
      `);
      await app.query("COMMIT;");
    } catch (err: any) {
      crossTenantInsertBlocked = true;
      await app.query("ROLLBACK;");
    }

    if (!crossTenantInsertBlocked) {
      throw new Error("Cross-tenant insert was permitted by RLS WITH CHECK!");
    }

    // 6. Append-only ledger UPDATE and DELETE check -> Both must fail with 42501 on both tables
    let gateLogsDeleteRevoked = false;
    let gateLogsUpdateRevoked = false;
    let finesDeleteRevoked = false;
    let finesUpdateRevoked = false;

    try { await app.query("DELETE FROM hostel_gate_logs;"); } catch (e: any) { if (e.code === "42501") gateLogsDeleteRevoked = true; }
    try { await app.query("UPDATE hostel_gate_logs SET device_id = 'hack';"); } catch (e: any) { if (e.code === "42501") gateLogsUpdateRevoked = true; }
    try { await app.query("DELETE FROM hostel_fine_actions;"); } catch (e: any) { if (e.code === "42501") finesDeleteRevoked = true; }
    try { await app.query("UPDATE hostel_fine_actions SET amount = 0;"); } catch (e: any) { if (e.code === "42501") finesUpdateRevoked = true; }

    const ledgerMutationRevoked =
      gateLogsDeleteRevoked && gateLogsUpdateRevoked && finesDeleteRevoked && finesUpdateRevoked;

    if (!ledgerMutationRevoked) {
      throw new Error(`Ledger mutation revocation failed: gateLogs(del=${gateLogsDeleteRevoked}, upd=${gateLogsUpdateRevoked}), fineActions(del=${finesDeleteRevoked}, upd=${finesUpdateRevoked})`);
    }

    // 7. Mock roles (anon, authenticated) access rejection
    let anonBlocked = false;
    let authBlocked = false;
    try {
      await maint.query("SET ROLE anon; SELECT * FROM hostel_blocks; RESET ROLE;");
    } catch (e: any) {
      if (e.code === "42501") anonBlocked = true;
      await maint.query("RESET ROLE;");
    }
    try {
      await maint.query("SET ROLE authenticated; SELECT * FROM hostel_blocks; RESET ROLE;");
    } catch (e: any) {
      if (e.code === "42501") authBlocked = true;
      await maint.query("RESET ROLE;");
    }

    const mockRolesAccessDenied = anonBlocked && authBlocked;
    if (!mockRolesAccessDenied) {
      throw new Error(`Public mock roles access check failed: anonBlocked=${anonBlocked}, authBlocked=${authBlocked}`);
    }

    // 8. Verify set_config(..., true) does NOT leak to next transaction on same connection
    await app.query("BEGIN;");
    await app.query("SELECT set_config('app.current_tenant_id', 'inst-a', true);");
    await app.query("COMMIT;");

    // Fresh query without transaction
    const postTxRes = await app.query("SELECT * FROM hostel_blocks;");
    const transactionContextLeakFree = postTxRes.rows.length === 0;

    if (!transactionContextLeakFree) {
      throw new Error("Local transaction tenant setting leaked across transactions on pooled connection!");
    }

    return {
      forcedRlsTableCount,
      namedPoliciesCount,
      emptyContextZeroRows,
      tenantIsolationHolds,
      crossTenantInsertBlocked,
      ledgerMutationRevoked,
      mockRolesAccessDenied,
      transactionContextLeakFree,
    };
  } finally {
    await maint.end();
    await app.end();
  }
}
