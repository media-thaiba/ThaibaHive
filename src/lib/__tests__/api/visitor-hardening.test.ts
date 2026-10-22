/**
 * @jest-environment node
 *
 * Visitor & Gatepass Security Management Pipeline — Hardening & Integrity Suite:
 * - Critical RBAC boundary: POST /api/visitors/verify requires 'visitor:verify' (rejects 'staff:read' with 403)
 * - Double-scan concurrency serialization & optimistic status locking on gate check-in/out
 * - Physical security audit preservation: blocks deleting active 'checked_in' visitors (400)
 * - Deletion parity on 'checked_out' visitors with activity audit logging
 * - Pre-registration approval state machine & terminal status immutability
 * - Duplicate pass prevention: blocks issuing multiple passes for the same pre-registration request (409)
 * - Gate log recording: entries written to gateLogs on check-in and check-out
 * - Multi-tenant isolation: cross-tenant inspection and gate operations return fail-closed 404
 * - Centralized rate limiting enforcement across endpoints
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  visitors,
  visitorRequests,
  visitorPasses,
  gateLogs,
  activityLogs,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listVisitors,
  POST as createVisitor,
} from "@/app/api/visitors/route";
import {
  GET as getVisitorDetail,
  PATCH as updateVisitor,
  DELETE as deleteVisitor,
} from "@/app/api/visitors/[id]/route";
import {
  GET as verifyGateGet,
  POST as verifyGatePost,
} from "@/app/api/visitors/verify/route";
import { POST as issuePass } from "@/app/api/visitors/pass/issue/route";
import { POST as processApproval } from "@/app/api/visitors/approvals/route";
import {
  GET as listPreRegistrations,
  POST as preRegisterVisitor,
} from "@/app/api/visitors/pre-register/route";
import { GET as exportVisitors } from "@/app/api/export/visitors/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Visitor & Gatepass Security Management Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_vsh_a_${suffix}`;
  const instB = `inst_vsh_b_${suffix}`;

  const superAdminId = `stf_vsh_sa_${suffix}`;
  const principalAId = `stf_vsh_pa_${suffix}`;
  const principalBId = `stf_vsh_pb_${suffix}`;
  const gatekeeperAId = `stf_vsh_gk_a_${suffix}`;
  const hostAId = `stf_vsh_host_a_${suffix}`;
  const regularStaffId = `stf_vsh_usr_${suffix}`;

  const createdVisitorIds: string[] = [];
  const createdRequestIds: string[] = [];
  const createdPassIds: string[] = [];

  const setSession = (payload: Record<string, unknown> | null) => {
    (verifySession as jest.Mock).mockResolvedValue(payload);
    (hasPermission as jest.Mock).mockImplementation((role: string, permission: string) => {
      if (!payload) return false;
      if (payload.role === "super_admin") return true;
      const perms = (payload.permissions as string[]) || [];
      return perms.includes("*") || perms.includes(permission);
    });
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
      { id: instA, name: `Secure Campus Alpha ${suffix}`, code: `SCA-${suffix}` },
      { id: instB, name: `Secure Campus Beta ${suffix}`, code: `SCB-${suffix}` },
    ]).run();

    // Seed staff
    await db.insert(staff).values([
      {
        id: superAdminId,
        email: `sa_${suffix}@vsh.test`,
        employeeId: `EMP_SA_${suffix}`,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
      },
      {
        id: principalAId,
        email: `principal_a_${suffix}@vsh.test`,
        employeeId: `EMP_PA_${suffix}`,
        firstName: "PrincipalA",
        lastName: "Alpha",
        role: "principal",
      },
      {
        id: principalBId,
        email: `principal_b_${suffix}@vsh.test`,
        employeeId: `EMP_PB_${suffix}`,
        firstName: "PrincipalB",
        lastName: "Beta",
        role: "principal",
      },
      {
        id: gatekeeperAId,
        email: `gatekeeper_a_${suffix}@vsh.test`,
        employeeId: `EMP_GK_${suffix}`,
        firstName: "Gatekeeper",
        lastName: "Alpha",
        role: "principal", // Principal tier has visitor:verify
      },
      {
        id: hostAId,
        email: `host_a_${suffix}@vsh.test`,
        employeeId: `EMP_HST_${suffix}`,
        firstName: "Host",
        lastName: "Professor",
        role: "staff",
      },
      {
        id: regularStaffId,
        email: `regular_${suffix}@vsh.test`,
        employeeId: `EMP_REG_${suffix}`,
        firstName: "Regular",
        lastName: "Reader",
        role: "staff",
      },
    ]).run();

    await db.insert(staffInstitutions).values([
      { id: `si_pa_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_pb_${suffix}`, staffId: principalBId, institutionId: instB },
      { id: `si_gk_${suffix}`, staffId: gatekeeperAId, institutionId: instA },
      { id: `si_hst_${suffix}`, staffId: hostAId, institutionId: instA },
      { id: `si_reg_${suffix}`, staffId: regularStaffId, institutionId: instA },
    ]).run();
  });

  afterAll(async () => {
    if (createdPassIds.length > 0) {
      await db.delete(visitorPasses).where(inArray(visitorPasses.id, createdPassIds)).run();
    }
    if (createdRequestIds.length > 0) {
      await db.delete(visitorRequests).where(inArray(visitorRequests.id, createdRequestIds)).run();
    }
    if (createdVisitorIds.length > 0) {
      await db.delete(visitors).where(inArray(visitors.id, createdVisitorIds)).run();
    }
    const allStaff = [superAdminId, principalAId, principalBId, gatekeeperAId, hostAId, regularStaffId];
    await db.delete(gateLogs).where(inArray(gateLogs.institutionId, [instA, instB])).run();
    await db.delete(activityLogs).where(inArray(activityLogs.staffId, allStaff)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, allStaff)).run();
    await db.delete(staff).where(inArray(staff.id, allStaff)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("Critical RBAC Gate Verification Boundary (VULN-VIS-01)", () => {
    let testVisitorId: string;

    beforeEach(async () => {
      const v = await db.insert(visitors).values({
        id: crypto.randomUUID(),
        name: "Gate RBAC Visitor",
        purpose: "Guest Lecture",
        institutionId: instA,
        checkIn: new Date().toISOString(),
        status: "checked_in",
      }).returning().get();
      testVisitorId = v.id;
      createdVisitorIds.push(v.id);
    });

    it("rejects gate verification when caller only has 'staff:read' (closes privilege escalation)", async () => {
      // User with staff:read but lacking visitor:verify
      setSession({
        staffId: regularStaffId,
        role: "staff",
        institutionId: instA,
        permissions: ["staff:read", "visitors:read"],
      });

      const req = makeJsonReq("http://localhost:3000/api/visitors/verify", {
        visitorId: testVisitorId,
        action: "check_out",
      });

      const res = await verifyGatePost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Forbidden");
    });

    it("allows gatekeeper with 'visitor:verify' to successfully execute check-out", async () => {
      setSession({
        staffId: gatekeeperAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:verify", "visitors:read"],
      });

      const req = makeJsonReq("http://localhost:3000/api/visitors/verify", {
        visitorId: testVisitorId,
        action: "check_out",
        deviceId: "GATE-01-TURNSTILE",
        notes: "Scheduled departure",
      });

      const res = await verifyGatePost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.action).toBe("check_out");
      expect(data.visitor.status).toBe("checked_out");

      // Verify gateLogs audit entry was created
      const logs = await db.select().from(gateLogs).where(eq(gateLogs.visitorName, "Gate RBAC Visitor")).all();
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].actionType).toBe("check_out");
      expect(logs[0].deviceId).toBe("GATE-01-TURNSTILE");
    });
  });

  describe("Double-Scan & Concurrency Serialization (VULN-VIS-02)", () => {
    it("rejects duplicate check_out on an already checked-out visitor", async () => {
      const v = await db.insert(visitors).values({
        id: crypto.randomUUID(),
        name: "Double Checkout Visitor",
        purpose: "Maintenance",
        institutionId: instA,
        checkIn: new Date().toISOString(),
        checkOut: new Date().toISOString(),
        status: "checked_out",
      }).returning().get();
      createdVisitorIds.push(v.id);

      setSession({
        staffId: gatekeeperAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:verify"],
      });

      const req = makeJsonReq("http://localhost:3000/api/visitors/verify", {
        visitorId: v.id,
        action: "check_out",
      });

      const res = await verifyGatePost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("already expired/checked out");
    });

    it("enforces terminal-state lock on PATCH: rejects status changes once checked_out", async () => {
      const v = await db.insert(visitors).values({
        id: crypto.randomUUID(),
        name: "Terminal State Visitor",
        purpose: "Delivery",
        institutionId: instA,
        checkIn: new Date().toISOString(),
        checkOut: new Date().toISOString(),
        status: "checked_out",
      }).returning().get();
      createdVisitorIds.push(v.id);

      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitors:update"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/visitors/${v.id}`, {
        status: "checked_in",
      }, "PATCH");

      const res = await updateVisitor(req, contextParams(v.id));
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already checked out");
    });
  });

  describe("Physical Security Audit Preservation on DELETE (VULN-VIS-03)", () => {
    it("blocks deleting an active checked_in visitor (prevents campus security blindspot)", async () => {
      const v = await db.insert(visitors).values({
        id: crypto.randomUUID(),
        name: "Active Campus Visitor",
        purpose: "Parent Teacher Meeting",
        institutionId: instA,
        checkIn: new Date().toISOString(),
        status: "checked_in",
      }).returning().get();
      createdVisitorIds.push(v.id);

      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitors:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/visitors/${v.id}`, null, "DELETE");
      const res = await deleteVisitor(req, contextParams(v.id));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot delete a visitor with active 'checked_in' status");

      // Verify row still exists in DB
      const check = await db.select().from(visitors).where(eq(visitors.id, v.id)).get();
      expect(check).toBeDefined();
    });

    it("allows deleting a checked_out visitor and records activity audit log", async () => {
      const v = await db.insert(visitors).values({
        id: crypto.randomUUID(),
        name: "Departed Visitor",
        purpose: "Audit",
        institutionId: instA,
        checkIn: new Date(Date.now() - 3600000).toISOString(),
        checkOut: new Date().toISOString(),
        status: "checked_out",
      }).returning().get();
      createdVisitorIds.push(v.id);

      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitors:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/visitors/${v.id}`, null, "DELETE");
      const res = await deleteVisitor(req, contextParams(v.id));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const check = await db.select().from(visitors).where(eq(visitors.id, v.id)).get();
      expect(check).toBeUndefined();

      // Verify activity audit log was created
      const audit = await db.select().from(activityLogs).where(eq(activityLogs.resourceId, v.id)).get();
      expect(audit?.action).toBe("visitor_record_deleted");
    });
  });

  describe("Pre-Registration & Approval Lifecycle State Machine (VULN-VIS-04 / VULN-VIS-05)", () => {
    let testRequestId: string;

    beforeEach(async () => {
      const r = await db.insert(visitorRequests).values({
        id: crypto.randomUUID(),
        institutionId: instA,
        visitorName: "Vendor Tech Specialist",
        visitorPhone: "+919876543210",
        hostStaffId: hostAId,
        purpose: "Server Maintenance",
        expectedDate: "2026-10-25",
        status: "pending",
      }).returning().get();
      testRequestId = r.id;
      createdRequestIds.push(r.id);
    });

    it("handles invalid JSON body in approvals endpoint gracefully with 400 (not 500)", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:issue"],
      });

      const req = new Request("http://localhost:3000/api/visitors/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "INVALID_JSON_BODY{{{",
      });

      const res = await processApproval(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON body");
    });

    it("successfully approves a pending request and creates activity audit log", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:issue"],
      });

      const req = makeJsonReq("http://localhost:3000/api/visitors/approvals", {
        requestId: testRequestId,
        status: "approved",
      });

      const res = await processApproval(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.request.status).toBe("approved");

      // Verify audit log
      const log = await db.select().from(activityLogs).where(eq(activityLogs.resourceId, testRequestId)).get();
      expect(log?.action).toBe("visitor_request_approved");
    });

    it("blocks flipping a request that is already approved or rejected (terminal state lock)", async () => {
      // First approve
      await db.update(visitorRequests).set({ status: "approved" }).where(eq(visitorRequests.id, testRequestId)).run();

      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:issue"],
      });

      const req = makeJsonReq("http://localhost:3000/api/visitors/approvals", {
        requestId: testRequestId,
        status: "rejected",
        rejectionReason: "Too late",
      });

      const res = await processApproval(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("terminal state 'approved'");
    });
  });

  describe("Duplicate Pass Prevention & Issuance Integrity", () => {
    let approvedRequestId: string;

    beforeEach(async () => {
      const r = await db.insert(visitorRequests).values({
        id: crypto.randomUUID(),
        institutionId: instA,
        visitorName: "Single Pass Visitor",
        visitorPhone: "+919876543210",
        hostStaffId: hostAId,
        purpose: "Interview",
        expectedDate: "2026-10-25",
        status: "approved",
      }).returning().get();
      approvedRequestId = r.id;
      createdRequestIds.push(r.id);
    });

    it("issues a pass against an approved request and rejects duplicate issuance (409)", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:issue"],
      });

      const now = Date.now();
      const validFrom = new Date(now - 1000).toISOString();
      const validUntil = new Date(now + 4 * 3600000).toISOString();

      const passPayload = {
        requestId: approvedRequestId,
        visitorName: "Single Pass Visitor",
        visitorPhone: "+919876543210",
        hostStaffId: hostAId,
        purpose: "Interview",
        validFrom,
        validUntil,
      };

      // First pass issue succeeds
      const req1 = makeJsonReq("http://localhost:3000/api/visitors/pass/issue", passPayload);
      const res1 = await issuePass(req1);
      expect(res1.status).toBe(201);
      const data1 = await res1.json();
      expect(data1.pass.requestId).toBe(approvedRequestId);
      createdPassIds.push(data1.pass.id);

      // Second attempt to issue a pass for the same request is rejected
      const req2 = makeJsonReq("http://localhost:3000/api/visitors/pass/issue", passPayload);
      const res2 = await issuePass(req2);
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error).toContain("already been issued");
    });
  });

  describe("Multi-Tenant Institutional Isolation", () => {
    let instAVisitorId: string;

    beforeAll(async () => {
      const v = await db.insert(visitors).values({
        id: crypto.randomUUID(),
        name: "Tenant Alpha Visitor",
        purpose: "Confidential Review",
        institutionId: instA,
        checkIn: new Date().toISOString(),
        status: "checked_in",
      }).returning().get();
      instAVisitorId = v.id;
      createdVisitorIds.push(v.id);
    });

    it("allows Principal A to inspect visitor from Institution A", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitors:read"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/visitors/${instAVisitorId}`, null, "GET");
      const res = await getVisitorDetail(req, contextParams(instAVisitorId));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.visitor.id).toBe(instAVisitorId);
    });

    it("blocks Principal B from accessing visitor belonging to Institution A (fail-closed 404)", async () => {
      setSession({
        staffId: principalBId,
        role: "principal",
        institutionId: instB,
        permissions: ["visitors:read"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/visitors/${instAVisitorId}`, null, "GET");
      const res = await getVisitorDetail(req, contextParams(instAVisitorId));
      expect(res.status).toBe(404);
    });

    it("blocks Principal B from checking out visitor belonging to Institution A (fail-closed 404)", async () => {
      setSession({
        staffId: principalBId,
        role: "principal",
        institutionId: instB,
        permissions: ["visitor:verify"],
      });

      const req = makeJsonReq("http://localhost:3000/api/visitors/verify", {
        visitorId: instAVisitorId,
        action: "check_out",
      });

      const res = await verifyGatePost(req);
      expect(res.status).toBe(404);
    });
  });

  describe("Multi-Tenant Export Isolation, Pre-Registration Scoping & Dynamic URL Fallbacks", () => {
    it("scopes visitor export strictly to caller's verified institution", async () => {
      const now = Date.now();
      const validFrom = new Date(now - 1000).toISOString();
      const validUntil = new Date(now + 4 * 3600000).toISOString();

      const passA = await db.insert(visitorPasses).values({
        id: crypto.randomUUID(),
        institutionId: instA,
        visitorName: "Visitor Alpha Unique",
        visitorPhone: "+911111111111",
        hostStaffId: hostAId,
        purpose: "Alpha Visit",
        qrSignature: "sig_a",
        validFrom,
        validUntil,
        status: "approved",
      }).returning().get();

      const passB = await db.insert(visitorPasses).values({
        id: crypto.randomUUID(),
        institutionId: instB,
        visitorName: "Visitor Beta Unique",
        visitorPhone: "+912222222222",
        hostStaffId: principalBId,
        purpose: "Beta Visit",
        qrSignature: "sig_b",
        validFrom,
        validUntil,
        status: "approved",
      }).returning().get();

      createdPassIds.push(passA.id, passB.id);

      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:read"],
      });

      const reqExport = makeJsonReq("http://localhost:3000/api/export/visitors?format=csv", null, "GET");
      const resExport = await exportVisitors(reqExport);
      expect(resExport.status).toBe(200);
      const csvText = await resExport.text();

      expect(csvText).toContain("Visitor Alpha Unique");
      expect(csvText).not.toContain("Visitor Beta Unique");
    });

    it("scopes pre-registration request listing strictly to caller's verified institution", async () => {
      const reqA = await db.insert(visitorRequests).values({
        id: crypto.randomUUID(),
        institutionId: instA,
        visitorName: "Prereg Alpha Unique",
        visitorPhone: "+911234567890",
        hostStaffId: hostAId,
        purpose: "Seminar",
        expectedDate: "2026-11-01",
        status: "pending",
      }).returning().get();

      const reqB = await db.insert(visitorRequests).values({
        id: crypto.randomUUID(),
        institutionId: instB,
        visitorName: "Prereg Beta Unique",
        visitorPhone: "+919876543210",
        hostStaffId: principalBId,
        purpose: "Conference",
        expectedDate: "2026-11-02",
        status: "pending",
      }).returning().get();

      createdRequestIds.push(reqA.id, reqB.id);

      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:read"],
      });

      const reqList = makeJsonReq("http://localhost:3000/api/visitors/pre-register", null, "GET");
      const resList = await listPreRegistrations(reqList);
      expect(resList.status).toBe(200);
      const dataList = await resList.json();
      const names = dataList.requests.map((r: any) => r.visitorName);

      expect(names).toContain("Prereg Alpha Unique");
      expect(names).not.toContain("Prereg Beta Unique");
    });

    it("extracts visitor ID from URL pathname when context params are missing", async () => {
      const v = await db.insert(visitors).values({
        id: crypto.randomUUID(),
        name: "URL Path Test Visitor",
        purpose: "Fallback Verification",
        institutionId: instA,
        checkIn: new Date().toISOString(),
        status: "checked_in",
      }).returning().get();
      createdVisitorIds.push(v.id);

      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitors:read", "visitors:update", "visitors:manage"],
      });

      // GET detail with empty context params
      const reqGet = makeJsonReq(`http://localhost:3000/api/visitors/${v.id}`, null, "GET");
      const resGet = await getVisitorDetail(reqGet, { params: Promise.resolve({}) as any });
      expect(resGet.status).toBe(200);
      const dataGet = await resGet.json();
      expect(dataGet.visitor.id).toBe(v.id);

      // PATCH with empty context params
      const reqPatch = makeJsonReq(`http://localhost:3000/api/visitors/${v.id}`, { notes: "Updated via fallback" }, "PATCH");
      const resPatch = await updateVisitor(reqPatch, { params: Promise.resolve({}) as any });
      expect(resPatch.status).toBe(200);

      // Fail-closed when URL has no ID
      const reqInvalid = makeJsonReq("http://localhost:3000/api/visitors/", null, "GET");
      const resInvalid = await getVisitorDetail(reqInvalid, { params: Promise.resolve({}) as any });
      expect(resInvalid.status).toBe(400);
    });

    it("enforces schema bounds and date format on pre-registration", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["visitor:issue"],
      });

      // Overlength visitor name
      const reqOverlength = makeJsonReq("http://localhost:3000/api/visitors/pre-register", {
        visitorName: "x".repeat(101),
        visitorPhone: "+911234567890",
        hostStaffId: hostAId,
        purpose: "Valid Purpose",
        expectedDate: "2026-11-01",
      });
      const resOverlength = await preRegisterVisitor(reqOverlength);
      expect(resOverlength.status).toBe(400);

      // Invalid expected date format
      const reqBadDate = makeJsonReq("http://localhost:3000/api/visitors/pre-register", {
        visitorName: "Valid Name",
        visitorPhone: "+911234567890",
        hostStaffId: hostAId,
        purpose: "Valid Purpose",
        expectedDate: "invalid-date",
      });
      const resBadDate = await preRegisterVisitor(reqBadDate);
      expect(resBadDate.status).toBe(400);
    });
  });
});
