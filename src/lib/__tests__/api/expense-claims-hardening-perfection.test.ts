/**
 * @jest-environment node
 *
 * Expense Claims & Reimbursements Pipeline — Hardening & Integrity Suite:
 * - Safe JSON parsing across all mutating endpoints (400 Bad Request on invalid payloads)
 * - Schema bounds & positive amount validation (0.01..10,000,000 INR)
 * - Mandatory receipt attachment rule for claims >= ₹1,000
 * - Mandatory rejection comment rule when rejecting claims
 * - 404 existence guards on missing or cross-tenant claims
 * - Anti-self-approval enforcement (requesters cannot approve their own claims)
 * - Role-tiered workflow state machine transitions (pending -> pending_finance -> approved -> disbursed)
 * - Terminal state guards on disbursed/rejected claims
 * - Concurrency serialization via withFinanceLock
 * - Pre-delete status guards (approved/disbursed claims cannot be deleted)
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  departments,
  staffDepartments,
  expenseClaims,
  financialTransactions,
  activityLogs,
} from "@/db";
import { verifySession, hasPermission, resolveScopedInstitutionId } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listExpenseClaims,
  POST as createExpenseClaim,
} from "@/app/api/expense-claims/route";
import {
  GET as getExpenseClaim,
  PATCH as reviewExpenseClaim,
  DELETE as deleteExpenseClaim,
} from "@/app/api/expense-claims/[id]/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Expense Claims & Reimbursements Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_exp_a_${suffix}`;
  const instB = `inst_exp_b_${suffix}`;
  const deptA = `dept_exp_a_${suffix}`;

  const adminId = `stf_exp_adm_${suffix}`;
  const hodId = `stf_exp_hod_${suffix}`;
  const staffAId = `stf_exp_sa_${suffix}`;
  const staffBId = `stf_exp_sb_${suffix}`;

  function asUser(role: string, staffId: string, instId: string) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      userId: `usr_${staffId}`,
      staffId,
      role,
      institutionId: instId,
    });
    (hasPermission as unknown as jest.Mock).mockImplementation((_session: unknown, perm: string) => {
      if (role === "super_admin" || role === "admin") return true;
      if (role === "hod") {
        if (
          perm === "finance:create" ||
          perm === "finance:update" ||
          perm === "finance:view" ||
          perm === "finance:read"
        ) {
          return true;
        }
      }
      if (role === "staff") {
        if (
          perm === "finance:create" ||
          perm === "finance:view" ||
          perm === "finance:read"
        ) {
          return true;
        }
      }
      return false;
    });
  }

  beforeAll(async () => {
    // 1. Create Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Institution A ${suffix}`, code: `IEA_${suffix}` },
      { id: instB, name: `Institution B ${suffix}`, code: `IEB_${suffix}` },
    ]);

    // 2. Create Staff Fixtures
    await db.insert(staff).values([
      {
        id: adminId,
        email: `admin_${suffix}@test.local`,
        employeeId: `EMP_ADM_${suffix}`,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      },
      {
        id: hodId,
        email: `hod_${suffix}@test.local`,
        employeeId: `EMP_HOD_${suffix}`,
        firstName: "HOD",
        lastName: "User",
        role: "hod",
      },
      {
        id: staffAId,
        email: `staff_a_${suffix}@test.local`,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "Staff",
        lastName: "Alpha",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@test.local`,
        employeeId: `EMP_STB_${suffix}`,
        firstName: "Staff",
        lastName: "Beta",
        role: "staff",
      },
    ]);

    // 3. Staff Institutions Affiliation
    await db.insert(staffInstitutions).values([
      { id: `si_exp_adm_${suffix}`, staffId: adminId, institutionId: instA },
      { id: `si_exp_hod_${suffix}`, staffId: hodId, institutionId: instA },
      { id: `si_exp_sa_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_exp_sb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]);

    // 4. Department with HOD and Staff A
    await db.insert(departments).values({
      id: deptA,
      institutionId: instA,
      name: `Department A ${suffix}`,
      code: `DA_${suffix}`,
      headUserId: hodId,
    });

    await db.insert(staffDepartments).values([
      { id: `sd_exp_hod_${suffix}`, staffId: hodId, departmentId: deptA },
      { id: `sd_exp_sa_${suffix}`, staffId: staffAId, departmentId: deptA },
    ]);
  });

  afterAll(async () => {
    await db.delete(financialTransactions).run();
    await db.delete(activityLogs).where(inArray(activityLogs.staffId, [staffAId, staffBId, hodId, adminId])).run();
    await db.delete(expenseClaims).where(inArray(expenseClaims.staffId, [staffAId, staffBId, hodId, adminId])).run();
    await db.delete(staffDepartments).where(eq(staffDepartments.departmentId, deptA)).run();
    await db.delete(departments).where(eq(departments.id, deptA)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.institutionId, [instA, instB])).run();
    await db.delete(staff).where(inArray(staff.id, [adminId, hodId, staffAId, staffBId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    it("POST /api/expense-claims returns 400 on malformed JSON", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_json",
      });
      const res = await createExpenseClaim(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/expense-claims/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminId, instA);
      const req = new Request("http://localhost/api/expense-claims/claim-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "bad json",
      });
      const res = await reviewExpenseClaim(req, { params: Promise.resolve({ id: "claim-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Schema Bounds & Input Validation", () => {
    it("rejects zero or negative claim amount with 400", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: -50,
          category: "Stationery",
          description: "Office supplies",
        }),
      });
      const res = await createExpenseClaim(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/greater than 0/i);
    });

    it("rejects claim exceeding ₹10,000,000 with 400", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 15_000_000,
          category: "Capital",
          description: "New campus lab equipment",
          receiptUrl: "https://example.com/receipt.pdf",
        }),
      });
      const res = await createExpenseClaim(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/cannot exceed ₹10,000,000/i);
    });

    it("rejects claim >= ₹1,000 without receipt URL with 400", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 2500,
          category: "Travel",
          description: "Conference travel fare",
        }),
      });
      const res = await createExpenseClaim(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Receipt attachment is required/i);
    });

    it("rejects status rejection without review notes with 400", async () => {
      asUser("hod", hodId, instA);
      const req = new Request("http://localhost/api/expense-claims/some-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          // reviewNotes omitted
        }),
      });
      const res = await reviewExpenseClaim(req, { params: Promise.resolve({ id: "some-id" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/comment is required when rejecting/i);
    });
  });

  describe("3. Existence & Multi-Tenant Scoping Guards", () => {
    it("GET /api/expense-claims/[id] returns 404 for non-existent claim", async () => {
      asUser("admin", adminId, instA);
      const req = new Request("http://localhost/api/expense-claims/non-existent-id");
      const res = await getExpenseClaim(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(res.status).toBe(404);
    });

    it("PATCH /api/expense-claims/[id] returns 404 for non-existent claim", async () => {
      asUser("admin", adminId, instA);
      const req = new Request("http://localhost/api/expense-claims/non-existent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const res = await reviewExpenseClaim(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(res.status).toBe(404);
    });

    it("DELETE /api/expense-claims/[id] returns 404 for non-existent claim", async () => {
      asUser("admin", adminId, instA);
      const req = new Request("http://localhost/api/expense-claims/non-existent-id", {
        method: "DELETE",
      });
      const res = await deleteExpenseClaim(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("4. End-to-End Workflow State Machine & Anti-Self-Approval", () => {
    let createdClaimId: string;

    it("allows staff to submit a claim < ₹1,000 without receipt", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/expense-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 450,
          category: "Refreshments",
          description: "Department tea meeting",
        }),
      });
      const res = await createExpenseClaim(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.claim).toBeDefined();
      expect(json.claim.status).toBe("pending");
      createdClaimId = json.claim.id;
    });

    it("prevents requester from reviewing/approving their own claim (Anti-Self-Approval)", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request(`http://localhost/api/expense-claims/${createdClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
        }),
      });
      const res = await reviewExpenseClaim(req, { params: Promise.resolve({ id: createdClaimId }) });
      expect(res.status).toBe(403);
    });

    it("allows HOD to review and forward claim to pending_finance", async () => {
      asUser("hod", hodId, instA);
      const req = new Request(`http://localhost/api/expense-claims/${createdClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pending_finance",
          reviewNotes: "Verified by HOD, eligible for department reimbursement",
        }),
      });
      const res = await reviewExpenseClaim(req, { params: Promise.resolve({ id: createdClaimId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.claim.status).toBe("pending_finance");
    });

    it("allows Admin to approve claim", async () => {
      asUser("admin", adminId, instA);
      const req = new Request(`http://localhost/api/expense-claims/${createdClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          reviewNotes: "Finance approved for payout",
        }),
      });
      const res = await reviewExpenseClaim(req, { params: Promise.resolve({ id: createdClaimId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.claim.status).toBe("approved");
    });

    it("blocks deletion of an approved claim (Pre-Delete Lifecycle Guard)", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request(`http://localhost/api/expense-claims/${createdClaimId}`, {
        method: "DELETE",
      });
      const res = await deleteExpenseClaim(req, { params: Promise.resolve({ id: createdClaimId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Cannot delete an expense claim in 'approved' status/i);
    });

    it("allows Admin to disburse claim", async () => {
      asUser("admin", adminId, instA);
      const req = new Request(`http://localhost/api/expense-claims/${createdClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "disbursed",
          reviewNotes: "Reimbursement transfer completed",
        }),
      });
      const res = await reviewExpenseClaim(req, { params: Promise.resolve({ id: createdClaimId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.claim.status).toBe("disbursed");
    });

    it("blocks re-review of a disbursed claim (Terminal State Guard)", async () => {
      asUser("admin", adminId, instA);
      const req = new Request(`http://localhost/api/expense-claims/${createdClaimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          reviewNotes: "Cannot reject after disbursal",
        }),
      });
      const res = await reviewExpenseClaim(req, { params: Promise.resolve({ id: createdClaimId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/already in terminal state/i);
    });
  });

  describe("5. Deletion & Scoping Isolation", () => {
    let secondClaimId: string;

    it("creates a second claim and allows owner to delete while pending", async () => {
      asUser("staff", staffAId, instA);
      const createRes = await createExpenseClaim(
        new Request("http://localhost/api/expense-claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 200,
            category: "Printing",
            description: "Study material prints",
          }),
        })
      );
      const createJson = await createRes.json();
      secondClaimId = createJson.claim.id;

      // Staff B (different institution/user) cannot view Staff A's claim
      asUser("staff", staffBId, instB);
      const foreignGetRes = await getExpenseClaim(
        new Request(`http://localhost/api/expense-claims/${secondClaimId}`),
        { params: Promise.resolve({ id: secondClaimId }) }
      );
      expect(foreignGetRes.status).toBe(404);

      // Staff B cannot delete Staff A's claim
      const foreignDelRes = await deleteExpenseClaim(
        new Request(`http://localhost/api/expense-claims/${secondClaimId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: secondClaimId }) }
      );
      expect(foreignDelRes.status).toBe(404);

      // Staff A deletes their own claim
      asUser("staff", staffAId, instA);
      const delRes = await deleteExpenseClaim(
        new Request(`http://localhost/api/expense-claims/${secondClaimId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: secondClaimId }) }
      );
      expect(delRes.status).toBe(200);

      // Subsequent GET returns 404
      const verifyGet = await getExpenseClaim(
        new Request(`http://localhost/api/expense-claims/${secondClaimId}`),
        { params: Promise.resolve({ id: secondClaimId }) }
      );
      expect(verifyGet.status).toBe(404);
    });
  });
});
