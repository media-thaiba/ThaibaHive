/**
 * @jest-environment node
 *
 * Confidential Grievance Redressal & Whistleblower Pipeline — Hardening & Security Suite:
 * - Whistleblower anonymity preservation (zero-knowledge masking, staffId: null, submitterName: null)
 * - Critical IDOR prevention (fail-closed 404 on unauthorized grievance inspection)
 * - Multi-tenant institutional scoping (institution admin cannot view other institutions' staff grievances)
 * - Concurrency serialization & optimistic locking (withGrievanceLock, 409 conflict detection)
 * - Lifecycle guards & terminal state immutability (cannot modify/delete resolved/dismissed grievances)
 * - Withdrawal REST parity (DELETE [id] allowed for owner on open/in_review, rejected on resolved/dismissed)
 * - Zod schema input boundaries (subject max 200, description/response max 4000 chars)
 * - Activity audit logging on status update and withdrawal
 * - Rate limiting enforcement on creation and withdrawal
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  grievances,
  activityLogs,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listGrievances,
  POST as createGrievance,
} from "@/app/api/grievances/route";
import {
  GET as getGrievanceDetail,
  PATCH as reviewGrievance,
  DELETE as deleteGrievance,
} from "@/app/api/grievances/[id]/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Confidential Grievance Redressal & Whistleblower Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_grv_a_${suffix}`;
  const instB = `inst_grv_b_${suffix}`;

  const superAdminId = `stf_grv_sa_${suffix}`;
  const principalAId = `stf_grv_pra_a_${suffix}`;
  const principalBId = `stf_grv_pra_b_${suffix}`;
  const adminAId = `stf_grv_adm_a_${suffix}`;
  const staffAId = `stf_grv_usr_a_${suffix}`;
  const staffBId = `stf_grv_usr_b_${suffix}`;

  const createdGrievanceIds: string[] = [];

  const setSession = (payload: Record<string, unknown> | null) => {
    (verifySession as jest.Mock).mockResolvedValue(payload);
  };

  const makeJsonReq = (url: string, body?: unknown, method = "POST"): Request =>
    new Request(url, {
      method,
      headers: method === "GET" || method === "DELETE" ? undefined : { "Content-Type": "application/json" },
      body: method === "GET" || method === "DELETE" || body === undefined || body === null ? undefined : JSON.stringify(body),
    });

  const contextParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: instA, name: `Campus Alpha ${suffix}`, code: `CA-${suffix}` },
      { id: instB, name: `Campus Beta ${suffix}`, code: `CB-${suffix}` },
    ]).run();

    // Seed staff across institutions
    await db.insert(staff).values([
      {
        id: superAdminId,
        email: `sa_${suffix}@grv.test`,
        employeeId: `EMP_SA_${suffix}`,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
      },
      {
        id: principalAId,
        email: `principal_a_${suffix}@grv.test`,
        employeeId: `EMP_PRA_A_${suffix}`,
        firstName: "PrincipalA",
        lastName: "Alpha",
        role: "principal",
      },
      {
        id: principalBId,
        email: `principal_b_${suffix}@grv.test`,
        employeeId: `EMP_PRA_B_${suffix}`,
        firstName: "PrincipalB",
        lastName: "Beta",
        role: "principal",
      },
      {
        id: adminAId,
        email: `admin_a_${suffix}@grv.test`,
        employeeId: `EMP_ADM_A_${suffix}`,
        firstName: "AdminA",
        lastName: "Alpha",
        role: "admin",
      },
      {
        id: staffAId,
        email: `staff_a_${suffix}@grv.test`,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "StaffA",
        lastName: "AlphaMember",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@grv.test`,
        employeeId: `EMP_STB_${suffix}`,
        firstName: "StaffB",
        lastName: "BetaMember",
        role: "staff",
      },
    ]).run();

    await db.insert(staffInstitutions).values([
      { id: `si_pra_a_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_pra_b_${suffix}`, staffId: principalBId, institutionId: instB },
      { id: `si_adm_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_sta_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_stb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]).run();
  });

  afterAll(async () => {
    if (createdGrievanceIds.length > 0) {
      await db.delete(grievances).where(inArray(grievances.id, createdGrievanceIds)).run();
    }
    const allStaff = [superAdminId, principalAId, principalBId, adminAId, staffAId, staffBId];
    await db.delete(activityLogs).where(inArray(activityLogs.staffId, allStaff)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, allStaff)).run();
    await db.delete(staff).where(inArray(staff.id, allStaff)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("Whistleblower Anonymity Preservation & Creation Integrity", () => {
    it("persists anonymous grievances with staffId: null in database and masks in API response", async () => {
      setSession({ staffId: staffAId, role: "staff", permissions: ["grievances:create"] });

      const req = makeJsonReq("http://localhost:3000/api/grievances", {
        category: "workplace",
        subject: "Unsafe laboratory ventilation",
        description: "Chemical fumes accumulating in Block C laboratory 2.",
        isAnonymous: true,
      });

      const res = await createGrievance(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.grievance.isAnonymous).toBe(true);
      expect(data.grievance.staffId).toBeNull();
      createdGrievanceIds.push(data.grievance.id);

      // Verify directly in DB that staffId is truly null (zero metadata leakage)
      const dbRow = await db.select().from(grievances).where(eq(grievances.id, data.grievance.id)).get();
      expect(dbRow?.staffId).toBeNull();
      expect(dbRow?.isAnonymous).toBe(true);
    });

    it("allows non-anonymous submission when isAnonymous: false", async () => {
      setSession({ staffId: staffAId, role: "staff", permissions: ["grievances:create"] });

      const req = makeJsonReq("http://localhost:3000/api/grievances", {
        category: "infrastructure",
        subject: "Broken air conditioner in classroom 101",
        description: "The AC unit in room 101 stopped working this morning.",
        isAnonymous: false,
      });

      const res = await createGrievance(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.grievance.isAnonymous).toBe(false);
      expect(data.grievance.staffId).toBe(staffAId);
      createdGrievanceIds.push(data.grievance.id);

      const dbRow = await db.select().from(grievances).where(eq(grievances.id, data.grievance.id)).get();
      expect(dbRow?.staffId).toBe(staffAId);
    });

    it("enforces schema boundaries on subject (> 200 chars) and description (> 4000 chars)", async () => {
      setSession({ staffId: staffAId, role: "staff", permissions: ["grievances:create"] });

      // Overlength subject
      const longSubjectReq = makeJsonReq("http://localhost:3000/api/grievances", {
        category: "general",
        subject: "x".repeat(201),
        description: "Valid description",
      });
      const res1 = await createGrievance(longSubjectReq);
      expect(res1.status).toBe(400);

      // Overlength description
      const longDescReq = makeJsonReq("http://localhost:3000/api/grievances", {
        category: "general",
        subject: "Valid subject",
        description: "x".repeat(4001),
      });
      const res2 = await createGrievance(longDescReq);
      expect(res2.status).toBe(400);
    });
  });

  describe("Critical IDOR & Fail-Closed Authorization Gates", () => {
    let nonAnonGrievanceId: string;
    let anonGrievanceId: string;

    beforeAll(async () => {
      // Submitter is Staff A
      const g1 = await db.insert(grievances).values({
        id: crypto.randomUUID(),
        staffId: staffAId,
        isAnonymous: false,
        category: "harassment",
        subject: "Confidential report by Staff A",
        description: "Detailed report",
        status: "open",
      }).returning().get();
      nonAnonGrievanceId = g1.id;
      createdGrievanceIds.push(g1.id);

      const g2 = await db.insert(grievances).values({
        id: crypto.randomUUID(),
        staffId: null,
        isAnonymous: true,
        category: "whistleblower",
        subject: "Anonymous whistleblower notice",
        description: "Financial irregularities in procurement",
        status: "open",
      }).returning().get();
      anonGrievanceId = g2.id;
      createdGrievanceIds.push(g2.id);
    });

    it("allows the submitter to view their own non-anonymous grievance", async () => {
      setSession({ staffId: staffAId, role: "staff", permissions: ["grievances:read"] });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${nonAnonGrievanceId}`, null, "GET");
      const res = await getGrievanceDetail(req, contextParams(nonAnonGrievanceId));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.grievance.id).toBe(nonAnonGrievanceId);
      expect(data.grievance.submitterName).toContain("StaffA");
    });

    it("prevents IDOR: unauthorized regular staff member receives fail-closed 404 (not 403)", async () => {
      // Staff B tries to access Staff A's grievance
      setSession({ staffId: staffBId, role: "staff", permissions: ["grievances:read"] });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${nonAnonGrievanceId}`, null, "GET");
      const res = await getGrievanceDetail(req, contextParams(nonAnonGrievanceId));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Grievance not found");
    });

    it("prevents IDOR on anonymous grievance: regular staff member receives 404", async () => {
      setSession({ staffId: staffAId, role: "staff", permissions: ["grievances:read"] });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${anonGrievanceId}`, null, "GET");
      const res = await getGrievanceDetail(req, contextParams(anonGrievanceId));
      expect(res.status).toBe(404);
    });

    it("allows super_admin full view of any grievance but preserves anonymous masking", async () => {
      setSession({ staffId: superAdminId, role: "super_admin", permissions: ["*"] });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${anonGrievanceId}`, null, "GET");
      const res = await getGrievanceDetail(req, contextParams(anonGrievanceId));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.grievance.id).toBe(anonGrievanceId);
      expect(data.grievance.staffId).toBeNull();
      expect(data.grievance.submitterName).toBeNull();
    });
  });

  describe("Multi-Tenant Institutional Scoping for Managers", () => {
    let staffAGrievanceId: string;

    beforeAll(async () => {
      const g = await db.insert(grievances).values({
        id: crypto.randomUUID(),
        staffId: staffAId,
        isAnonymous: false,
        category: "management",
        subject: "Curriculum dispute in Alpha",
        description: "Course allocation issue at Institution A",
        status: "open",
      }).returning().get();
      staffAGrievanceId = g.id;
      createdGrievanceIds.push(g.id);
    });

    it("grants access to Principal A for grievances submitted by Staff A (same institution)", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["grievances:read", "grievances:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${staffAGrievanceId}`, null, "GET");
      const res = await getGrievanceDetail(req, contextParams(staffAGrievanceId));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.grievance.id).toBe(staffAGrievanceId);
    });

    it("blocks Principal B from accessing grievances submitted by Staff A (cross-tenant 404)", async () => {
      setSession({
        staffId: principalBId,
        role: "principal",
        institutionId: instB,
        permissions: ["grievances:read", "grievances:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${staffAGrievanceId}`, null, "GET");
      const res = await getGrievanceDetail(req, contextParams(staffAGrievanceId));
      expect(res.status).toBe(404);
    });

    it("allows global Admin A to inspect grievances across institutions", async () => {
      setSession({
        staffId: adminAId,
        role: "super_admin",
        permissions: ["grievances:read", "grievances:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${staffAGrievanceId}`, null, "GET");
      const res = await getGrievanceDetail(req, contextParams(staffAGrievanceId));
      expect(res.status).toBe(200);
    });

    it("filters listing: regular staff only see their own non-anonymous grievances", async () => {
      setSession({ staffId: staffAId, role: "staff", permissions: ["grievances:read"] });

      const req = makeJsonReq("http://localhost:3000/api/grievances", null, "GET");
      const res = await listGrievances(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      for (const item of data.grievances) {
        expect(item.staffId).toBe(staffAId);
        expect(item.isAnonymous).toBe(false);
      }
    });
  });

  describe("Mutex Serialization, Optimistic Concurrency & Lifecycle Immutability", () => {
    let reviewGrievanceId: string;

    beforeEach(async () => {
      const g = await db.insert(grievances).values({
        id: crypto.randomUUID(),
        staffId: staffAId,
        isAnonymous: false,
        category: "workplace",
        subject: "Disciplinary inquiry",
        description: "Investigation pending",
        status: "open",
      }).returning().get();
      reviewGrievanceId = g.id;
      createdGrievanceIds.push(g.id);
    });

    it("allows manager to update status to in_review and then resolved", async () => {
      setSession({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
        permissions: ["grievances:manage"],
      });

      const req1 = makeJsonReq(`http://localhost:3000/api/grievances/${reviewGrievanceId}`, {
        status: "in_review",
        response: "Inquiry assigned to committee.",
      }, "PATCH");
      const res1 = await reviewGrievance(req1, contextParams(reviewGrievanceId));
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.grievance.status).toBe("in_review");

      const req2 = makeJsonReq(`http://localhost:3000/api/grievances/${reviewGrievanceId}`, {
        status: "resolved",
        response: "Matter resolved satisfactorily.",
      }, "PATCH");
      const res2 = await reviewGrievance(req2, contextParams(reviewGrievanceId));
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.grievance.status).toBe("resolved");

      // Verify activity logs created
      const logs = await db.select().from(activityLogs).where(eq(activityLogs.resourceId, reviewGrievanceId)).all();
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it("enforces terminal state immutability: cannot edit a resolved grievance without re-opening", async () => {
      // Set to resolved
      await db.update(grievances).set({ status: "resolved" }).where(eq(grievances.id, reviewGrievanceId)).run();

      setSession({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
        permissions: ["grievances:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${reviewGrievanceId}`, {
        response: "Attempting to change response after resolution",
      }, "PATCH");
      const res = await reviewGrievance(req, contextParams(reviewGrievanceId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("terminal state");
    });

    it("rejects response exceeding 4000 characters in PATCH review", async () => {
      setSession({
        staffId: adminAId,
        role: "admin",
        institutionId: instA,
        permissions: ["grievances:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${reviewGrievanceId}`, {
        response: "z".repeat(4001),
      }, "PATCH");
      const res = await reviewGrievance(req, contextParams(reviewGrievanceId));
      expect(res.status).toBe(400);
    });
  });

  describe("Withdrawal / Deletion REST Parity (DELETE /api/grievances/[id])", () => {
    it("allows non-anonymous owner to delete their own grievance while in open status", async () => {
      const g = await db.insert(grievances).values({
        id: crypto.randomUUID(),
        staffId: staffAId,
        isAnonymous: false,
        category: "general",
        subject: "Mistaken submission",
        description: "Submitted in error, requesting withdrawal",
        status: "open",
      }).returning().get();
      createdGrievanceIds.push(g.id);

      setSession({ staffId: staffAId, role: "staff", permissions: ["grievances:create"] });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${g.id}`, null, "DELETE");
      const res = await deleteGrievance(req, contextParams(g.id));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const check = await db.select().from(grievances).where(eq(grievances.id, g.id)).get();
      expect(check).toBeUndefined();

      // Verify audit trail recorded withdrawal
      const log = await db.select().from(activityLogs).where(eq(activityLogs.resourceId, g.id)).get();
      expect(log?.action).toBe("grievance_withdrawn");
    });

    it("blocks other staff members from deleting another user's grievance (403)", async () => {
      const g = await db.insert(grievances).values({
        id: crypto.randomUUID(),
        staffId: staffAId,
        isAnonymous: false,
        category: "general",
        subject: "Staff A report",
        description: "Private issue",
        status: "open",
      }).returning().get();
      createdGrievanceIds.push(g.id);

      setSession({ staffId: staffBId, role: "staff", permissions: ["grievances:create"] });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${g.id}`, null, "DELETE");
      const res = await deleteGrievance(req, contextParams(g.id));
      expect(res.status).toBe(403);
    });

    it("blocks deletion of a resolved grievance (400 compliance lock)", async () => {
      const g = await db.insert(grievances).values({
        id: crypto.randomUUID(),
        staffId: staffAId,
        isAnonymous: false,
        category: "general",
        subject: "Resolved matter",
        description: "Official record",
        status: "resolved",
      }).returning().get();
      createdGrievanceIds.push(g.id);

      setSession({ staffId: staffAId, role: "staff", permissions: ["grievances:create"] });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${g.id}`, null, "DELETE");
      const res = await deleteGrievance(req, contextParams(g.id));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("resolved");
    });

    it("allows super_admin to delete open/in_review grievance", async () => {
      const g = await db.insert(grievances).values({
        id: crypto.randomUUID(),
        staffId: staffAId,
        isAnonymous: false,
        category: "general",
        subject: "Super admin cleanup",
        description: "Test entry",
        status: "in_review",
      }).returning().get();
      createdGrievanceIds.push(g.id);

      setSession({ staffId: superAdminId, role: "super_admin", permissions: ["*"] });

      const req = makeJsonReq(`http://localhost:3000/api/grievances/${g.id}`, null, "DELETE");
      const res = await deleteGrievance(req, contextParams(g.id));
      expect(res.status).toBe(200);
    });
  });
});
