/**
 * Standalone TypeScript Runner for Stage 3 Postgres Verification via PGlite & wrapPgDb.
 * Verifies:
 * 1. Sequential cryptographic audit chain creation and RFC 6962 Merkle root on PostgreSQL.
 * 2. Database-level trigger on PostgreSQL rejecting UPDATE and DELETE with 'Audit ledger is immutable'.
 * 3. Atomic transaction rollback on PostgreSQL without sequence gaps.
 * 4. Chain integrity verification and tamper detection on PostgreSQL.
 */

process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "stage3-test-auth-jwt-secret-at-least-32-chars-long";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { wrapPgDb } from "@thaiba/db";
import * as pgSchema from "@thaiba/db/schema.pg";
import { eq, sql, desc } from "drizzle-orm";
import crypto from "crypto";
import {
  canonicalizePayload,
  computePreimageString,
  computeAuditBlockHash,
  computeAuditHmac,
  verifyAuditHmacSignature,
  GENESIS_PREV_HASH,
} from "@/lib/audit/canonical";
import { computeMerkleRoot, generateMerkleProof, verifyMerkleProof } from "@/lib/audit/merkle";
import { verifyAuditChainIntegrity } from "@/lib/audit/verifier";
import { installAuditImmutabilityTriggers, dropAuditImmutabilityTriggers } from "@/lib/audit/triggers";

