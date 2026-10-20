/**
 * @jest-environment node
 *
 * Staff Directory & Profile Mutations Pipeline Perfection & Hardening Suite:
 * - Safe JSON parsing across all mutating endpoints (400 on malformed payloads)
 * - Pre-insert collision handling (409 Conflict on existing email or employeeId)
 * - Existence guards (404 Not Found on missing staff for PUT/PATCH/DELETE)
 * - Anti-self-deletion guard (400 Bad Request if admin attempts to revoke self)
 * - Bounded input schemas (Zod length limits, invalid formats)
 * - Pagination clamping (server-side clamp to <= 100)
 */

import {
  db,
  institutions,
  departments,
  staff,
  staffInstitutions,
  staffDepartments,
  nfcCards,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { GET as getStaff, POST as createStaff } from "@/app/api/staff/route";
import {
  GET as getStaffById,
  PUT as updateStaffById,
  PATCH as patchStaffById,
  DELETE as deleteStaffById,
} from "@/app/api/staff/[id]/route";
import {
  POST as enrollFace,
} from "@/app/api/staff/[id]/enroll-face/route";
import {
  POST as enrollFingerprint,
} from "@/app/api/staff/[id]/enroll-fingerprint/route";
import {
  POST as postNfcCard,
} from "@/app/api/staff/[id]/nfc-card/route";
import { GET as getAdminStaff } from "@/app/api/admin/staff/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

jest.mock("@/lib/onboarding/auto-assign", () => ({
  autoAssignOnboardingChecklists: jest.fn(),
  autoAssignOffboardingChecklists: jest.fn(),
}));

describe("Staff Directory Pipeline Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_staff_a_${suffix}`;
  const instB = `inst_staff_b_${suffix}`;
  const deptA = `dept_staff_a_${suffix}`;

  const superAdminId = `stf_sa_${suffix}`;
  const adminAId = `stf_adm_a_${suffix}`;
  const staffAId = `stf_staff_a_${suffix}`;
  const staffBId = `stf_staff_b_${suffix}`;

  const nfcTagA = `nfc_card_${suffix}`;

  beforeAll(async () => {
    // Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: "Institution Alpha", code: `IA_${suffix}` },
      { id: instB, name: "Institution Beta", code: `IB_${suffix}` },
    ]).run();

    // Seed Department
    await db.insert(departments).values({
      id: deptA,
      institutionId: instA,
      name: "Engineering",
      code: `ENG_${suffix}`,
    }).run();

    // Seed Staff Members
    await db.insert(staff).values([
      {
        id: superAdminId,
        email: `superadmin_${suffix}@thaiba.edu`,
        employeeId: `EMP_SA_${suffix}`,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        isActive: true,
      },
      {
        id: adminAId,
        email: `admin_${suffix}@thaiba.edu`,
        employeeId: `EMP_ADM_${suffix}`,
        firstName: "Admin",
        lastName: "Alpha",
        role: "admin",
        isActive: true,
      },
      {
        id: staffAId,
        email: `staffa_${suffix}@thaiba.edu`,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "Alice",
        lastName: "Smith",
        role: "staff",
        isActive: true,
      },
      {
        id: staffBId,
        email: `staffb_${suffix}@thaiba.edu`,
        employeeId: `EMP_STB_${suffix}`,
        firstName: "Bob",
        lastName: "Jones",
        role: "staff",
        isActive: true,
      },
    ]).run();

    // Link Staff to Institutions & Departments
    await db.insert(staffInstitutions).values([
      { id: `si_sa_${suffix}`, staffId: superAdminId, institutionId: instA },
      { id: `si_adm_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_sa_inst_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_sb_inst_${suffix}`, staffId: staffBId, institutionId: instB },
    ]).run();

    await db.insert(staffDepartments).values([
      { id: `sd_sa_${suffix}`, staffId: staffAId, departmentId: deptA },
    ]).run();

    // Seed NFC Card
    await db.insert(nfcCards).values({
      id: `card_${suffix}`,
      institutionId: instA,
      tagId: nfcTagA,
      status: "available",
    }).run();
  });

  afterAll(async () => {
    await db.delete(staffDepartments).where(eq(staffDepartments.departmentId, deptA)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.institutionId, [instA, instB])).run();
    await db.delete(nfcCards).where(eq(nfcCards.id, `card_${suffix}`)).run();
    await db.delete(staff).where(inArray(staff.id, [superAdminId, adminAId, staffAId, staffBId])).run();
    await db.delete(departments).where(eq(departments.id, deptA)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across Mutating Endpoints", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: superAdminId,
        email: `superadmin_${suffix}@thaiba.edu`,
        role: "super_admin",
        institutionId: "global",
      });
    });

    it("POST /api/staff returns 400 on malformed JSON payload", async () => {
      const req = new Request("http://localhost/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "malformed-json-payload{",
      });
      const res = await createStaff(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PUT /api/staff/[id] returns 400 on malformed JSON payload", async () => {
      const req = new Request(`http://localhost/api/staff/${staffAId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json",
      });
      const res = await updateStaffById(req, { params: Promise.resolve({ id: staffAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/staff/[id] returns 400 on malformed JSON payload", async () => {
      const req = new Request(`http://localhost/api/staff/${staffAId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      const res = await patchStaffById(req, { params: Promise.resolve({ id: staffAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/staff/[id]/nfc-card returns 400 on malformed JSON payload", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
      });
      const req = new Request(`http://localhost/api/staff/${adminAId}/nfc-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid",
      });
      const res = await postNfcCard(req, { params: Promise.resolve({ id: adminAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/staff/[id]/enroll-face returns 400 on malformed JSON payload", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
      });
      const req = new Request(`http://localhost/api/staff/${staffAId}/enroll-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      });
      const res = await enrollFace(req, { params: Promise.resolve({ id: staffAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/staff/[id]/enroll-fingerprint returns 400 on malformed JSON payload", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
      });
      const req = new Request(`http://localhost/api/staff/${staffAId}/enroll-fingerprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad",
      });
      const res = await enrollFingerprint(req, { params: Promise.resolve({ id: staffAId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Pre-Insert Collision Checks (409 Conflict)", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: superAdminId,
        role: "super_admin",
        institutionId: "global",
      });
    });

    it("returns 409 Conflict when attempting to register an already existing email (case-insensitive)", async () => {
      const req = new Request("http://localhost/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `STAFFa_${suffix}@thaiba.edu`, // uppercase variation of staffA email
          employeeId: `EMP_NEW_${suffix}`,
          firstName: "Duplicate",
          lastName: "Email",
          institutionIds: [instA],
        }),
      });
      const res = await createStaff(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Staff with this email or employee ID already exists");
    });

    it("returns 409 Conflict when attempting to register an already existing employeeId", async () => {
      const req = new Request("http://localhost/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `brandnew_${suffix}@thaiba.edu`,
          employeeId: `EMP_STA_${suffix}`, // already used by staffA
          firstName: "Duplicate",
          lastName: "EmpId",
          institutionIds: [instA],
        }),
      });
      const res = await createStaff(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Staff with this email or employee ID already exists");
    });
  });

  describe("3. Existence & Lifecycle Guards (404 and Anti-Self-Deletion)", () => {
    const nonExistentId = `non_existent_${suffix}`;

    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: superAdminId,
        role: "super_admin",
        institutionId: "global",
      });
    });

    it("PUT /api/staff/[id] returns 404 when staff member does not exist", async () => {
      const req = new Request(`http://localhost/api/staff/${nonExistentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Ghost",
        }),
      });
      const res = await updateStaffById(req, { params: Promise.resolve({ id: nonExistentId }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Staff member not found");
    });

    it("PATCH /api/staff/[id] returns 404 when staff member does not exist", async () => {
      const req = new Request(`http://localhost/api/staff/${nonExistentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "9999999999",
        }),
      });
      const res = await patchStaffById(req, { params: Promise.resolve({ id: nonExistentId }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Staff member not found");
    });

    it("DELETE /api/staff/[id] returns 404 when staff member does not exist", async () => {
      const req = new Request(`http://localhost/api/staff/${nonExistentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Testing 404" }),
      });
      const res = await deleteStaffById(req, { params: Promise.resolve({ id: nonExistentId }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Staff member not found");
    });

    it("DELETE /api/staff/[id] returns 400 when admin attempts to delete own account (anti-self-deletion)", async () => {
      const req = new Request(`http://localhost/api/staff/${superAdminId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Accidental self-delete" }),
      });
      const res = await deleteStaffById(req, { params: Promise.resolve({ id: superAdminId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Cannot revoke your own account");
    });
  });

  describe("4. Schema Bounds & Input Validation", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: superAdminId,
        role: "super_admin",
        institutionId: "global",
      });
    });

    it("rejects empty first name and last name on staff creation", async () => {
      const req = new Request("http://localhost/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `valid_${suffix}@thaiba.edu`,
          employeeId: `EMP_BOUND_${suffix}`,
          firstName: "   ",
          lastName: "Valid",
          institutionIds: [instA],
        }),
      });
      const res = await createStaff(req);
      expect(res.status).toBe(400);
    });

    it("rejects invalid email format", async () => {
      const req = new Request("http://localhost/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          employeeId: `EMP_BOUND_${suffix}`,
          firstName: "Valid",
          lastName: "Valid",
          institutionIds: [instA],
        }),
      });
      const res = await createStaff(req);
      expect(res.status).toBe(400);
    });

    it("rejects oversized employeeId exceeding 50 chars", async () => {
      const req = new Request("http://localhost/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `bound_${suffix}@thaiba.edu`,
          employeeId: "E".repeat(51),
          firstName: "Valid",
          lastName: "Valid",
          institutionIds: [instA],
        }),
      });
      const res = await createStaff(req);
      expect(res.status).toBe(400);
    });

    it("rejects negative experienceYears on update", async () => {
      const req = new Request(`http://localhost/api/staff/${staffAId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceYears: -5,
        }),
      });
      const res = await updateStaffById(req, { params: Promise.resolve({ id: staffAId }) });
      expect(res.status).toBe(400);
    });
  });

  describe("5. Query Pagination Clamping & Scoping", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: superAdminId,
        role: "super_admin",
        institutionId: "global",
      });
    });

    it("GET /api/staff clamps limit to maximum 100", async () => {
      const req = new Request("http://localhost/api/staff?page=1&limit=500");
      const res = await getStaff(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.limit).toBe(100);
    });

    it("GET /api/admin/staff returns active staff members within institution scope", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
      });
      const req = new Request("http://localhost/api/admin/staff");
      const res = await getAdminStaff(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.staff)).toBe(true);
      // Staff in institution A should be included
      const foundStaffA = json.staff.some((s: { id: string }) => s.id === staffAId);
      expect(foundStaffA).toBe(true);
      // Staff in institution B should NOT be included
      const foundStaffB = json.staff.some((s: { id: string }) => s.id === staffBId);
      expect(foundStaffB).toBe(false);
    });
  });
});
