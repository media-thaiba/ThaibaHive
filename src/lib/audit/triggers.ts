import { sql } from "drizzle-orm";

function isPostgresDialect(runner: any): boolean {
  if (!runner) return false;
  const dialectName = runner?.dialect?.constructor?.name?.toLowerCase() || "";
  const sessionName = runner?.session?.constructor?.name?.toLowerCase() || "";
  if (dialectName.includes("pg") || sessionName.includes("pg")) return true;
  if (runner?.session?.client?.execProtocol || runner?.session?.client?.waitReady !== undefined) return true;
  return false;
}

/**
 * Installs append-only triggers on audit_logs that reject UPDATE and DELETE
 * across both SQLite/LibSQL and PostgreSQL.
 */
export async function installAuditImmutabilityTriggers(runner: any): Promise<void> {
  const isPostgres = isPostgresDialect(runner);

  if (isPostgres) {
    await runner.execute(sql`
      CREATE OR REPLACE FUNCTION trg_audit_logs_immutable()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Audit ledger is immutable: UPDATE/DELETE prohibited';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await runner.execute(sql`
      DROP TRIGGER IF EXISTS trg_audit_logs_no_update ON audit_logs;
    `);
    await runner.execute(sql`
      CREATE TRIGGER trg_audit_logs_no_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION trg_audit_logs_immutable();
    `);

    await runner.execute(sql`
      DROP TRIGGER IF EXISTS trg_audit_logs_no_delete ON audit_logs;
    `);
    await runner.execute(sql`
      CREATE TRIGGER trg_audit_logs_no_delete
      BEFORE DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION trg_audit_logs_immutable();
    `);
    return;
  }

  // SQLite / LibSQL
  const execSql = async (s: string) => {
    if (typeof runner.run === "function") {
      await runner.run(sql.raw(s));
    } else if (typeof runner.execute === "function") {
      await runner.execute(sql.raw(s));
    }
  };

  await execSql(`
    CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'Audit ledger is immutable: UPDATE/DELETE prohibited');
    END;
  `);

  await execSql(`
    CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'Audit ledger is immutable: UPDATE/DELETE prohibited');
    END;
  `);
}

/**
 * Drops the immutability triggers strictly for test-only tamper simulation (C3.4 / C3.5).
 * Guarded strictly to prevent execution outside the test environment.
 */
export async function dropAuditImmutabilityTriggers(runner: any): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Security Violation: dropAuditImmutabilityTriggers is strictly prohibited outside test environment");
  }

  const isPostgres = isPostgresDialect(runner);

  if (isPostgres) {
    await runner.execute(sql`DROP TRIGGER IF EXISTS trg_audit_logs_no_update ON audit_logs;`);
    await runner.execute(sql`DROP TRIGGER IF EXISTS trg_audit_logs_no_delete ON audit_logs;`);
    return;
  }

  const execSql = async (s: string) => {
    if (typeof runner.run === "function") {
      await runner.run(sql.raw(s));
    } else if (typeof runner.execute === "function") {
      await runner.execute(sql.raw(s));
    }
  };

  await execSql(`DROP TRIGGER IF EXISTS trg_audit_logs_no_update;`);
  await execSql(`DROP TRIGGER IF EXISTS trg_audit_logs_no_delete;`);
}