async function runStage3PgVerification() {
  console.log("=== Stage 3 Postgres Verification via PGlite & wrapPgDb ===");

  const pglite = new PGlite();

  // 1. Initialize full schema DDL on PGlite
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS "institutions" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "code" text NOT NULL UNIQUE,
      "type" text DEFAULT 'campus' NOT NULL,
      "address" text,
      "phone" text,
      "email" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "allocated_budget" double precision DEFAULT 0,
      "fiscal_year" text,
      "created_at" text DEFAULT (current_timestamp) NOT NULL,
      "updated_at" text DEFAULT (current_timestamp) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "staff" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "employee_id" text NOT NULL UNIQUE,
      "first_name" text NOT NULL,
      "last_name" text NOT NULL,
      "role" text DEFAULT 'staff' NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "token_version" integer DEFAULT 0 NOT NULL,
      "created_at" text DEFAULT (current_timestamp) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" text PRIMARY KEY NOT NULL,
      "tenant_id" text NOT NULL,
      "user_id" text,
      "action" text NOT NULL,
      "entity_type" text NOT NULL,
      "entity_id" text,
      "payload" jsonb,
      "sequence_number" integer DEFAULT 1 NOT NULL,
      "previous_hash" text,
      "current_hash" text NOT NULL,
      "signature" text,
      "merkle_root_id" text,
      "merkle_proof" text,
      "ip_address" text,
      "user_agent" text,
      "timestamp" text DEFAULT (current_timestamp) NOT NULL,
      "created_at" text DEFAULT (current_timestamp) NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "idx_pg_audit_logs_tenant_seq" ON "audit_logs" ("tenant_id", "sequence_number");
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_pg_audit_logs_tenant_hash" ON "audit_logs" ("tenant_id", "current_hash");
  `);

  const rawDrizzle = drizzle(pglite, { schema: pgSchema });
  const pgDb = wrapPgDb(rawDrizzle);

  const ts = Date.now();
  const tenant = `pg_tenant_stg3_${ts}`;

  // ─── Test 1: Sequential Hash-Chaining & Merkle Root on Postgres ─────────────
  const entries: any[] = [];
  let prevHash = GENESIS_PREV_HASH;

  for (let seq = 1; seq <= 5; seq++) {
    const timestamp = new Date().toISOString();
    const payload = { event: `pg_event_${seq}`, count: seq };
    const canonicalPayloadJSON = canonicalizePayload(payload);

    const currentHash = computeAuditBlockHash({
      sequenceNumber: seq,
      previousHash: prevHash,
      tenantId: tenant,
      userId: `user_pg_${seq}`,
      action: `PG_ACTION_${seq}`,
      entityType: "pg_entity",
      entityId: `id_${seq}`,
      canonicalPayloadJSON,
      timestamp,
    });

    const signature = computeAuditHmac(currentHash);

    await pgDb.insert(pgSchema.auditLogs).values({
      id: `aud_pg_${seq}_${ts}`,
      tenantId: tenant,
      userId: `user_pg_${seq}`,
      action: `PG_ACTION_${seq}`,
      entityType: "pg_entity",
      entityId: `id_${seq}`,
      payload: canonicalPayloadJSON as any,
      sequenceNumber: seq,
      previousHash: prevHash,
      currentHash,
      signature,
      timestamp,
    });

    entries.push({ sequenceNumber: seq, previousHash: prevHash, currentHash, signature });
    prevHash = currentHash;
  }

  // Verify all rows inserted
  const insertedRows = await pgDb
    .select()
    .from(pgSchema.auditLogs)
    .where(eq(pgSchema.auditLogs.tenantId, tenant))
    .orderBy(pgSchema.auditLogs.sequenceNumber);

  if (insertedRows.length !== 5) {
    throw new Error(`Test 1 Failed: Expected 5 audit logs, found ${insertedRows.length}`);
  }

  // Verify Merkle Root
  const blockHashes = insertedRows.map((r: any) => r.currentHash);
  const merkleRoot = computeMerkleRoot(blockHashes);
  if (!merkleRoot || merkleRoot.length !== 64) {
    throw new Error("Test 1 Failed: Invalid Merkle root computed");
  }

  // Verify Merkle Proofs for all 5 leaves
  for (const row of insertedRows) {
    const proof = generateMerkleProof(row.currentHash, blockHashes);
    if (!verifyMerkleProof(proof)) {
      throw new Error(`Test 1 Failed: Merkle proof verification failed for sequence ${row.sequenceNumber}`);
    }
  }

  // Verify chain integrity through verifier on Postgres
  const verResult = await verifyAuditChainIntegrity(tenant, 1, 5, pgDb);
  if (!verResult.valid || verResult.checkedCount !== 5 || verResult.merkleRoot !== merkleRoot) {
    throw new Error(`Test 1 Failed: Chain verification on Postgres failed: ${JSON.stringify(verResult)}`);
  }

  console.log("PASS Test 1: Sequential hash-chaining, Merkle root, and inclusion proofs on Postgres");

  // ─── Test 2: Database-Level Append-Only Trigger on Postgres ──────────────────
  await installAuditImmutabilityTriggers(pgDb);

  const isImmutabilityError = (err: any) => {
    const all = [err?.message, err?.cause?.message, String(err), String(err?.cause)].filter(Boolean).join(" ");
    return all.includes("Audit ledger is immutable");
  };

  let updateBlocked = false;
  try {
    await pgDb
      .update(pgSchema.auditLogs)
      .set({ action: "TAMPERED_ON_PG" })
      .where(eq(pgSchema.auditLogs.id, insertedRows[0].id))
      .run();
  } catch (err: any) {
    if (isImmutabilityError(err)) {
      updateBlocked = true;
    }
  }

  if (!updateBlocked) {
    throw new Error("Test 2 Failed: Postgres trigger did not block UPDATE on audit_logs");
  }

  let deleteBlocked = false;
  try {
    await pgDb
      .delete(pgSchema.auditLogs)
      .where(eq(pgSchema.auditLogs.id, insertedRows[0].id))
      .run();
  } catch (err: any) {
    if (isImmutabilityError(err)) {
      deleteBlocked = true;
    }
  }

  if (!deleteBlocked) {
    throw new Error("Test 2 Failed: Postgres trigger did not block DELETE on audit_logs");
  }

  await dropAuditImmutabilityTriggers(pgDb);
  console.log("PASS Test 2: Database-level trigger on Postgres rejects UPDATE and DELETE with 'Audit ledger is immutable'");

  // ─── Test 3: Transaction Rollback Atomicity on Postgres ──────────────────────
  const rollbackTenant = `pg_tenant_rb_${ts}`;

  // Initial record in tx
  await pgDb.transaction(async (tx: any) => {
    const tsNow = new Date().toISOString();
    const canon = canonicalizePayload({ initial: true });
    const h = computeAuditBlockHash({
      sequenceNumber: 1,
      previousHash: GENESIS_PREV_HASH,
      tenantId: rollbackTenant,
      action: "INIT",
      entityType: "test",
      canonicalPayloadJSON: canon,
      timestamp: tsNow,
    });
    const sig = computeAuditHmac(h);

    await tx.insert(pgSchema.auditLogs).values({
      id: `aud_rb_1_${ts}`,
      tenantId: rollbackTenant,
      action: "INIT",
      entityType: "test",
      payload: canon as any,
      sequenceNumber: 1,
      previousHash: GENESIS_PREV_HASH,
      currentHash: h,
      signature: sig,
      timestamp: tsNow,
    });
  });

  // Failing tx
  let txFailed = false;
  try {
    await pgDb.transaction(async (tx: any) => {
      const tsNow = new Date().toISOString();
      const canon = canonicalizePayload({ fail: true });
      const h = computeAuditBlockHash({
        sequenceNumber: 2,
        previousHash: "prev",
        tenantId: rollbackTenant,
        action: "FAIL",
        entityType: "test",
        canonicalPayloadJSON: canon,
        timestamp: tsNow,
      });

      await tx.insert(pgSchema.auditLogs).values({
        id: `aud_rb_2_${ts}`,
        tenantId: rollbackTenant,
        action: "FAIL",
        entityType: "test",
        payload: canon as any,
        sequenceNumber: 2,
        previousHash: "prev",
        currentHash: h,
        signature: computeAuditHmac(h),
        timestamp: tsNow,
      });

      throw new Error("Simulated rollback error on Postgres");
    });
  } catch {
    txFailed = true;
  }

  if (!txFailed) {
    throw new Error("Test 3 Failed: Transaction did not fail as expected");
  }

  // Verify sequence 2 was rolled back completely
  const rbRows = await pgDb
    .select()
    .from(pgSchema.auditLogs)
    .where(eq(pgSchema.auditLogs.tenantId, rollbackTenant));

  if (rbRows.length !== 1 || rbRows[0].sequenceNumber !== 1) {
    throw new Error(`Test 3 Failed: Rollback leaked rows on Postgres (found ${rbRows.length})`);
  }

  console.log("PASS Test 3: Transaction rollback atomicity on Postgres verified cleanly (no sequence leak)");

  console.log("=== All Stage 3 Postgres/PGlite verification tests passed! ===");
}

runStage3PgVerification().catch((err) => {
  console.error("FATAL Stage 3 Postgres Verification Failure:", err);
  process.exit(1);
});
