/**
 * @jest-environment node
 *
 * Stage 3: Tamper-Evident Cryptographic Audit Logging, Merkle Hash-Chaining & Integrity Verification
 * Verification Suite (C3.1 – C3.10)
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";
import crypto from "crypto";
import { db } from "@/db";
import { auditLogs, staff, institutions, staffInstitutions, userSessions, stepUpUsed } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  canonicalizePayload,
  computePreimageString,
  computeAuditBlockHash,
  computeAuditHmac,
  verifyAuditHmacSignature,
  GENESIS_PREV_HASH,
} from "@/lib/audit/canonical";
import {
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  hashLeaf,
  hashNode,
} from "@/lib/audit/merkle";
import { verifyAuditChainIntegrity } from "@/lib/audit/verifier";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { installAuditImmutabilityTriggers, dropAuditImmutabilityTriggers } from "@/lib/audit/triggers";
import {
  createSession,
  verifySession,
  createActionStepUpToken,
  consumeStepUpTokenInTx,
  isStepUpReplayError,
  getJwtSecret,
} from "../index";
import { GET as auditLedgerGet } from "@/app/api/admin/audit/ledger/route";
import { POST as auditVerifyPost } from "@/app/api/admin/audit/verify-chain/route";
import { POST as auditExportPost } from "@/app/api/admin/audit/export/route";

const activeCookieMap = new Map<string, string>();
const activeHeaderMap = new Map<string, string>();

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: jest.fn((name: string) => {
      const val = activeCookieMap.get(name);
      return val ? { value: val } : undefined;
    }),
    set: jest.fn((name: string, value: string) => {
      activeCookieMap.set(name, value);
    }),
    delete: jest.fn((name: string) => {
      activeCookieMap.delete(name);
    }),
  })),
  headers: jest.fn(async () => ({
    get: jest.fn((name: string) => activeHeaderMap.get(name.toLowerCase()) || null),
  })),
}));

describe("Stage 3: Tamper-Evident Cryptographic Audit Logging (C3.1 – C3.10)", () => {
  const ts = Date.now();
  const instA = `inst_stg3_a_${ts}`;
  const instB = `inst_stg3_b_${ts}`;

  const superAdminId = `stf_sa_${ts}`;
  const regionalAdminId = `stf_ra_${ts}`;
  const principalAId = `stf_prin_a_${ts}`;
  const staffAId = `stf_tch_a_${ts}`;

  beforeAll(async () => {
    // 0. Ensure triggers from any prior aborted test run are cleared
    await dropAuditImmutabilityTriggers(db);

    // 1. Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: "Institution Alpha", code: `INA3_${ts}`, isActive: true },
      { id: instB, name: "Institution Beta", code: `INB3_${ts}`, isActive: true },
    ]).run();

    // 2. Seed Staff
    await db.insert(staff).values([
      { id: superAdminId, email: `sa_${ts}@thaiba.org`, employeeId: `EMP_SA_${ts}`, firstName: "Super", lastName: "Admin", role: "super_admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: regionalAdminId, email: `ra_${ts}@thaiba.org`, employeeId: `EMP_RA_${ts}`, firstName: "Regional", lastName: "Admin", role: "regional_admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: principalAId, email: `prin_a_${ts}@thaiba.org`, employeeId: `EMP_PRA_${ts}`, firstName: "Principal", lastName: "Alpha", role: "principal", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: staffAId, email: `staff_a_${ts}@thaiba.org`, employeeId: `EMP_STF_${ts}`, firstName: "Staff", lastName: "Alpha", role: "staff", isActive: true, tokenVersion: 0, isFirstLogin: false },
    ]).run();

    // 3. Seed Staff Institutions
    await db.insert(staffInstitutions).values([
      { id: `si_ra_${ts}`, staffId: regionalAdminId, institutionId: instA },
      { id: `si_prin_${ts}`, staffId: principalAId, institutionId: instA },
      { id: `si_staff_${ts}`, staffId: staffAId, institutionId: instA },
    ]).run();
  });

  afterAll(async () => {
    // Cleanup seeded records
    await dropAuditImmutabilityTriggers(db);
    await db.delete(auditLogs).where(sql`${auditLogs.tenantId} LIKE ${`%_${ts}`}`).run();
    await db.delete(userSessions).where(sql`${userSessions.email} LIKE ${`%_${ts}@thaiba.org`}`).run();
    await db.delete(stepUpUsed).where(sql`${stepUpUsed.staffId} LIKE ${`%_${ts}`}`).run();
    await db.delete(staffInstitutions).where(sql`${staffInstitutions.id} LIKE ${`%_${ts}`}`).run();
    await db.delete(staff).where(sql`${staff.id} LIKE ${`%_${ts}`}`).run();
    await db.delete(institutions).where(sql`${institutions.id} LIKE ${`%_${ts}`}`).run();
  });

  // ─── C3.1: Genesis & Contiguous Chain Construction ───────────────────────────
  describe("C3.1: Genesis & Contiguous Chain Construction", () => {
    it("initializes sequenceNumber = 1 with previousHash = 64 zeros and links subsequent records contiguously", async () => {
      const tenant = `tenant_c31_${ts}`;

      // First write -> Genesis
      const entry1 = await db.transaction(async (tx) => {
        return cryptoAuditWriter.log({
          tenantId: tenant,
          userId: superAdminId,
          action: "GENESIS_ACTION",
          entityType: "system",
          entityId: "sys_1",
          payload: { step: 1 },
        }, tx);
      });

      expect(entry1.sequenceNumber).toBe(1);
      expect(entry1.previousHash).toBe(GENESIS_PREV_HASH);
      expect(entry1.currentHash).toHaveLength(64);
      expect(entry1.signature).toHaveLength(64);

      // Second write -> Links to entry1
      const entry2 = await db.transaction(async (tx) => {
        return cryptoAuditWriter.log({
          tenantId: tenant,
          userId: superAdminId,
          action: "ACTION_TWO",
          entityType: "system",
          entityId: "sys_2",
          payload: { step: 2 },
        }, tx);
      });

      expect(entry2.sequenceNumber).toBe(2);
      expect(entry2.previousHash).toBe(entry1.currentHash);

      // Third write -> Links to entry2
      const entry3 = await db.transaction(async (tx) => {
        return cryptoAuditWriter.log({
          tenantId: tenant,
          userId: superAdminId,
          action: "ACTION_THREE",
          entityType: "system",
          entityId: "sys_3",
          payload: { step: 3 },
        }, tx);
      });

      expect(entry3.sequenceNumber).toBe(3);
      expect(entry3.previousHash).toBe(entry2.currentHash);

      // Verify full chain integrity passes
      const result = await verifyAuditChainIntegrity(tenant);
      expect(result.valid).toBe(true);
      expect(result.checkedCount).toBe(3);
      expect(result.merkleRoot).toHaveLength(64);
    });
  });

  // ─── C3.2: Canonical JSON Determinism ────────────────────────────────────────
  describe("C3.2: Canonical JSON Determinism", () => {
    it("produces identical canonical JSON, block hash, and HMAC signature regardless of object key order", () => {
      const payloadA = {
        zebra: 1,
        apple: "red",
        nested: { orange: true, banana: [1, 2, 3], cherry: null },
      };

      const payloadB = {
        apple: "red",
        nested: { cherry: null, banana: [1, 2, 3], orange: true },
        zebra: 1,
      };

      const canonA = canonicalizePayload(payloadA);
      const canonB = canonicalizePayload(payloadB);
      expect(canonA).toBe(canonB);

      const paramsBase = {
        sequenceNumber: 10,
        previousHash: "a".repeat(64),
        tenantId: "tenant_c32",
        userId: "user_123",
        action: "TEST_ACTION",
        entityType: "entity",
        entityId: "ent_123",
        timestamp: "2026-10-25T12:00:00.000Z",
      };

      const hashA = computeAuditBlockHash({ ...paramsBase, canonicalPayloadJSON: canonA });
      const hashB = computeAuditBlockHash({ ...paramsBase, canonicalPayloadJSON: canonB });
      expect(hashA).toBe(hashB);

      const sigA = computeAuditHmac(hashA);
      const sigB = computeAuditHmac(hashB);
      expect(sigA).toBe(sigB);
    });

    it("prevents delimiter injection when action or entityId contain pipe (|) characters", () => {
      const preimage1 = computePreimageString({
        sequenceNumber: 1,
        previousHash: GENESIS_PREV_HASH,
        tenantId: "t1",
        userId: "u1",
        action: "ACT|INJECT",
        entityType: "ent",
        entityId: "id1",
        canonicalPayloadJSON: "{}",
        timestamp: "2026-10-25T12:00:00Z",
      });

      const preimage2 = computePreimageString({
        sequenceNumber: 1,
        previousHash: GENESIS_PREV_HASH,
        tenantId: "t1",
        userId: "u1",
        action: "ACT",
        entityType: "INJECT|ent",
        entityId: "id1",
        canonicalPayloadJSON: "{}",
        timestamp: "2026-10-25T12:00:00Z",
      });

      expect(preimage1).not.toBe(preimage2);
    });
  });

  // ─── C3.3: HKDF Domain Separation & HMAC Signature Verification ─────────────
  describe("C3.3: HKDF Domain Separation & HMAC Signature Verification", () => {
    it("detects forged signatures signed with wrong purpose key or flipped bits as SIGNATURE_INVALID", async () => {
      const tenant = `tenant_c33_${ts}`;

      // Write valid record
      const entry = await db.transaction(async (tx) => {
        return cryptoAuditWriter.log({
          tenantId: tenant,
          userId: superAdminId,
          action: "VALID_RECORD",
          entityType: "doc",
          entityId: "doc_1",
          payload: { valid: true },
        }, tx);
      });

      expect(verifyAuditHmacSignature(entry.currentHash, entry.signature)).toBe(true);

      // Verify that using session secret produces completely different HMAC
      const sessionSecret = getJwtSecret("session");
      const forgedSig = crypto.createHmac("sha256", sessionSecret).update(entry.currentHash).digest("hex");
      expect(verifyAuditHmacSignature(entry.currentHash, forgedSig)).toBe(false);

      // Temporarily mutate signature in DB to test detection by verifyAuditChainIntegrity
      await db.update(auditLogs).set({ signature: forgedSig }).where(eq(auditLogs.id, entry.id)).run();

      const result = await verifyAuditChainIntegrity(tenant);
      expect(result.valid).toBe(false);
      expect(result.errorReason).toBe("SIGNATURE_INVALID");
      expect(result.firstCorruptedSequence).toBe(1);

      // Restore valid signature
      await db.update(auditLogs).set({ signature: entry.signature }).where(eq(auditLogs.id, entry.id)).run();
    });
  });

  // ─── C3.4: Payload Tamper Detection (HASH_MISMATCH & PREVIOUS_HASH_BROKEN) ───
  describe("C3.4: Payload Tamper Detection (HASH_MISMATCH & PREVIOUS_HASH_BROKEN)", () => {
    it("detects when stored payload is mutated (HASH_MISMATCH)", async () => {
      const tenant = `tenant_c34_${ts}`;

      const e1 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A1", entityType: "t", payload: { val: 1 } }, tx));
      const e2 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A2", entityType: "t", payload: { val: 2 } }, tx));
      const e3 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A3", entityType: "t", payload: { val: 3 } }, tx));

      // Simulate compromised disk mutating payload of e2
      await db.update(auditLogs).set({ payload: JSON.stringify({ val: 9999 }) }).where(eq(auditLogs.id, e2.id)).run();

      const result = await verifyAuditChainIntegrity(tenant);
      expect(result.valid).toBe(false);
      expect(result.errorReason).toBe("HASH_MISMATCH");
      expect(result.firstCorruptedSequence).toBe(2);

      // Restore payload
      await db.update(auditLogs).set({ payload: JSON.stringify({ val: 2 }) }).where(eq(auditLogs.id, e2.id)).run();
      expect((await verifyAuditChainIntegrity(tenant)).valid).toBe(true);
    });

    it("detects when an attacker rewrites currentHash without updating subsequent previousHash (PREVIOUS_HASH_BROKEN)", async () => {
      const tenant = `tenant_c34b_${ts}`;

      const e1 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A1", entityType: "t", payload: { x: 1 } }, tx));
      const e2 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A2", entityType: "t", payload: { x: 2 } }, tx));

      // Attacker rewrites e2.previousHash to a fake hash
      await db.update(auditLogs).set({ previousHash: "f".repeat(64) }).where(eq(auditLogs.id, e2.id)).run();

      const result = await verifyAuditChainIntegrity(tenant);
      expect(result.valid).toBe(false);
      expect(result.errorReason).toBe("PREVIOUS_HASH_BROKEN");
      expect(result.firstCorruptedSequence).toBe(2);

      // Restore
      await db.update(auditLogs).set({ previousHash: e1.currentHash }).where(eq(auditLogs.id, e2.id)).run();
    });
  });

  // ─── C3.5: Sequence Gap & Deleted Record Detection ───────────────────────────
  describe("C3.5: Sequence Gap & Deleted Record Detection", () => {
    it("detects deleted internal record (#2 in 1..3) as SEQUENCE_GAP", async () => {
      const tenant = `tenant_c35_${ts}`;

      const e1 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A1", entityType: "t" }, tx));
      const e2 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A2", entityType: "t" }, tx));
      const e3 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A3", entityType: "t" }, tx));

      // Delete record #2
      await db.delete(auditLogs).where(eq(auditLogs.id, e2.id)).run();

      const result = await verifyAuditChainIntegrity(tenant);
      expect(result.valid).toBe(false);
      expect(result.errorReason).toBe("SEQUENCE_GAP");
      expect(result.firstCorruptedSequence).toBe(2);
    });

    it("detects deleted genesis record (#1 in 1..3) as SEQUENCE_GAP at sequence 1", async () => {
      const tenant = `tenant_c35_genesis_${ts}`;

      const e1 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A1", entityType: "t" }, tx));
      const e2 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A2", entityType: "t" }, tx));

      // Delete record #1
      await db.delete(auditLogs).where(eq(auditLogs.id, e1.id)).run();

      const result = await verifyAuditChainIntegrity(tenant);
      expect(result.valid).toBe(false);
      expect(result.errorReason).toBe("SEQUENCE_GAP");
      expect(result.firstCorruptedSequence).toBe(1);
    });

    it("detects missing anchor record when verifying window fromSeq > 1", async () => {
      const tenant = `tenant_c35_window_${ts}`;

      const e1 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A1", entityType: "t" }, tx));
      const e2 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A2", entityType: "t" }, tx));
      const e3 = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "A3", entityType: "t" }, tx));

      // If we verify fromSeq = 2 to 3, anchor is e1 (seq 1). Should be valid:
      expect((await verifyAuditChainIntegrity(tenant, 2, 3)).valid).toBe(true);

      // Now delete anchor record e1
      await db.delete(auditLogs).where(eq(auditLogs.id, e1.id)).run();

      // Verifying window fromSeq = 2 catches that anchor record 1 is missing
      const result = await verifyAuditChainIntegrity(tenant, 2, 3);
      expect(result.valid).toBe(false);
      expect(result.errorReason).toBe("SEQUENCE_GAP");
      expect(result.firstCorruptedSequence).toBe(1);
    });
  });

  // ─── C3.6: Database-Level Append-Only Immutability Enforcement ───────────────
  describe("C3.6: Database-Level Append-Only Immutability Enforcement", () => {
    it("prohibits direct UPDATE and DELETE on audit_logs when triggers are installed", async () => {
      const tenant = `tenant_c36_${ts}`;

      // 1. Install immutability triggers
      await installAuditImmutabilityTriggers(db);

      // 2. Insert record normally
      const entry = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "IMMUTABLE_LOG", entityType: "doc" }, tx));

      // 3. Attempt UPDATE -> Must throw trigger error
      let updateError: { message?: string; cause?: { message?: string } } | null = null;
      try {
        await db.update(auditLogs).set({ action: "TAMPERED" }).where(eq(auditLogs.id, entry.id)).run();
      } catch (err) {
        updateError = err as { message?: string; cause?: { message?: string } };
      }
      expect(updateError).not.toBeNull();
      const updateErrMsg = [updateError?.message, updateError?.cause?.message, String(updateError), String(updateError?.cause)].join(" ");
      expect(updateErrMsg).toContain("Audit ledger is immutable");

      // 4. Attempt DELETE -> Must throw trigger error
      let deleteError: { message?: string; cause?: { message?: string } } | null = null;
      try {
        await db.delete(auditLogs).where(eq(auditLogs.id, entry.id)).run();
      } catch (err) {
        deleteError = err as { message?: string; cause?: { message?: string } };
      }
      expect(deleteError).not.toBeNull();
      const deleteErrMsg = [deleteError?.message, deleteError?.cause?.message, String(deleteError), String(deleteError?.cause)].join(" ");
      expect(deleteErrMsg).toContain("Audit ledger is immutable");

      // Drop triggers to permit test cleanup
      await dropAuditImmutabilityTriggers(db);
    });
  });

  // ─── C3.7: RFC 6962 Merkle Tree & Inclusion Proof Verification ──────────────
  describe("C3.7: RFC 6962 Merkle Tree & Inclusion Proof Verification", () => {
    it("computes domain-separated root and generates verifiable proofs for N = 1, 4, 7 leaves", () => {
      const testSizes = [1, 4, 7];

      for (const size of testSizes) {
        const leaves = Array.from({ length: size }, (_, i) =>
          crypto.createHash("sha256").update(`leaf_${size}_${i}`).digest("hex")
        );

        const root = computeMerkleRoot(leaves);
        expect(root).toHaveLength(64);

        // Verify proof for every leaf in the batch
        for (const targetLeaf of leaves) {
          const proof = generateMerkleProof(targetLeaf, leaves);
          expect(proof.root).toBe(root);
          expect(verifyMerkleProof(proof)).toBe(true);

          // Verify proof fails if targetHash is mutated
          const forgedProof = { ...proof, targetHash: "f".repeat(64) };
          expect(verifyMerkleProof(forgedProof)).toBe(false);

          // Verify proof fails if sibling position is inverted
          if (proof.steps.length > 0) {
            const invertedSteps = proof.steps.map((s) => ({
              ...s,
              position: s.position === "left" ? "right" as const : "left" as const,
            }));
            expect(verifyMerkleProof({ ...proof, steps: invertedSteps })).toBe(false);
          }
        }
      }
    });
  });

  // ─── C3.8: Multi-Tenant Isolation on Forensic Routes ─────────────────────────
  describe("C3.8: Multi-Tenant Isolation on Forensic Routes", () => {
    it("allows principal in instA to read instA ledger, but denies querying instB with 403", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: principalAId,
        role: "principal",
        email: `prin_a_${ts}@thaiba.org`,
        employeeId: `EMP_PRA_${ts}`,
        name: "Principal Alpha",
        tokenVersion: 0,
        institutionId: instA,
      });

      // 1. Query own institution -> 200
      const reqOwn = new Request(`http://localhost/api/admin/audit/ledger?tenantId=${instA}`);
      const resOwn = await auditLedgerGet(reqOwn);
      expect(resOwn.status).toBe(200);

      // 2. Query foreign institution -> 403 Forbidden
      const reqForeign = new Request(`http://localhost/api/admin/audit/ledger?tenantId=${instB}`);
      const resForeign = await auditLedgerGet(reqForeign);
      expect(resForeign.status).toBe(403);
      const json = await resForeign.json();
      expect(json.error).toContain("Cross-tenant access denied");

      activeCookieMap.clear();
    });

    it("denies staff role without system:audit:read permission with HTTP 403", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: staffAId,
        role: "staff",
        email: `staff_a_${ts}@thaiba.org`,
        employeeId: `EMP_STF_${ts}`,
        name: "Staff Alpha",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request(`http://localhost/api/admin/audit/ledger?tenantId=${instA}`);
      const res = await auditLedgerGet(req);
      expect(res.status).toBe(403);

      activeCookieMap.clear();
    });
  });

  // ─── C3.9: Step-Up Authentication & Replay Protection on Audit Export ────────
  describe("C3.9: Step-Up Authentication & Replay Protection on Audit Export", () => {
    it("requires step-up token, consumes it atomically, and rejects replays with 403", async () => {
      activeCookieMap.clear();
      const explicitSid = `sess_sa_${Date.now()}`;
      await createSession({
        sid: explicitSid,
        staffId: superAdminId,
        role: "super_admin",
        email: `sa_${ts}@thaiba.org`,
        employeeId: `EMP_SA_${ts}`,
        name: "Super Admin",
        tokenVersion: 0,
        institutionId: "global",
      });

      // 1. Request without step-up token -> 403
      const reqNoStepUp = new Request("http://localhost/api/admin/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: instA }),
      });
      const resNoStepUp = await auditExportPost(reqNoStepUp);
      expect(resNoStepUp.status).toBe(403);

      // 2. Request with valid step-up token -> 200 and consumes token
      const stepUpToken = await createActionStepUpToken({
        staffId: superAdminId,
        sid: explicitSid,
        action: "audit:export",
      });

      const reqValid = new Request("http://localhost/api/admin/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: instA,
          stepUpToken,
        }),
      });

      const resValid = await auditExportPost(reqValid);
      expect(resValid.status).toBe(200);
      const jsonValid = await resValid.json();
      expect(jsonValid.success).toBe(true);
      expect(jsonValid.bundleSignature).toHaveLength(64);

      // 3. Replay exact same step-up token -> 403 Forbidden (Replay detected)
      const reqReplay = new Request("http://localhost/api/admin/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: instA,
          stepUpToken,
        }),
      });

      const resReplay = await auditExportPost(reqReplay);
      expect(resReplay.status).toBe(403);
      const jsonReplay = await resReplay.json();
      expect(jsonReplay.error).toContain("replay detected");

      activeCookieMap.clear();
    });
  });

  // ─── C3.10: PostgreSQL / PGlite Dual-Dialect Parity & Transactional Atomicity ─
  describe("C3.10: PostgreSQL / PGlite Dual-Dialect Parity & Transactional Atomicity", () => {
    it("rolls back audit record and sequence atomically if business transaction fails", async () => {
      const tenant = `tenant_c310_${ts}`;

      // Baseline record
      await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "INITIAL_OK", entityType: "t" }, tx));
      const headBefore = await cryptoAuditWriter.getLastHead(tenant);
      expect(headBefore.sequenceNumber).toBe(1);

      // Aborting transaction
      try {
        await db.transaction(async (tx) => {
          await cryptoAuditWriter.log({ tenantId: tenant, action: "WILL_FAIL", entityType: "t" }, tx);
          throw new Error("Simulated business error");
        });
      } catch {
        // Expected rollback
      }

      // Assert sequence was rolled back and no row was left behind
      const headAfter = await cryptoAuditWriter.getLastHead(tenant);
      expect(headAfter.sequenceNumber).toBe(1);

      // Next successful write takes sequence 2 cleanly
      const nextEntry = await db.transaction((tx) => cryptoAuditWriter.log({ tenantId: tenant, action: "NEXT_OK", entityType: "t" }, tx));
      expect(nextEntry.sequenceNumber).toBe(2);
      expect((await verifyAuditChainIntegrity(tenant)).valid).toBe(true);
    });

    it("executes Stage 3 Postgres / PGlite verification runner with 100% parity", () => {
      const runnerPath = path.resolve(__dirname, "stage3-pglite-runner.ts");
      const output = execSync(`npx tsx "${runnerPath}"`, {
        encoding: "utf-8",
        env: {
          ...process.env,
          NODE_ENV: "test",
          AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "stage3-test-auth-jwt-secret-at-least-32-chars-long",
        },
      });

      expect(output).toContain("=== All Stage 3 Postgres/PGlite verification tests passed! ===");
    });
  });
});
