/**
 * @jest-environment node
 */
import { db, institutions, staff, staffInstitutions, bookingResources, bookings } from "@/db";
import { verifySession } from "@thaiba/auth";
import { inArray } from "drizzle-orm";
import { GET as listBookings, POST as createBooking } from "@/app/api/bookings/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Bookings API — collision integrity & tenant boundaries", () => {
  const suffix = Date.now().toString();
  const instA = `inst_book_a_${suffix}`;
  const instB = `inst_book_b_${suffix}`;
  const bookerAId = `stf_booker_a_${suffix}`;
  const bookerBId = `stf_booker_b_${suffix}`;
  const resourceAId = `res_a_${suffix}`;
  const resourceBId = `res_b_${suffix}`;

  const mockSession = (staffId: string, role: string) => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: staffId,
      staffId,
      email: `${staffId}@thaiba.edu`,
      role,
      institutionId: instA,
      permissions: ["*"],
    });
  };

  const makeRequest = (body: unknown): Request =>
    new Request(`https://thaiba.edu/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const day = (hour: number, minute = 0) =>
    new Date(Date.UTC(2026, 9, 20, hour, minute, 0)).toISOString();

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: instA, name: `Booking School A ${suffix}`, code: `bka${suffix.slice(-4)}` },
      { id: instB, name: `Booking School B ${suffix}`, code: `bkb${suffix.slice(-4)}` },
    ]);
    await db.insert(staff).values([
      {
        id: bookerAId,
        email: `booker_a_${suffix}@thaiba.edu`,
        employeeId: `EMP-BKA-${suffix.slice(-4)}`,
        firstName: "Booker",
        lastName: "Alpha",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
      {
        id: bookerBId,
        email: `booker_b_${suffix}@thaiba.edu`,
        employeeId: `EMP-BKB-${suffix.slice(-4)}`,
        firstName: "Booker",
        lastName: "Beta",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
    ]);
    await db.insert(staffInstitutions).values([
      { id: `si_bka_${suffix}`, staffId: bookerAId, institutionId: instA },
      { id: `si_bkb_${suffix}`, staffId: bookerBId, institutionId: instB },
    ]);
    await db.insert(bookingResources).values([
      {
        id: resourceAId,
        name: `Auditorium A ${suffix}`,
        type: "auditorium",
        institutionId: instA,
        isActive: true,
      },
      {
        id: resourceBId,
        name: `Lab B ${suffix}`,
        type: "lab",
        institutionId: instB,
        isActive: true,
      },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(bookings).where(inArray(bookings.resourceId, [resourceAId, resourceBId]));
      await db.delete(bookingResources).where(inArray(bookingResources.id, [resourceAId, resourceBId]));
      await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [bookerAId, bookerBId]));
      await db.delete(staff).where(inArray(staff.id, [bookerAId, bookerBId]));
      await db.delete(institutions).where(inArray(institutions.id, [instA, instB]));
    } catch {
      // Cleanup best-effort
    }
  });

  it("rejects endTime <= startTime with 400", async () => {
    mockSession(bookerAId, "staff");
    const res = await createBooking(
      makeRequest({
        resourceId: resourceAId,
        title: "Bad window",
        startTime: day(10),
        endTime: day(9),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects malformed datetimes with 400", async () => {
    mockSession(bookerAId, "staff");
    const res = await createBooking(
      makeRequest({
        resourceId: resourceAId,
        title: "Bad datetime",
        startTime: "not-a-date",
        endTime: day(11),
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates a booking in pending status (requires approval)", async () => {
    mockSession(bookerAId, "staff");
    const res = await createBooking(
      makeRequest({
        resourceId: resourceAId,
        title: "Pending booking",
        startTime: day(10),
        endTime: day(11),
      })
    );
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.booking.status).toBe("pending");
    expect(data.booking.bookerId).toBe(bookerAId);
    expect(data.booking.institutionId).toBe(instA);
  });

  it("blocks overlapping booking against a pending booking with 409", async () => {
    mockSession(bookerAId, "staff");
    // 10:30-11:30 overlaps the pending 10:00-11:00 booking above
    const res = await createBooking(
      makeRequest({
        resourceId: resourceAId,
        title: "Overlapping booking",
        startTime: day(10, 30),
        endTime: day(11, 30),
      })
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("overlaps");
  });

  it("allows non-overlapping booking after the occupied window", async () => {
    mockSession(bookerAId, "staff");
    const res = await createBooking(
      makeRequest({
        resourceId: resourceAId,
        title: "Adjacent booking",
        startTime: day(11),
        endTime: day(12),
      })
    );
    // Adjacent (end == start of next) must NOT be treated as overlap
    expect(res.status).toBe(201);
  });

  it("does not treat rejected/cancelled bookings as slot holders", async () => {
    // Seed a rejected booking that overlaps 14:00-15:00
    await db.insert(bookings).values({
      id: `bk_rejected_${suffix}`,
      resourceId: resourceAId,
      bookerId: bookerAId,
      title: "Rejected hold",
      startTime: day(14),
      endTime: day(15),
      status: "rejected",
      institutionId: instA,
    });
    mockSession(bookerAId, "staff");
    const res = await createBooking(
      makeRequest({
        resourceId: resourceAId,
        title: "Slot freed by rejection",
        startTime: day(14),
        endTime: day(15),
      })
    );
    expect(res.status).toBe(201);
  });

  it("returns 404 when booking a resource from another tenant", async () => {
    mockSession(bookerAId, "staff");
    const res = await createBooking(
      makeRequest({
        resourceId: resourceBId,
        title: "Cross-tenant booking attempt",
        startTime: day(20),
        endTime: day(21),
      })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid JSON body", async () => {
    mockSession(bookerAId, "staff");
    const res = await createBooking(
      new Request("https://thaiba.edu/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("GET scopes non-admin viewers to own or confirmed/approved bookings", async () => {
    mockSession(bookerBId, "staff");
    const res = await listBookings(
      new Request(`https://thaiba.edu/api/bookings?resourceId=${resourceAId}`)
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    // bookerB has no membership in instA and no bookings there -> sees none
    expect(data.bookings).toHaveLength(0);
  });
});
