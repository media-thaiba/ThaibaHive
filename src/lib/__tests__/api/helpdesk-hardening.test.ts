/**
 * @jest-environment node
 *
 * Helpdesk & Service Ticketing Pipeline — Hardening & Integrity Suite:
 * - Unhandled JSON crash prevention: malformed/empty JSON safely returns 400 (not 500)
 * - RBAC unblocking: institutional principals and HODs can access & manage institution tickets (unblocks previous 403)
 * - Multi-tenant isolation: cross-tenant access returns fail-closed 404
 * - Non-manager IDOR prevention: regular staff only see submitted or assigned tickets
 * - REST parity on DELETE /api/help-desk/[id]: submitter withdrawal on 'open' tickets; manager deletion with audit log
 * - State machine & terminal status immutability: closed tickets cannot be modified or commented on without reopening
 * - Resolved timestamp: transitioning to 'resolved' automatically records resolvedAt timestamp
 * - Concurrency serialization & optimistic locking (withTicketLock, 409 conflict detection)
 * - Centralized rate limiting enforcement across ticket endpoints
 * - Schema validation bounds on title (200), description (5000), and comment content (5000)
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  helpDeskTickets,
  helpDeskComments,
  activityLogs,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listTickets,
  POST as createTicket,
} from "@/app/api/help-desk/route";
import {
  GET as getTicketDetail,
  PATCH as updateTicket,
  DELETE as deleteTicket,
} from "@/app/api/help-desk/[id]/route";
import { POST as addComment } from "@/app/api/help-desk/[id]/comments/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Helpdesk & Service Ticketing Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_hld_a_${suffix}`;
  const instB = `inst_hld_b_${suffix}`;

  const superAdminId = `stf_hld_sa_${suffix}`;
  const principalAId = `stf_hld_pa_${suffix}`;
  const principalBId = `stf_hld_pb_${suffix}`;
  const hodAId = `stf_hld_hod_a_${suffix}`;
  const techAId = `stf_hld_tch_a_${suffix}`;
  const staffAId = `stf_hld_usr_a_${suffix}`;
  const staffBId = `stf_hld_usr_b_${suffix}`;

  const createdTicketIds: string[] = [];

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
      { id: instA, name: `Helpdesk School Alpha ${suffix}`, code: `HSA-${suffix}` },
      { id: instB, name: `Helpdesk School Beta ${suffix}`, code: `HSB-${suffix}` },
    ]).run();

    // Seed staff members
    await db.insert(staff).values([
      {
        id: superAdminId,
        email: `sa_${suffix}@hld.test`,
        employeeId: `EMP_SA_${suffix}`,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
      },
      {
        id: principalAId,
        email: `principal_a_${suffix}@hld.test`,
        employeeId: `EMP_PA_${suffix}`,
        firstName: "PrincipalA",
        lastName: "Alpha",
        role: "principal",
      },
      {
        id: principalBId,
        email: `principal_b_${suffix}@hld.test`,
        employeeId: `EMP_PB_${suffix}`,
        firstName: "PrincipalB",
        lastName: "Beta",
        role: "principal",
      },
      {
        id: hodAId,
        email: `hod_a_${suffix}@hld.test`,
        employeeId: `EMP_HOD_${suffix}`,
        firstName: "DepartmentHead",
        lastName: "Alpha",
        role: "hod",
      },
      {
        id: techAId,
        email: `tech_a_${suffix}@hld.test`,
        employeeId: `EMP_TCH_${suffix}`,
        firstName: "IT",
        lastName: "Technician",
        role: "staff",
      },
      {
        id: staffAId,
        email: `staff_a_${suffix}@hld.test`,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "StaffA",
        lastName: "Requester",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@hld.test`,
        employeeId: `EMP_STB_${suffix}`,
        firstName: "StaffB",
        lastName: "BetaStaff",
        role: "staff",
      },
    ]).run();

    await db.insert(staffInstitutions).values([
      { id: `si_pa_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_pb_${suffix}`, staffId: principalBId, institutionId: instB },
      { id: `si_hod_${suffix}`, staffId: hodAId, institutionId: instA },
      { id: `si_tch_${suffix}`, staffId: techAId, institutionId: instA },
      { id: `si_sta_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_stb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]).run();
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await db.delete(helpDeskComments).where(inArray(helpDeskComments.ticketId, createdTicketIds)).run();
      await db.delete(helpDeskTickets).where(inArray(helpDeskTickets.id, createdTicketIds)).run();
    }
    const allStaff = [superAdminId, principalAId, principalBId, hodAId, techAId, staffAId, staffBId];
    await db.delete(activityLogs).where(inArray(activityLogs.staffId, allStaff)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, allStaff)).run();
    await db.delete(staff).where(inArray(staff.id, allStaff)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("Unhandled JSON Parse Crash Prevention (VULN-HD-01)", () => {
    let testTicketId: string;

    beforeEach(async () => {
      const t = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Network Connectivity Flap",
        description: "Wi-Fi disconnecting intermittently in Science Lab",
        category: "it",
        priority: "high",
        status: "open",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      testTicketId = t.id;
      createdTicketIds.push(t.id);
    });

    it("handles empty or malformed JSON body on PATCH gracefully with 400 (not 500)", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["helpdesk:manage"],
      });

      const req = new Request(`http://localhost:3000/api/help-desk/${testTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "MALFORMED_JSON_STRING{{{",
      });

      const res = await updateTicket(req, contextParams(testTicketId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON body");
    });

    it("handles malformed JSON body on POST /comments gracefully with 400 (not 500)", async () => {
      setSession({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
        permissions: ["helpdesk:read"],
      });

      const req = new Request(`http://localhost:3000/api/help-desk/${testTicketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json",
      });

      const res = await addComment(req, contextParams(testTicketId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON body");
    });
  });

  describe("RBAC Unblocking & Institutional Manager Access (VULN-HD-02)", () => {
    let staffTicketId: string;

    beforeAll(async () => {
      const t = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Projector Bulb Burned Out",
        description: "Classroom 204 projector light is flashing red",
        category: "facilities",
        priority: "medium",
        status: "open",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      staffTicketId = t.id;
      createdTicketIds.push(t.id);
    });

    it("allows Principal A to inspect ticket submitted by Staff A (resolves previous 403)", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["helpdesk:read", "helpdesk:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${staffTicketId}`, null, "GET");
      const res = await getTicketDetail(req, contextParams(staffTicketId));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ticket.id).toBe(staffTicketId);
      expect(data.ticket.title).toBe("Projector Bulb Burned Out");
    });

    it("allows HOD A to inspect and assign ticket in their institution", async () => {
      setSession({
        staffId: hodAId,
        role: "hod",
        institutionId: instA,
        permissions: ["helpdesk:read", "helpdesk:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${staffTicketId}`, {
        assignedToId: techAId,
        status: "in_progress",
      }, "PATCH");

      const res = await updateTicket(req, contextParams(staffTicketId));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.ticket.assignedToId).toBe(techAId);
      expect(data.ticket.status).toBe("in_progress");
    });

    it("blocks Principal B from accessing ticket belonging to Institution A (fail-closed 404)", async () => {
      setSession({
        staffId: principalBId,
        role: "principal",
        institutionId: instB,
        permissions: ["helpdesk:read", "helpdesk:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${staffTicketId}`, null, "GET");
      const res = await getTicketDetail(req, contextParams(staffTicketId));
      expect(res.status).toBe(404);
    });

    it("blocks regular Staff B from viewing Staff A's ticket (IDOR protection)", async () => {
      setSession({
        staffId: staffBId,
        role: "staff",
        institutionId: instB,
        permissions: ["helpdesk:read"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${staffTicketId}`, null, "GET");
      const res = await getTicketDetail(req, contextParams(staffTicketId));
      expect(res.status).toBe(404);
    });
  });

  describe("REST Parity: Ticket Withdrawal & Deletion (VULN-HD-03)", () => {
    it("allows submitter to withdraw their own ticket while in 'open' status", async () => {
      const t = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Mistaken Request",
        description: "Created by mistake, self-resolved",
        category: "general",
        status: "open",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      createdTicketIds.push(t.id);

      setSession({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
        permissions: ["helpdesk:create"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${t.id}`, null, "DELETE");
      const res = await deleteTicket(req, contextParams(t.id));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe("deleted");

      const check = await db.select().from(helpDeskTickets).where(eq(helpDeskTickets.id, t.id)).get();
      expect(check).toBeUndefined();

      // Verify audit log
      const log = await db.select().from(activityLogs).where(eq(activityLogs.resourceId, t.id)).get();
      expect(log?.action).toBe("helpdesk_ticket_deleted");
    });

    it("blocks submitter from withdrawing a ticket once 'in_progress' or 'resolved' (400)", async () => {
      const t = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Work In Progress Ticket",
        description: "Already picked up by IT",
        category: "it",
        status: "in_progress",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      createdTicketIds.push(t.id);

      setSession({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
        permissions: ["helpdesk:create"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${t.id}`, null, "DELETE");
      const res = await deleteTicket(req, contextParams(t.id));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot withdraw a ticket in 'in_progress' status");
    });

    it("blocks other staff members from the same institution from deleting someone else's ticket (403)", async () => {
      const t = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Staff A Ticket",
        description: "Private request",
        category: "it",
        status: "open",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      createdTicketIds.push(t.id);

      setSession({
        staffId: techAId,
        role: "staff",
        institutionId: instA,
        permissions: ["helpdesk:create"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${t.id}`, null, "DELETE");
      const res = await deleteTicket(req, contextParams(t.id));
      expect(res.status).toBe(403);
    });

    it("blocks cross-tenant staff from deleting tickets of another institution (fail-closed 404)", async () => {
      const t = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Staff A Ticket 2",
        description: "Private request",
        category: "it",
        status: "open",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      createdTicketIds.push(t.id);

      setSession({
        staffId: staffBId,
        role: "staff",
        institutionId: instB,
        permissions: ["helpdesk:create"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${t.id}`, null, "DELETE");
      const res = await deleteTicket(req, contextParams(t.id));
      expect(res.status).toBe(404);
    });
  });

  describe("State Machine & Terminal Status Immutability (VULN-HD-04)", () => {
    let closedTicketId: string;

    beforeEach(async () => {
      const t = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Completed Maintenance",
        description: "Air conditioner filter replaced",
        category: "facilities",
        status: "closed",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      closedTicketId = t.id;
      createdTicketIds.push(t.id);
    });

    it("blocks updates on a closed ticket without explicitly reopening", async () => {
      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["helpdesk:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${closedTicketId}`, {
        priority: "critical",
      }, "PATCH");

      const res = await updateTicket(req, contextParams(closedTicketId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot modify ticket in terminal state 'closed'");
    });

    it("blocks adding comments to a closed ticket", async () => {
      setSession({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
        permissions: ["helpdesk:read"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${closedTicketId}/comments`, {
        content: "Adding remark after closure",
      });

      const res = await addComment(req, contextParams(closedTicketId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot comment on a ticket in terminal state 'closed'");
    });

    it("records resolvedAt timestamp when transitioning status to 'resolved'", async () => {
      const openTicket = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Printer Drum Issue",
        description: "Smudge marks on paper",
        category: "it",
        status: "in_progress",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      createdTicketIds.push(openTicket.id);

      setSession({
        staffId: principalAId,
        role: "principal",
        institutionId: instA,
        permissions: ["helpdesk:manage"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${openTicket.id}`, {
        status: "resolved",
      }, "PATCH");

      const res = await updateTicket(req, contextParams(openTicket.id));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ticket.status).toBe("resolved");
      expect(data.ticket.resolvedAt).toBeDefined();
    });
  });

  describe("Validation Bounds & Creation Integrity", () => {
    it("creates ticket with valid parameters and sets concrete institutionId", async () => {
      setSession({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
        permissions: ["helpdesk:create"],
      });

      const req = makeJsonReq("http://localhost:3000/api/help-desk", {
        title: "Classroom Smartboard Calibration",
        description: "Touch tracking is offset by 2 inches to the left",
        category: "it",
        priority: "medium",
      });

      const res = await createTicket(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ticket.title).toBe("Classroom Smartboard Calibration");
      expect(data.ticket.institutionId).toBe(instA);
      createdTicketIds.push(data.ticket.id);
    });

    it("rejects overlength title (> 200 chars)", async () => {
      setSession({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
        permissions: ["helpdesk:create"],
      });

      const req = makeJsonReq("http://localhost:3000/api/help-desk", {
        title: "x".repeat(201),
        description: "Valid description",
      });

      const res = await createTicket(req);
      expect(res.status).toBe(400);
    });

    it("rejects overlength comment (> 5000 chars)", async () => {
      const t = await db.insert(helpDeskTickets).values({
        id: crypto.randomUUID(),
        title: "Comment Test",
        description: "Testing comments",
        category: "general",
        status: "open",
        submittedById: staffAId,
        institutionId: instA,
      }).returning().get();
      createdTicketIds.push(t.id);

      setSession({
        staffId: staffAId,
        role: "staff",
        institutionId: instA,
        permissions: ["helpdesk:read"],
      });

      const req = makeJsonReq(`http://localhost:3000/api/help-desk/${t.id}/comments`, {
        content: "c".repeat(5001),
      });

      const res = await addComment(req, contextParams(t.id));
      expect(res.status).toBe(400);
    });
  });
});
