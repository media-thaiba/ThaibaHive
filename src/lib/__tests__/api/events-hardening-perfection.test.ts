/**
 * @jest-environment node
 *
 * Campus Events & Calendar Scheduling Pipeline — Hardening & Integrity Suite:
 * - Safe JSON parsing across all mutating endpoints (400 Bad Request on invalid payloads)
 * - Schema bounds & date ordering validation (startDate <= endDate)
 * - 404 existence guards on non-existent events across GET, PATCH, DELETE, and RSVP
 * - Attendee capacity guards (rejecting attending RSVPs when maxAttendees reached)
 * - RSVP state transitions and slot freeing (attending -> maybe/declined -> re-attending)
 * - Multi-tenant institution boundary isolation
 * - Cascading deletion of event RSVPs upon event removal
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  departments,
  staffDepartments,
  events,
  eventRsvps,
  notifications,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listEvents,
  POST as createEvent,
} from "@/app/api/events/route";
import {
  GET as getEvent,
  PATCH as updateEvent,
  DELETE as deleteEvent,
} from "@/app/api/events/[id]/route";
import { POST as rsvpEvent } from "@/app/api/events/rsvp/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Campus Events & Calendar Scheduling Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_evt_a_${suffix}`;
  const instB = `inst_evt_b_${suffix}`;
  const deptA = `dept_evt_a_${suffix}`;

  const adminAId = `stf_evt_adm_a_${suffix}`;
  const adminBId = `stf_evt_adm_b_${suffix}`;
  const staffAId = `stf_evt_sa_${suffix}`;
  const staffBId = `stf_evt_sb_${suffix}`;
  const staffCId = `stf_evt_sc_${suffix}`;

  function asUser(role: string, staffId: string, instId: string) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      userId: `usr_${staffId}`,
      staffId,
      role,
      institutionId: instId,
    });
    (hasPermission as unknown as jest.Mock).mockImplementation((_session: unknown, perm: string) => {
      if (role === "super_admin" || role === "admin") return true;
      if (role === "staff") {
        if (perm === "events:read") return true;
      }
      return false;
    });
  }

  beforeAll(async () => {
    // 1. Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Institution Events A ${suffix}`, code: `IEA_${suffix}` },
      { id: instB, name: `Institution Events B ${suffix}`, code: `IEB_${suffix}` },
    ]);

    // 2. Staff
    await db.insert(staff).values([
      {
        id: adminAId,
        email: `admin_a_${suffix}@test.local`,
        employeeId: `EMP_EA_${suffix}`,
        firstName: "Admin",
        lastName: "Alpha",
        role: "admin",
      },
      {
        id: adminBId,
        email: `admin_b_${suffix}@test.local`,
        employeeId: `EMP_EB_${suffix}`,
        firstName: "Admin",
        lastName: "Beta",
        role: "admin",
      },
      {
        id: staffAId,
        email: `staff_a_${suffix}@test.local`,
        employeeId: `EMP_SA_${suffix}`,
        firstName: "Staff",
        lastName: "Alpha",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@test.local`,
        employeeId: `EMP_SB_${suffix}`,
        firstName: "Staff",
        lastName: "Beta",
        role: "staff",
      },
      {
        id: staffCId,
        email: `staff_c_${suffix}@test.local`,
        employeeId: `EMP_SC_${suffix}`,
        firstName: "Staff",
        lastName: "Gamma",
        role: "staff",
      },
    ]);

    // 3. Staff Institutions
    await db.insert(staffInstitutions).values([
      { id: `si_evt_adm_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_evt_adm_b_${suffix}`, staffId: adminBId, institutionId: instB },
      { id: `si_evt_sa_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_evt_sb_${suffix}`, staffId: staffBId, institutionId: instA },
      { id: `si_evt_sc_${suffix}`, staffId: staffCId, institutionId: instA },
    ]);

    // 4. Department
    await db.insert(departments).values({
      id: deptA,
      institutionId: instA,
      name: `Events Dept ${suffix}`,
      code: `ED_${suffix}`,
    });

    await db.insert(staffDepartments).values([
      { id: `sd_evt_sa_${suffix}`, staffId: staffAId, departmentId: deptA },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(notifications).where(inArray(notifications.staffId, [adminAId, adminBId, staffAId, staffBId, staffCId])).run();
    } catch {
      // ignore
    }
    await db.delete(eventRsvps).run();
    await db.delete(events).where(inArray(events.createdById, [adminAId, adminBId, staffAId])).run();
    await db.delete(staffDepartments).where(eq(staffDepartments.departmentId, deptA)).run();
    await db.delete(departments).where(eq(departments.id, deptA)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.institutionId, [instA, instB])).run();
    await db.delete(staff).where(inArray(staff.id, [adminAId, adminBId, staffAId, staffBId, staffCId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    it("POST /api/events returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_json",
      });
      const res = await createEvent(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/events/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/events/evt-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "broken payload",
      });
      const res = await updateEvent(req, { params: Promise.resolve({ id: "evt-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/events/rsvp returns 400 on malformed JSON", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid",
      });
      const res = await rsvpEvent(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Schema Bounds & Date Validation", () => {
    it("rejects empty event title with 400", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "   ",
          startDate: "2026-11-01T09:00:00Z",
        }),
      });
      const res = await createEvent(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Title is required/i);
    });

    it("rejects endDate earlier than startDate with 400", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Annual Sports Day",
          startDate: "2026-11-10T10:00:00Z",
          endDate: "2026-11-08T10:00:00Z", // Earlier than start
        }),
      });
      const res = await createEvent(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/End date must be after or equal to start date/i);
    });

    it("rejects invalid RSVP status with 400", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "some-event-id",
          status: "confirmed_unsupported",
        }),
      });
      const res = await rsvpEvent(req);
      expect(res.status).toBe(400);
    });
  });

  describe("3. 404 Existence & Multi-Tenant Scoping Guards", () => {
    it("GET /api/events/[id] returns 404 for non-existent event", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/events/non-existent-id");
      const res = await getEvent(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(res.status).toBe(404);
    });

    it("PATCH /api/events/[id] returns 404 for non-existent event", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/events/non-existent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });
      const res = await updateEvent(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(res.status).toBe(404);
    });

    it("DELETE /api/events/[id] returns 404 for non-existent event", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/events/non-existent-id", {
        method: "DELETE",
      });
      const res = await deleteEvent(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(res.status).toBe(404);
    });

    it("POST /api/events/rsvp returns 404 for non-existent event", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: "non-existent-event-id",
          status: "attending",
        }),
      });
      const res = await rsvpEvent(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Event not found");
    });
  });

  describe("4. Event Lifecycle, Attendee Capacity & RSVP Management", () => {
    let createdEventId: string;

    it("creates an event with maxAttendees = 2", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Robotics Workshop ${suffix}`,
          description: "Hands-on robotics lab",
          eventType: "institution",
          startDate: "2026-11-15T09:00:00Z",
          endDate: "2026-11-15T17:00:00Z",
          location: "Lab 3",
          institutionId: instA,
          maxAttendees: 2,
        }),
      });
      const res = await createEvent(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.event).toBeDefined();
      expect(json.event.title).toBe(`Robotics Workshop ${suffix}`);
      expect(json.event.maxAttendees).toBe(2);
      createdEventId = json.event.id;
    });

    it("Staff A RSVPs 'attending' (slot 1/2 taken)", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: createdEventId,
          status: "attending",
        }),
      });
      const res = await rsvpEvent(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe("attending");
    });

    it("Staff B RSVPs 'attending' (slot 2/2 taken, event now full)", async () => {
      asUser("staff", staffBId, instA);
      const req = new Request("http://localhost/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: createdEventId,
          status: "attending",
        }),
      });
      const res = await rsvpEvent(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("Staff C is blocked from attending when capacity is reached (Capacity Guard)", async () => {
      asUser("staff", staffCId, instA);
      const req = new Request("http://localhost/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: createdEventId,
          status: "attending",
        }),
      });
      const res = await rsvpEvent(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/maximum attendee capacity/i);
    });

    it("Staff A updates status to 'declined' and frees up a slot", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: createdEventId,
          status: "declined",
        }),
      });
      const res = await rsvpEvent(req);
      expect(res.status).toBe(200);

      // Staff C can now attend since a slot opened
      asUser("staff", staffCId, instA);
      const reqC = new Request("http://localhost/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: createdEventId,
          status: "attending",
        }),
      });
      const resC = await rsvpEvent(reqC);
      expect(resC.status).toBe(200);
    });

    it("GET /api/events/[id] returns event with updated RSVP counts", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/events/${createdEventId}`);
      const res = await getEvent(req, { params: Promise.resolve({ id: createdEventId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.event).toBeDefined();
      expect(json.event.attendingCount).toBe(2);
      expect(json.event.declinedCount).toBe(1);
    });

    it("Admin B from Institution B cannot modify or delete Institution A event (Multi-Tenant Isolation)", async () => {
      asUser("admin", adminBId, instB);
      // Try to patch
      const patchRes = await updateEvent(
        new Request(`http://localhost/api/events/${createdEventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Hacked Title" }),
        }),
        { params: Promise.resolve({ id: createdEventId }) }
      );
      expect(patchRes.status).toBe(404);

      // Try to delete
      const delRes = await deleteEvent(
        new Request(`http://localhost/api/events/${createdEventId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: createdEventId }) }
      );
      expect(delRes.status).toBe(404);
    });

    it("Admin A updates and then deletes the event, verifying cascading RSVP deletion", async () => {
      asUser("admin", adminAId, instA);
      // Update
      const patchRes = await updateEvent(
        new Request(`http://localhost/api/events/${createdEventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: "Auditorium Main Hall" }),
        }),
        { params: Promise.resolve({ id: createdEventId }) }
      );
      expect(patchRes.status).toBe(200);
      const patchJson = await patchRes.json();
      expect(patchJson.event.location).toBe("Auditorium Main Hall");

      // Delete
      const delRes = await deleteEvent(
        new Request(`http://localhost/api/events/${createdEventId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: createdEventId }) }
      );
      expect(delRes.status).toBe(200);

      // Verify event is gone
      const verifyGet = await getEvent(
        new Request(`http://localhost/api/events/${createdEventId}`),
        { params: Promise.resolve({ id: createdEventId }) }
      );
      expect(verifyGet.status).toBe(404);

      // Verify RSVPs were cascaded
      const remainingRsvps = await db
        .select()
        .from(eventRsvps)
        .where(eq(eventRsvps.eventId, createdEventId))
        .all();
      expect(remainingRsvps).toHaveLength(0);
    });
  });
});
