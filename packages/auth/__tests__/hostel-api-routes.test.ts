/**
 * @jest-environment node
 *
 * TPSH Hostel ERP — Gate 3 API Routes, RBAC Matrix, Step-Up & Audit Chaining
 * Integration Verification Suite (G3.1 – G3.5)
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import path from "path";
import fs from "fs";
import {
  createSession,
  verifySession,
  createActionStepUpToken,
} from "../index";
import { resolveHostelClient } from "@/lib/hostel";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
import { db } from "@/db";
import {
  staff,
  institutions,
  staffInstitutions,
  students,
  academicYears,
  userSessions,
  stepUpUsed,
  auditLogs,
} from "@/db/schema";
import { sql } from "drizzle-orm";

import { POST as postAllocation } from "@/app/api/hostel/allocations/route";
import { DELETE as deleteAllocation } from "@/app/api/hostel/allocations/[id]/route";
import { POST as postGatePass } from "@/app/api/hostel/gate-passes/route";
import { POST as postReissueGatePass } from "@/app/api/hostel/gate-passes/[id]/reissue/route";
import { POST as postScanGatePass } from "@/app/api/hostel/gate-passes/scan/route";
import { POST as postFine } from "@/app/api/hostel/fines/route";
import { POST as postWaiveFine } from "@/app/api/hostel/fines/[id]/waive/route";

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

describe("TPSH Hostel ERP — Gate 3 Integration Test Suite (G3.1 – G3.5)", () => {
  const ts = Date.now();
  const instA = `inst_h3_a_${ts}`;
  const instB = `inst_h3_b_${ts}`;

  const academicYearId = `ay_h3_${ts}`;
  const studentMaleId = `stu_h3_m_${ts}`;
  const studentFemaleId = `stu_h3_f_${ts}`;

  // Staff members
  const wardenStaffId = `staff_w_${ts}`;
  const otherStaffId = `staff_oth_${ts}`;
  const accountsStaffId = `staff_acc_${ts}`;
  const unprivilegedStaffId = `staff_unp_${ts}`;

  // Hostel IDs
  const boysBlockId = `blk_b_${ts}`;
  const girlsBlockId = `blk_g_${ts}`;
  const roomBoysId = `rm_b_${ts}`;
  const roomGirlsId = `rm_g_${ts}`;
  const bedBoys1Id = `bed_b1_${ts}`;
  const bedBoys2Id = `bed_b2_${ts}`;
  const bedGirlsId = `bed_g_${ts}`;
  const leaveId = `leave_h3_${ts}`;

  interface HostelClient {
    execute: (stmt: string | { sql: string; args?: unknown[] }) => Promise<{ rows: Record<string, unknown>[] }>;
  }
  let client: HostelClient;

  beforeAll(async () => {
    client = resolveHostelClient(db);

    // Ensure all composite keys and hostel tables are instantiated in the test DB
    const rootDir = process.cwd();
    const sql0045Path = path.join(rootDir, "drizzle", "0045_clammy_tag.sql");
    if (fs.existsSync(sql0045Path)) {
      const sql0045 = fs.readFileSync(sql0045Path, "utf-8");
      for (const stmt of sql0045.split("--> statement-breakpoint")) {
        const trimmed = stmt.trim();
        if (trimmed) {
          try { await client.execute(trimmed); } catch {}
        }
      }
    }

    const sql0046Path = path.join(rootDir, "drizzle", "0046_curved_punisher.sql");
    if (fs.existsSync(sql0046Path)) {
      const sql0046 = fs.readFileSync(sql0046Path, "utf-8");
      for (const stmt of sql0046.split("--> statement-breakpoint")) {
        const trimmed = stmt.trim();
        if (trimmed) {
          try { await client.execute(trimmed); } catch {}
        }
      }
    }

    // 1. Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: "Hostel Institution Alpha", code: `HIA_${ts}`, isActive: true },
      { id: instB, name: "Hostel Institution Beta", code: `HIB_${ts}`, isActive: true },
    ]).run();

    // 2. Seed Academic Year
    await db.insert(academicYears).values([
      {
        id: academicYearId,
        institutionId: instA,
        name: `2026-2027 ${ts}`,
        startDate: "2026-06-01",
        endDate: "2027-05-31",
        isActive: true,
      },
    ]).run();

    // 3. Seed Students
    await db.insert(students).values([
      {
        id: studentMaleId,
        institutionId: instA,
        firstName: "Male",
        lastName: "Student",
        gender: "male",
        admissionNo: `ADM_M_${ts}`,
        isActive: true,
      },
      {
        id: studentFemaleId,
        institutionId: instA,
        firstName: "Female",
        lastName: "Student",
        gender: "female",
        admissionNo: `ADM_F_${ts}`,
        isActive: true,
      },
    ]).run();

    // 4. Seed Staff Members
    await db.insert(staff).values([
      {
        id: wardenStaffId,
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        firstName: "Warden",
        lastName: "Hostel",
        role: "admin",
        isActive: true,
        tokenVersion: 0,
        isFirstLogin: false,
      },
      {
        id: otherStaffId,
        email: `other_${ts}@thaiba.org`,
        employeeId: `EMP_OTH_${ts}`,
        firstName: "Other",
        lastName: "Warden",
        role: "admin",
        isActive: true,
        tokenVersion: 0,
        isFirstLogin: false,
      },
      {
        id: accountsStaffId,
        email: `accounts_${ts}@thaiba.org`,
        employeeId: `EMP_ACC_${ts}`,
        firstName: "Accounts",
        lastName: "Hostel",
        role: "accounts",
        isActive: true,
        tokenVersion: 0,
        isFirstLogin: false,
      },
      {
        id: unprivilegedStaffId,
        email: `unp_${ts}@thaiba.org`,
        employeeId: `EMP_UNP_${ts}`,
        firstName: "Unprivileged",
        lastName: "Staff",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
        isFirstLogin: false,
      },
    ]).run();

    // 5. Seed Staff Institutions
    await db.insert(staffInstitutions).values([
      { id: `si_w_${ts}`, staffId: wardenStaffId, institutionId: instA },
      { id: `si_oth_${ts}`, staffId: otherStaffId, institutionId: instA },
      { id: `si_acc_${ts}`, staffId: accountsStaffId, institutionId: instA },
      { id: `si_unp_${ts}`, staffId: unprivilegedStaffId, institutionId: instA },
    ]).run();

    // 6. Seed Hostel Blocks
    await client.execute({
      sql: `INSERT INTO hostel_blocks (id, institution_id, name, gender) VALUES (?, ?, ?, ?)`,
      args: [boysBlockId, instA, "Boys Block H3", "boys"],
    });
    await client.execute({
      sql: `INSERT INTO hostel_blocks (id, institution_id, name, gender) VALUES (?, ?, ?, ?)`,
      args: [girlsBlockId, instA, "Girls Block H3", "girls"],
    });

    // 7. Seed Block Warden Assignment (wardenStaffId assigned to boysBlockId, otherStaffId NOT assigned)
    const nowIso = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO hostel_block_wardens (id, institution_id, block_id, staff_id, assigned_at) VALUES (?, ?, ?, ?, ?)`,
      args: [`w_assign_${ts}`, instA, boysBlockId, wardenStaffId, nowIso],
    });

    // 8. Seed Rooms
    await client.execute({
      sql: `INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity) VALUES (?, ?, ?, ?, ?)`,
      args: [roomBoysId, instA, boysBlockId, "101", 2],
    });
    await client.execute({
      sql: `INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity) VALUES (?, ?, ?, ?, ?)`,
      args: [roomGirlsId, instA, girlsBlockId, "201", 2],
    });

    // 9. Seed Beds
    await client.execute({
      sql: `INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES (?, ?, ?, ?, ?)`,
      args: [bedBoys1Id, instA, roomBoysId, "B1", 0],
    });
    await client.execute({
      sql: `INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES (?, ?, ?, ?, ?)`,
      args: [bedBoys2Id, instA, roomBoysId, "B2", 0],
    });
    await client.execute({
      sql: `INSERT INTO hostel_beds (id, institution_id, room_id, bed_number, is_maintenance) VALUES (?, ?, ?, ?, ?)`,
      args: [bedGirlsId, instA, roomGirlsId, "G1", 0],
    });

    // 10. Seed Leave Request
    await client.execute({
      sql: `INSERT INTO hostel_leaves (
        id, institution_id, student_id, leave_type, status,
        expected_out_at, expected_in_at, authorized_pickup_name,
        authorized_pickup_phone, parent_consent_received, approved_staff_id,
        approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        leaveId,
        instA,
        studentMaleId,
        "outing",
        "approved",
        "2026-10-25T10:00:00.000Z",
        "2026-10-25T18:00:00.000Z",
        "Parent One",
        "+919876543210",
        1,
        wardenStaffId,
        "2026-10-25T09:00:00.000Z",
        "2026-10-25T08:00:00.000Z",
      ],
    });

    // 11. Seed Hostel Settings
    await client.execute({
      sql: `INSERT OR REPLACE INTO hostel_settings (
        id, institution_id, late_fine_rate_per_day_minor,
        grace_period_minutes, rounding_rule, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [`settings_${ts}`, instA, 5000, 60, "ceil", nowIso],
    });
  });

  afterAll(async () => {
    // Cleanup seeded records
    try {
      await db.delete(userSessions).where(sql`${userSessions.email} LIKE ${`%_${ts}@thaiba.org`}`).run();
      await db.delete(stepUpUsed).where(sql`${stepUpUsed.staffId} LIKE ${`%_${ts}`}`).run();
      await client.execute({
        sql: `DELETE FROM hostel_fines WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_gate_logs WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_gate_passes WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_leaves WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_bed_allocations WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_beds WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_rooms WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_block_wardens WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_blocks WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await client.execute({
        sql: `DELETE FROM hostel_settings WHERE institution_id IN (?, ?)`,
        args: [instA, instB],
      });
      await db.delete(students).where(sql`${students.institutionId} IN (${instA}, ${instB})`).run();
      await db.delete(academicYears).where(sql`${academicYears.institutionId} IN (${instA}, ${instB})`).run();
      await db.delete(staffInstitutions).where(sql`${staffInstitutions.institutionId} IN (${instA}, ${instB})`).run();
      await db.delete(staff).where(sql`${staff.id} LIKE ${`%_${ts}`}`).run();
      await db.delete(institutions).where(sql`${institutions.id} IN (${instA}, ${instB})`).run();
    } catch (cleanupErr) {
      console.warn("Test cleanup warning:", cleanupErr);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // G3.1: 5-Tier RBAC & Tenant Boundary Isolation
  // ───────────────────────────────────────────────────────────────────────────
  describe("G3.1: 5-Tier RBAC & Tenant Boundary Isolation", () => {
    it("rejects unauthenticated requests with HTTP 401", async () => {
      activeCookieMap.clear();

      const req = new Request("http://localhost/api/hostel/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: bedBoys1Id,
          studentId: studentMaleId,
          academicYearId,
        }),
      });

      const res = await postAllocation(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Not authenticated/i);
    });

    it("rejects unauthorized role lacking hostel:bed:allocate with HTTP 403", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: accountsStaffId,
        role: "accounts",
        email: `accounts_${ts}@thaiba.org`,
        employeeId: `EMP_ACC_${ts}`,
        name: "Accounts Staff",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request("http://localhost/api/hostel/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: bedBoys1Id,
          studentId: studentMaleId,
          academicYearId,
        }),
      });

      const res = await postAllocation(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Forbidden/i);
      activeCookieMap.clear();
    });

    it("rejects cross-tenant institution access with HTTP 403 TenantMismatchError", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      // Warden belongs to instA, but attempts to operate on instB
      const req = new Request("http://localhost/api/hostel/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instB,
          bedId: bedBoys1Id,
          studentId: studentMaleId,
          academicYearId,
        }),
      });

      const res = await postAllocation(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Cross-tenant access (denied|forbidden)/i);
      activeCookieMap.clear();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // G3.2: Bed Allocation & Vacate Endpoints
  // ───────────────────────────────────────────────────────────────────────────
  describe("G3.2: Bed Allocation & Vacate Endpoints", () => {
    let createdAllocationId: string;

    it("rejects allocation if staff is not an active warden for the target block with HTTP 403", async () => {
      activeCookieMap.clear();
      // otherStaffId is an admin in instA, but NOT assigned as warden to boysBlockId
      await createSession({
        staffId: otherStaffId,
        role: "admin",
        email: `other_${ts}@thaiba.org`,
        employeeId: `EMP_OTH_${ts}`,
        name: "Other Warden",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request("http://localhost/api/hostel/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: bedBoys1Id,
          studentId: studentMaleId,
          academicYearId,
        }),
      });

      const res = await postAllocation(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/not an active.*warden/i);
      activeCookieMap.clear();
    });

    it("rejects allocation on student gender mismatch with HTTP 422", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      // Female student cannot be allocated into a boys block bed
      const req = new Request("http://localhost/api/hostel/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: bedBoys1Id,
          studentId: studentFemaleId,
          academicYearId,
        }),
      });

      const res = await postAllocation(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error).toMatch(/Gender.*violation|Gender mismatch/i);
      activeCookieMap.clear();
    });

    it("successfully allocates bed when caller is active block warden with HTTP 201", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request("http://localhost/api/hostel/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: bedBoys1Id,
          studentId: studentMaleId,
          academicYearId,
        }),
      });

      const res = await postAllocation(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.allocationId).toBeDefined();

      createdAllocationId = json.allocationId;

      // Strict actor pinning: verify allocated_staff_id in database matches session staffId
      const allocDb = await client.execute({
        sql: `SELECT allocated_staff_id, bed_id, student_id FROM hostel_bed_allocations WHERE id = ?`,
        args: [createdAllocationId],
      });
      expect(allocDb.rows[0].allocated_staff_id).toBe(wardenStaffId);
      expect(allocDb.rows[0].bed_id).toBe(bedBoys1Id);
      expect(allocDb.rows[0].student_id).toBe(studentMaleId);

      activeCookieMap.clear();
    });

    it("rejects concurrent bed collision with HTTP 409", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      // Attempting to allocate bedBoys1Id again while active
      const req = new Request("http://localhost/api/hostel/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: bedBoys1Id,
          studentId: studentMaleId,
          academicYearId,
        }),
      });

      const res = await postAllocation(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already occupied|Active bed collision|UNIQUE constraint failed/i);
      activeCookieMap.clear();
    });

    it("vacates active bed allocation with HTTP 200 via DELETE", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request(`http://localhost/api/hostel/allocations/${createdAllocationId}`, {
        method: "DELETE",
      });

      const res = await deleteAllocation(req, { params: Promise.resolve({ id: createdAllocationId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Attempting to vacate already vacated bed returns 404 or 409
      const retryReq = new Request(`http://localhost/api/hostel/allocations/${createdAllocationId}`, {
        method: "DELETE",
      });
      const retryRes = await deleteAllocation(retryReq, { params: Promise.resolve({ id: createdAllocationId }) });
      expect([400, 404, 409]).toContain(retryRes.status);
      const retryJson = await retryRes.json();
      expect(retryJson.error).toMatch(/already vacated|already been vacated|not found/i);
      activeCookieMap.clear();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // G3.3: CAS Gate Pass Endpoints & QR Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe("G3.3: CAS Gate Pass Endpoints & QR Verification", () => {
    let issuedPassId: string;
    let singleRevealSecret: string;

    it("issues a gate pass with single-reveal rawQrSecret with HTTP 201", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const validUntil = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
      const req = new Request("http://localhost/api/hostel/gate-passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          validUntil,
        }),
      });

      const res = await postGatePass(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.passId).toBeDefined();
      expect(json.rawQrSecret).toBeDefined();
      expect(json.rawQrSecret.length).toBe(64); // 32 bytes hex = 64 characters

      issuedPassId = json.passId;
      singleRevealSecret = json.rawQrSecret;

      // Verify that database does NOT store rawQrSecret, only token_hash
      const passDb = await client.execute({
        sql: `SELECT token_hash FROM hostel_gate_passes WHERE id = ?`,
        args: [issuedPassId],
      });
      expect(passDb.rows[0].token_hash).not.toBe(singleRevealSecret);
      expect((passDb.rows[0].token_hash as string).length).toBe(64); // SHA-256 digest
      activeCookieMap.clear();
    });

    it("reissues gate pass invalidating previous token with HTTP 200", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const validUntil = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
      const req = new Request(`http://localhost/api/hostel/gate-passes/${issuedPassId}/reissue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validUntil,
          reason: "Student lost phone / needed QR refresh",
        }),
      });

      const res = await postReissueGatePass(req, { params: Promise.resolve({ id: issuedPassId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.passId).toBeDefined();
      expect(json.rawQrSecret).toBeDefined();
      expect(json.rawQrSecret).not.toBe(singleRevealSecret);

      // Verify previous pass is revoked
      const prevDb = await client.execute({
        sql: `SELECT status FROM hostel_gate_passes WHERE id = ?`,
        args: [issuedPassId],
      });
      expect(prevDb.rows[0].status).toBe("revoked");

      // Update pointers for subsequent scan tests
      issuedPassId = json.passId;
      singleRevealSecret = json.rawQrSecret;
      activeCookieMap.clear();
    });

    it("rejects scan with tampered/invalid rawQrSecret with HTTP 422", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request("http://localhost/api/hostel/gate-passes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passId: issuedPassId,
          rawQrSecret: "0000000000000000000000000000000000000000000000000000000000000000",
          direction: "out",
        }),
      });

      const res = await postScanGatePass(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.result).toBe("tampered");
      activeCookieMap.clear();
    });

    it("successfully processes outward scan with valid rawQrSecret with HTTP 200", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request("http://localhost/api/hostel/gate-passes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passId: issuedPassId,
          rawQrSecret: singleRevealSecret,
          direction: "out",
        }),
      });

      const res = await postScanGatePass(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(["approved", "verified"]).toContain(json.result);
      expect(json.direction).toBe("out");
      expect(json.status).toBe("used_out");
      activeCookieMap.clear();
    });

    it("successfully processes inward scan with valid rawQrSecret with HTTP 200", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request("http://localhost/api/hostel/gate-passes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passId: issuedPassId,
          rawQrSecret: singleRevealSecret,
          direction: "in",
        }),
      });

      const res = await postScanGatePass(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(["approved", "verified"]).toContain(json.result);
      expect(json.direction).toBe("in");
      expect(json.status).toBe("used_in");
      activeCookieMap.clear();
    });

    it("rejects replay scan once status is used_in with HTTP 422", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request("http://localhost/api/hostel/gate-passes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passId: issuedPassId,
          rawQrSecret: singleRevealSecret,
          direction: "in",
        }),
      });

      const res = await postScanGatePass(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.result).toBe("tampered");
      expect(json.error).toMatch(/tampered|used_in/i);
      activeCookieMap.clear();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // G3.4: High-Risk Step-Up Authentication & Anti-Replay
  // ───────────────────────────────────────────────────────────────────────────
  describe("G3.4: High-Risk Step-Up Authentication & Anti-Replay", () => {
    let fineId: string;

    it("assesses late fine with HTTP 201", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: accountsStaffId,
        role: "accounts",
        email: `accounts_${ts}@thaiba.org`,
        employeeId: `EMP_ACC_${ts}`,
        name: "Accounts Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request("http://localhost/api/hostel/fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentMaleId,
          fineCategory: "late_return",
          actualInAt: "2026-10-25T20:30:00.000Z", // 2.5 hours late past 18:00
          expectedInAt: "2026-10-25T18:00:00.000Z",
        }),
      });

      const res = await postFine(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.fineId).toBeDefined();
      expect(json.totalAmountMinor).toBeGreaterThan(0);

      fineId = json.fineId;
      activeCookieMap.clear();
    });

    it("rejects fine waiver without step-up authentication token with HTTP 403", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: accountsStaffId,
        role: "accounts",
        email: `accounts_${ts}@thaiba.org`,
        employeeId: `EMP_ACC_${ts}`,
        name: "Accounts Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const req = new Request(`http://localhost/api/hostel/fines/${fineId}/waive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Student had documented transport breakdown",
        }),
      });

      const res = await postWaiveFine(req, { params: Promise.resolve({ id: fineId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Step-up authentication required/i);
      activeCookieMap.clear();
    });

    it("waives fine with valid step-up token with HTTP 200", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: accountsStaffId,
        role: "accounts",
        email: `accounts_${ts}@thaiba.org`,
        employeeId: `EMP_ACC_${ts}`,
        name: "Accounts Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const currentSession = await verifySession();
      expect(currentSession).not.toBeNull();

      const stepUpToken = await createActionStepUpToken({
        staffId: currentSession!.staffId,
        sid: currentSession!.sid,
        action: "hostel:fine:waive",
      });

      const req = new Request(`http://localhost/api/hostel/fines/${fineId}/waive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-step-up-token": stepUpToken,
        },
        body: JSON.stringify({
          reason: "Student had documented transport breakdown",
        }),
      });

      const res = await postWaiveFine(req, { params: Promise.resolve({ id: fineId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("waived");
      expect(json.actionId).toBeDefined();

      // Verify database fine is updated to waived
      const fineDb = await client.execute({
        sql: `SELECT status FROM hostel_fines WHERE id = ?`,
        args: [fineId],
      });
      expect(fineDb.rows[0].status).toBe("waived");

      // Verify immutable fine actions ledger recorded the waiver with actorStaffId
      const actionDb = await client.execute({
        sql: `SELECT action_type, actor_staff_id FROM hostel_fine_actions WHERE fine_id = ? AND action_type = 'WAIVED'`,
        args: [fineId],
      });
      expect(actionDb.rows.length).toBe(1);
      expect(actionDb.rows[0].actor_staff_id).toBe(accountsStaffId);

      // Attempting to REPLAY the exact same step-up token on another waiver request must fail with 403
      const replayReq = new Request(`http://localhost/api/hostel/fines/${fineId}/waive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-step-up-token": stepUpToken,
        },
        body: JSON.stringify({
          reason: "Replaying exact same step up token",
        }),
      });

      const replayRes = await postWaiveFine(replayReq, { params: Promise.resolve({ id: fineId }) });
      expect(replayRes.status).toBe(403);
      const replayJson = await replayRes.json();
      expect(replayJson.error).toMatch(/already been consumed or replayed/i);
      activeCookieMap.clear();
    });

    it("enforces step-up authentication on manual gate-scan override", async () => {
      activeCookieMap.clear();
      await createSession({
        staffId: wardenStaffId,
        role: "admin",
        email: `warden_${ts}@thaiba.org`,
        employeeId: `EMP_W_${ts}`,
        name: "Warden Hostel",
        tokenVersion: 0,
        institutionId: instA,
      });

      const currentSession = await verifySession();
      expect(currentSession).not.toBeNull();

      // Calling manualOverride without step-up token returns 403
      const deniedReq = new Request("http://localhost/api/hostel/gate-passes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: "in",
          manualOverride: true,
          overrideReason: "Student phone battery died completely",
        }),
      });

      const deniedRes = await postScanGatePass(deniedReq);
      expect(deniedRes.status).toBe(403);
      const deniedJson = await deniedRes.json();
      expect(deniedJson.error).toMatch(/Step-up authentication required for manual gate pass override/i);

      // Generating valid step-up token for hostel:pass:override
      const stepUpToken = await createActionStepUpToken({
        staffId: currentSession!.staffId,
        sid: currentSession!.sid,
        action: "hostel:pass:override",
      });

      const allowedReq = new Request("http://localhost/api/hostel/gate-passes/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-step-up-token": stepUpToken,
        },
        body: JSON.stringify({
          direction: "in",
          manualOverride: true,
          overrideReason: "Student phone battery died completely",
        }),
      });

      const allowedRes = await postScanGatePass(allowedReq);
      expect(allowedRes.status).toBe(200);
      const allowedJson = await allowedRes.json();
      expect(allowedJson.result).toBe("manual_override");
      expect(allowedJson.direction).toBe("in");
      activeCookieMap.clear();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // G3.5: Cryptographic Audit Trail Emission
  // ───────────────────────────────────────────────────────────────────────────
  describe("G3.5: Cryptographic Audit Trail Emission", () => {
    it("confirms audit logs were created for mutations in this institution", async () => {
      await cryptoAuditWriter.flush();
      const logs = await client.execute({
        sql: `SELECT id, action, tenant_id FROM audit_logs WHERE tenant_id = ? ORDER BY id DESC`,
        args: [instA],
      });
      expect(logs.rows.length).toBeGreaterThan(0);
      const actions = logs.rows.map((r: Record<string, unknown>) => String(r.action || ""));
      // Confirms hostel mutation actions were logged
      expect(actions.some((a: string) => a.toUpperCase().startsWith("HOSTEL"))).toBe(true);
    });
  });
});
