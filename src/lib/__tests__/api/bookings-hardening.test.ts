/**
 * @jest-environment node
 *
 * Facility & Resource Bookings Engine — Hardening & Integrity Suite:
 * - Concurrent double-booking collision race guard (serialized per-resource mutex)
 * - Approval double-booking race condition & stale timeout guards
 * - Inactive/decommissioned resource booking prevention
 * - Past-time and excessive duration validation
 * - Terminal state & retroactive past-booking immutability
 * - REST parity on /api/bookings/[id] (GET, PATCH, DELETE)
 * - Soft-cancel audit trail preservation & slot freeing
 * - Tenant isolation and RBAC permission boundaries
 */
import { db, institutions, staff, staffInstitutions, bookingResources, bookings } from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { GET as listBookings, POST as createBooking } from "@/app/api/bookings/route";
import { GET as getBookingDetail, PATCH as updateBooking, DELETE as deleteBooking } from "@/app/api/bookings/[id]/route";
import { POST as createResource } from "@/app/api/bookings/resources/route";
import { PATCH as processApproval } from "@/app/api/approvals/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Bookings Engine Hardening — Concurrency, Lifecycle, and Tenant Boundaries", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_bkh_a_${suffix}`;
  const instB = `inst_bkh_b_${suffix}`;

  const adminAId = `stf_bkh_admin_${suffix}`;
  const principalAId = `stf_bkh_prin_${suffix}`;
  const bookerAId = `stf_bkh_usr_a_${suffix}`;
  const bookerBId = `stf_bkh_usr_b_${suffix}`;

  const resourceActiveA = `res_bkh_act_${suffix}`;
  const resourceInactiveA = `res_bkh_inact_${suffix}`;
  const resourceInstB = `res_bkh_b_${suffix}`;

  const setSession = (payload: Record<string, unknown> | null) => {
    (verifySession as jest.Mock).mockResolvedValue(payload);
  };

  const makeJsonReq = (url: string, body: unknown, method = "POST"): Request =>
    new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

  const contextParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  // Future timestamp generator to avoid past-time rejections
  const futureDay = (offsetDays: number, hour: number, minute = 0): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const pastDay = (offsetDaysAgo: number, hour: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDaysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: instA, name: `Booking Hardening School A ${suffix}`, code: `BHA-${suffix}` },
      { id: instB, name: `Booking Hardening School B ${suffix}`, code: `BHB-${suffix}` },
    ]).run();

    await db.insert(staff).values([
      {
        id: adminAId,
        email: `admin_${suffix}@bkh.test`,
        employeeId: `EMP_ADM_${suffix}`,
        firstName: "Admin",
        lastName: "Alpha",
        role: "admin",
      },
      {
        id: principalAId,
        email: `principal_${suffix}@bkh.test`,
        employeeId: `EMP_PRIN_${suffix}`,
        firstName: "Principal",
        lastName: "Alpha",
        role: "principal",
      },
      {
        id: bookerAId,
        email: `booker_a_${suffix}@bkh.test`,
        employeeId: `EMP_BKA_${suffix}`,
        firstName: "Booker",
        lastName: "Alpha",
        role: "staff",
      },
      {
        id: bookerBId,
        email: `booker_b_${suffix}@bkh.test`,
        employeeId: `EMP_BKB_${suffix}`,
        firstName: "Booker",
        lastName: "Beta",
        role: "staff",
      },
    ]).run();

    await db.insert(staffInstitutions).values([
      { id: `si_adm_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_prin_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_bka_${suffix}`, staffId: bookerAId, institutionId: instA },
      { id: `si_bkb_${suffix}`, staffId: bookerBId, institutionId: instB },
    ]).run();

    await db.insert(bookingResources).values([
      {
        id: resourceActiveA,
        institutionId: instA,
        name: `Main Auditorium ${suffix}`,
        type: "auditorium",
        capacity: 500,
        isActive: true,
      },
      {
        id: resourceInactiveA,
        institutionId: instA,
        name: `Renovation Lab ${suffix}`,
        type: "lab",
        capacity: 30,
        isActive: false,
      },
      {
        id: resourceInstB,
        institutionId: instB,
        name: `Campus B Seminar Room ${suffix}`,
        type: "room",
        capacity: 50,
        isActive: true,
      },
    ]).run();
  });

  afterAll(async () => {
    const allStaff = [adminAId, principalAId, bookerAId, bookerBId];
    const allResources = [resourceActiveA, resourceInactiveA, resourceInstB];

    await db.delete(bookings).where(inArray(bookings.bookerId, allStaff)).run();
    await db.delete(bookingResources).where(inArray(bookingResources.id, allResources)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, allStaff)).run();
    await db.delete(staff).where(inArray(staff.id, allStaff)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("Concurrent Double-Booking Prevention", () => {
    it("guarantees exactly 1 successful booking when 10 concurrent requests target the same slot", async () => {
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });

      const startTime = futureDay(2, 10, 0);
      const endTime = futureDay(2, 12, 0);

      // Launch 10 simultaneous booking requests for the exact same slot
      const requests = Array.from({ length: 10 }, (_, i) =>
        createBooking(
          makeJsonReq("https://thaiba.edu/api/bookings", {
            resourceId: resourceActiveA,
            title: `Concurrent Attempt #${i + 1}`,
            startTime,
            endTime,
          })
        )
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      const createdCount = statuses.filter((s) => s === 201).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      expect(createdCount).toBe(1);
      expect(conflictCount).toBe(9);

      // Verify database state: exactly 1 booking exists in this time slot
      const bookedRows = await db
        .select()
        .from(bookings)
        .where(
          eq(bookings.resourceId, resourceActiveA)
        )
        .all();

      const slotRows = bookedRows.filter(
        (b) => b.startTime === startTime && b.endTime === endTime
      );
      expect(slotRows).toHaveLength(1);
    });
  });

  describe("Time & Resource State Guards", () => {
    it("rejects booking requests for inactive/decommissioned resources with 400", async () => {
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });

      const res = await createBooking(
        makeJsonReq("https://thaiba.edu/api/bookings", {
          resourceId: resourceInactiveA,
          title: "Booking Inactive Lab",
          startTime: futureDay(3, 9, 0),
          endTime: futureDay(3, 11, 0),
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/inactive or undergoing maintenance/i);
    });

    it("rejects booking requests scheduled in the past with 400", async () => {
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });

      const res = await createBooking(
        makeJsonReq("https://thaiba.edu/api/bookings", {
          resourceId: resourceActiveA,
          title: "Past Booking Attempt",
          startTime: pastDay(2, 10),
          endTime: pastDay(2, 12),
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/in the past/i);
    });

    it("rejects booking duration exceeding 14 days with 400", async () => {
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });

      const res = await createBooking(
        makeJsonReq("https://thaiba.edu/api/bookings", {
          resourceId: resourceActiveA,
          title: "Excessive Duration Booking",
          startTime: futureDay(5, 9, 0),
          endTime: futureDay(25, 9, 0), // 20 days duration
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/cannot exceed 14 consecutive days/i);
    });
  });

  describe("Approval-Time Concurrency & Stale Booking Guards", () => {
    it("prevents double-booking when approving conflicting pending requests", async () => {
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });

      // Create booking 1: 14:00 - 16:00
      const bk1Id = `bk_conf_1_${suffix}`;
      await db.insert(bookings).values({
        id: bk1Id,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Conference A",
        startTime: futureDay(4, 14, 0),
        endTime: futureDay(4, 16, 0),
        status: "pending",
        institutionId: instA,
      }).run();

      // Create booking 2: 15:00 - 17:00 (overlaps booking 1)
      const bk2Id = `bk_conf_2_${suffix}`;
      await db.insert(bookings).values({
        id: bk2Id,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Conference B",
        startTime: futureDay(4, 15, 0),
        endTime: futureDay(4, 17, 0),
        status: "pending",
        institutionId: instA,
      }).run();

      // Principal approves booking 1
      setSession({ staffId: principalAId, role: "principal", institutionId: instA });
      const approveRes1 = await processApproval(
        makeJsonReq("https://thaiba.edu/api/approvals", {
          id: bk1Id,
          type: "booking",
          action: "approve",
        }, "PATCH")
      );
      expect(approveRes1.status).toBe(200);

      // Attempting to approve conflicting booking 2 must be blocked with 409
      const approveRes2 = await processApproval(
        makeJsonReq("https://thaiba.edu/api/approvals", {
          id: bk2Id,
          type: "booking",
          action: "approve",
        }, "PATCH")
      );
      expect(approveRes2.status).toBe(409);
      const data2 = await approveRes2.json();
      expect(data2.error).toMatch(/overlaps with an active booking/i);
    });

    it("blocks approval of past bookings whose start time has already elapsed", async () => {
      const pastBkId = `bk_past_stale_${suffix}`;
      await db.insert(bookings).values({
        id: pastBkId,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Stale Pending Request",
        startTime: pastDay(1, 10),
        endTime: pastDay(1, 12),
        status: "pending",
        institutionId: instA,
      }).run();

      setSession({ staffId: principalAId, role: "principal", institutionId: instA });
      const res = await processApproval(
        makeJsonReq("https://thaiba.edu/api/approvals", {
          id: pastBkId,
          type: "booking",
          action: "approve",
        }, "PATCH")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/start time has already passed/i);
    });

    it("blocks approval of an already cancelled or rejected booking", async () => {
      const cancelledBkId = `bk_cancelled_term_${suffix}`;
      await db.insert(bookings).values({
        id: cancelledBkId,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Cancelled Booking",
        startTime: futureDay(6, 10, 0),
        endTime: futureDay(6, 12, 0),
        status: "cancelled",
        institutionId: instA,
      }).run();

      setSession({ staffId: principalAId, role: "principal", institutionId: instA });
      const res = await processApproval(
        makeJsonReq("https://thaiba.edu/api/approvals", {
          id: cancelledBkId,
          type: "booking",
          action: "approve",
        }, "PATCH")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/already in a terminal state/i);
    });
  });

  describe("REST Parity on /api/bookings/[id]", () => {
    it("GET returns booking details for authorized booker, 404 for cross-tenant", async () => {
      const bkId = `bk_detail_${suffix}`;
      await db.insert(bookings).values({
        id: bkId,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Detailed Booking",
        startTime: futureDay(7, 10, 0),
        endTime: futureDay(7, 12, 0),
        status: "pending",
        institutionId: instA,
      }).run();

      // Booker A gets 200
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });
      const resA = await getBookingDetail(
        new Request(`https://thaiba.edu/api/bookings/${bkId}`),
        contextParams(bkId)
      );
      expect(resA.status).toBe(200);
      const dataA = await resA.json();
      expect(dataA.booking.title).toBe("Detailed Booking");
      expect(dataA.booking.resourceName).toContain("Main Auditorium");

      // Booker B (different institution) gets 404
      setSession({ staffId: bookerBId, role: "staff", institutionId: instB });
      const resB = await getBookingDetail(
        new Request(`https://thaiba.edu/api/bookings/${bkId}`),
        contextParams(bkId)
      );
      expect(resB.status).toBe(404);
    });

    it("PATCH allows booker to soft-cancel their own booking and records cancellation reason", async () => {
      const bkId = `bk_patch_cancel_${suffix}`;
      await db.insert(bookings).values({
        id: bkId,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "To Be Cancelled",
        notes: "Initial note",
        startTime: futureDay(8, 10, 0),
        endTime: futureDay(8, 12, 0),
        status: "pending",
        institutionId: instA,
      }).run();

      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });
      const res = await updateBooking(
        makeJsonReq(`https://thaiba.edu/api/bookings/${bkId}`, {
          status: "cancelled",
          cancellationReason: "Speaker unavailable",
        }, "PATCH"),
        contextParams(bkId)
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.booking.status).toBe("cancelled");
      expect(data.booking.notes).toContain("Cancellation reason: Speaker unavailable");

      // Verify database row
      const row = await db.select().from(bookings).where(eq(bookings.id, bkId)).get();
      expect(row?.status).toBe("cancelled");
    });

    it("PATCH prevents non-managers from approving bookings", async () => {
      const bkId = `bk_patch_self_appr_${suffix}`;
      await db.insert(bookings).values({
        id: bkId,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Self Approval Test",
        startTime: futureDay(9, 10, 0),
        endTime: futureDay(9, 12, 0),
        status: "pending",
        institutionId: instA,
      }).run();

      // Regular staff attempting to approve
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });
      const res = await updateBooking(
        makeJsonReq(`https://thaiba.edu/api/bookings/${bkId}`, {
          status: "approved",
        }, "PATCH"),
        contextParams(bkId)
      );
      expect(res.status).toBe(403);
    });

    it("DELETE soft-cancels approved booking to preserve audit log and frees the slot", async () => {
      const bkId = `bk_del_soft_${suffix}`;
      const startTime = futureDay(10, 10, 0);
      const endTime = futureDay(10, 12, 0);

      await db.insert(bookings).values({
        id: bkId,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Approved Event",
        startTime,
        endTime,
        status: "approved",
        institutionId: instA,
      }).run();

      // Booker cancels via DELETE
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });
      const delRes = await deleteBooking(
        new Request(`https://thaiba.edu/api/bookings/${bkId}`, { method: "DELETE" }),
        contextParams(bkId)
      );
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.status).toBe("cancelled");

      // Verify row is not deleted from DB, but status is "cancelled"
      const row = await db.select().from(bookings).where(eq(bookings.id, bkId)).get();
      expect(row).toBeDefined();
      expect(row?.status).toBe("cancelled");

      // Now verify slot is immediately available for a new reservation
      const newBookRes = await createBooking(
        makeJsonReq("https://thaiba.edu/api/bookings", {
          resourceId: resourceActiveA,
          title: "New Booking In Freed Slot",
          startTime,
          endTime,
        })
      );
      expect(newBookRes.status).toBe(201);
    });

    it("DELETE rejects past completed bookings with 400", async () => {
      const pastBkId = `bk_del_past_${suffix}`;
      await db.insert(bookings).values({
        id: pastBkId,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Concluded Event",
        startTime: pastDay(3, 10),
        endTime: pastDay(3, 12),
        status: "approved",
        institutionId: instA,
      }).run();

      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });
      const delRes = await deleteBooking(
        new Request(`https://thaiba.edu/api/bookings/${pastBkId}`, { method: "DELETE" }),
        contextParams(pastBkId)
      );
      expect(delRes.status).toBe(400);
      const data = await delRes.json();
      expect(data.error).toMatch(/completed past booking/i);
    });
  });

  describe("Resource Provisioning Validation", () => {
    it("POST /api/bookings/resources validates schema and avoids inst_default fallback", async () => {
      setSession({ staffId: adminAId, role: "admin", institutionId: instA });

      // Missing name/type
      const invalidRes = await createResource(
        makeJsonReq("https://thaiba.edu/api/bookings/resources", {
          capacity: 100,
        })
      );
      expect(invalidRes.status).toBe(400);

      // Valid resource creation
      const validRes = await createResource(
        makeJsonReq("https://thaiba.edu/api/bookings/resources", {
          name: `Conference Hall ${suffix}`,
          type: "hall",
          capacity: 250,
          location: "Block C",
          institutionId: instA,
        })
      );
      expect(validRes.status).toBe(201);
      const data = await validRes.json();
      expect(data.resource.institutionId).toBe(instA);
      expect(data.resource.isActive).toBe(true);

      // Cleanup
      await db.delete(bookingResources).where(eq(bookingResources.id, data.resource.id)).run();
    });
  });

  describe("Route Parameter Fallbacks, Allowlist Query Filters & Schema Bounds", () => {
    let testBkId: string;

    beforeAll(async () => {
      testBkId = `bk_fb_${suffix}`;
      await db.insert(bookings).values({
        id: testBkId,
        resourceId: resourceActiveA,
        bookerId: bookerAId,
        title: "Fallback Test Booking",
        startTime: futureDay(10, 9, 0),
        endTime: futureDay(10, 11, 0),
        status: "pending",
        institutionId: instA,
      }).run();
    });

    afterAll(async () => {
      await db.delete(bookings).where(eq(bookings.id, testBkId)).run();
    });

    it("extracts booking ID from URL pathname when context params are missing", async () => {
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });

      // GET detail with empty context params
      const reqGet = new Request(`https://thaiba.edu/api/bookings/${testBkId}`, { method: "GET" });
      const resGet = await getBookingDetail(reqGet, { params: Promise.resolve({}) as any });
      expect(resGet.status).toBe(200);
      const dataGet = await resGet.json();
      expect(dataGet.booking.id).toBe(testBkId);

      // PATCH with empty context params
      const reqPatch = makeJsonReq(`https://thaiba.edu/api/bookings/${testBkId}`, { notes: "Updated via fallback" }, "PATCH");
      const resPatch = await updateBooking(reqPatch, { params: Promise.resolve({}) as any });
      expect(resPatch.status).toBe(200);
      const dataPatch = await resPatch.json();
      expect(dataPatch.booking.notes).toBe("Updated via fallback");

      // Fail-closed when URL has no ID
      const reqInvalid = new Request("https://thaiba.edu/api/bookings/", { method: "GET" });
      const resInvalid = await getBookingDetail(reqInvalid, { params: Promise.resolve({}) as any });
      expect(resInvalid.status).toBe(400);
    });

    it("filters bookings by status and institution query parameters on server", async () => {
      const bkPending = `bk_flt_p_${suffix}`;
      const bkApproved = `bk_flt_a_${suffix}`;

      await db.insert(bookings).values([
        {
          id: bkPending,
          resourceId: resourceActiveA,
          bookerId: bookerAId,
          title: "Pending Filter Target",
          startTime: futureDay(11, 14, 0),
          endTime: futureDay(11, 15, 0),
          status: "pending",
          institutionId: instA,
        },
        {
          id: bkApproved,
          resourceId: resourceActiveA,
          bookerId: bookerAId,
          title: "Approved Filter Target",
          startTime: futureDay(12, 14, 0),
          endTime: futureDay(12, 15, 0),
          status: "approved",
          institutionId: instA,
        },
      ]).run();

      setSession({ staffId: adminAId, role: "admin", institutionId: instA });

      // Query status=pending
      const reqPending = new Request(`https://thaiba.edu/api/bookings?institutionId=${instA}&status=pending`, { method: "GET" });
      const resPending = await listBookings(reqPending);
      expect(resPending.status).toBe(200);
      const dataPending = await resPending.json();
      const pendingIds = dataPending.bookings.map((b: any) => b.id);
      expect(pendingIds).toContain(bkPending);
      expect(pendingIds).not.toContain(bkApproved);

      // Query status=approved
      const reqApproved = new Request(`https://thaiba.edu/api/bookings?institutionId=${instA}&status=approved`, { method: "GET" });
      const resApproved = await listBookings(reqApproved);
      expect(resApproved.status).toBe(200);
      const dataApproved = await resApproved.json();
      const approvedIds = dataApproved.bookings.map((b: any) => b.id);
      expect(approvedIds).toContain(bkApproved);
      expect(approvedIds).not.toContain(bkPending);

      // Cleanup
      await db.delete(bookings).where(inArray(bookings.id, [bkPending, bkApproved])).run();
    });

    it("rejects overlength title (> 150 chars) and HTML tags in booking creation", async () => {
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });

      // Overlength title
      const reqOverlength = makeJsonReq("https://thaiba.edu/api/bookings", {
        resourceId: resourceActiveA,
        title: "x".repeat(151),
        startTime: futureDay(13, 10, 0),
        endTime: futureDay(13, 11, 0),
      });
      const resOverlength = await createBooking(reqOverlength);
      expect(resOverlength.status).toBe(400);

      // HTML tags in title
      const reqHtml = makeJsonReq("https://thaiba.edu/api/bookings", {
        resourceId: resourceActiveA,
        title: "<script>alert('hack')</script>",
        startTime: futureDay(13, 10, 0),
        endTime: futureDay(13, 11, 0),
      });
      const resHtml = await createBooking(reqHtml);
      expect(resHtml.status).toBe(400);
    });

    it("rejects overlength cancellation reason (> 500 chars) on PATCH", async () => {
      setSession({ staffId: bookerAId, role: "staff", institutionId: instA });

      const reqOverlengthReason = makeJsonReq(`https://thaiba.edu/api/bookings/${testBkId}`, {
        status: "cancelled",
        cancellationReason: "c".repeat(501),
      }, "PATCH");

      const res = await updateBooking(reqOverlengthReason, contextParams(testBkId));
      expect(res.status).toBe(400);
    });
  });
});
