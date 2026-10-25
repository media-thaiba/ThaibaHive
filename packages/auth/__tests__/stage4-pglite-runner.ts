/**
 * Standalone TypeScript Runner for Stage 4 Postgres Health Diagnostics via PGlite & wrapPgDb.
 * Verifies:
 * 1. Database latency probe and dialect detection ("postgres") on PostgreSQL.
 * 2. pg_trigger introspection detecting trg_audit_logs_no_update and trg_audit_logs_no_delete.
 * 3. Degraded reporting when triggers are dropped.
 * 4. Healthy restoration when triggers are installed.
 */

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { wrapPgDb } from "@thaiba/db";
import * as pgSchema from "@thaiba/db/schema.pg";
import { sql } from "drizzle-orm";
import { installAuditImmutabilityTriggers, dropAuditImmutabilityTriggers } from "@/lib/audit/triggers";
import { checkDiagnosticsHealth } from "@/app/api/admin/diagnostics/health/route";

async function runStage4PgVerification() {
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "stage4-test-auth-jwt-secret-at-least-32-chars-long";
  console.log("=== Stage 4 Postgres Diagnostics Verification via PGlite & wrapPgDb ===");

  const pglite = new PGlite();
  const rawDb = drizzle(pglite, { schema: pgSchema });
  const pgDb = wrapPgDb(rawDb);

  // 1. Initialize Postgres schema DDL
  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(255),
      payload TEXT,
      sequence_number INTEGER NOT NULL DEFAULT 1,
      previous_hash VARCHAR(64) NOT NULL,
      current_hash VARCHAR(64) NOT NULL,
      signature TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_merkle_roots (
      id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL,
      root_hash VARCHAR(64) NOT NULL,
      start_audit_id VARCHAR(255) NOT NULL,
      end_audit_id VARCHAR(255) NOT NULL,
      leaf_count INTEGER NOT NULL,
      tree_depth INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await pgDb.execute(sql`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id VARCHAR(255) PRIMARY KEY,
      staff_id VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      token_version INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);

  // 2. Install immutability triggers on Postgres
  await installAuditImmutabilityTriggers(pgDb);

  // 3. Test 1: Check healthy state
  const health1 = await checkDiagnosticsHealth("global", pgDb);
  if (health1.status !== "healthy") {
    throw new Error(`Expected status 'healthy' on Postgres, got '${health1.status}'`);
  }
  if (health1.database.dialect !== "postgres") {
    throw new Error(`Expected dialect 'postgres', got '${health1.database.dialect}'`);
  }
  if (health1.immutabilityTriggers.status !== "active") {
    throw new Error(`Expected triggers 'active' on Postgres, got '${health1.immutabilityTriggers.status}'`);
  }
  console.log("PASS Test 1: Postgres health probe and trigger introspection verified (healthy)");

  // 4. Test 2: Check degraded state when triggers dropped
  await dropAuditImmutabilityTriggers(pgDb);
  const health2 = await checkDiagnosticsHealth("global", pgDb);
  if (health2.status !== "degraded" || health2.immutabilityTriggers.status !== "degraded") {
    throw new Error(`Expected status 'degraded' when triggers dropped on Postgres, got '${health2.status}'`);
  }
  console.log("PASS Test 2: Postgres degraded detection verified when triggers dropped");

  // 5. Test 3: Reinstall and verify restored
  await installAuditImmutabilityTriggers(pgDb);
  const health3 = await checkDiagnosticsHealth("global", pgDb);
  if (health3.status !== "healthy" || health3.immutabilityTriggers.status !== "active") {
    throw new Error(`Expected restored 'healthy' on Postgres, got '${health3.status}'`);
  }
  console.log("PASS Test 3: Postgres trigger restoration verified cleanly");

  console.log("=== All Stage 4 Postgres/PGlite diagnostics verification tests passed! ===");
  await pglite.close();
}

runStage4PgVerification().catch((err) => {
  console.error("Stage 4 Postgres Verification Runner FAILED:", err);
  process.exit(1);
});
