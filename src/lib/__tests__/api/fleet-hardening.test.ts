/**
 * @jest-environment node
 *
 * Fleet & Vehicle Logistics Management Pipeline — Hardening & Integrity Suite:
 * - Double-booking race condition & overlap collision prevention (withVehicleLock, 409 Conflict)
 * - Temporal validation bounds: rejects past dates and inverted time sequences (400)
 * - Inactive vehicle guard: rejects booking inactive/decommissioned vehicles (400)
 * - Foreign key integrity: rejects operations without valid staff profile (400)
 * - Multi-tenant isolation & IDOR prevention: cross-tenant access returns fail-closed 404
 * - Non-manager scoping: regular staff only see their own vehicle bookings
 * - REST & Withdrawal parity: submitter can withdraw pending bookings; blocked on approved
 * - Terminal state immutability: approved/rejected/cancelled bookings cannot be modified (400)
 * - Active booking guard on vehicle deletion: blocks deleting vehicle with active reservations (400)
 * - Cascading safety on vehicle deletion: cleans up routes and maintenance logs without foreign key errors
 * - Log & maintenance validation: rejects negative costs and declining odometer readings (400)
 * - Safe JSON parsing: empty/malformed bodies return 400 without crashing
 */
import {
  db,
  institutions,
  staff,
  staffInstitutions,
  vehicles,
  vehicleBookings,
  vehicleLogs,
  fleetRoutes,
  fleetMaintenanceLogs,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listVehicles,
  POST as createVehicle,
} from "@/app/api/vehicles/route";
import {
  GET as getVehicleDetail,
  PATCH as updateVehicle,
  DELETE as deleteVehicle,
} from "@/app/api/vehicles/[id]/route";
import {
  GET as listBookings,
  POST as createBooking,
  PATCH as updateBookingRoot,
} from "@/app/api/vehicles/bookings/route";
import {
  GET as getBookingDetail,
  PATCH as updateBookingDetail,
  DELETE as deleteBookingDetail,
} from "@/app/api/vehicles/bookings/[id]/route";
import {
  GET as listLogs,
  POST as createLog,
} from "@/app/api/vehicles/logs/route";
import {
  DELETE as deleteLog,
} from "@/app/api/vehicles/logs/[id]/route";
import {
  POST as createMaintenance,
} from "@/app/api/vehicles/maintenance/route";
import {
  GET as exportFleet,
} from "@/app/api/export/fleet/route";
import {
  GET as listRoutes,
  POST as createRoute,
} from "@/app/api/vehicles/routes/route";
import {
  POST as fleetCheckin,
} from "@/app/api/mobile/v1/fleet/checkin/route";
import {
  GET as getDispatchRoute,
  DELETE as deleteDispatchRoute,
} from "@/app/api/admin/operations/fleet/dispatches/[id]/route";
import { AimsDbStore } from "@/lib/operations/persistence/aims-db-store";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Fleet & Vehicle Logistics Management Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_flt_a_${suffix}`;
  const instB = `inst_flt_b_${suffix}`;

  const adminAId = `stf_flt_adm_a_${suffix}`;
  const principalAId = `stf_flt_pa_${suffix}`;
  const staffA1Id = `stf_flt_s1_${suffix}`;
  const staffA2Id = `stf_flt_s2_${suffix}`;
  const staffBId = `stf_flt_sb_${suffix}`;

  const createdVehicleIds: string[] = [];
  const createdBookingIds: string[] = [];
  const createdLogIds: string[] = [];
  const createdMaintenanceIds: string[] = [];
  const createdRouteIds: string[] = [];

  let vehicleA1Id: string;
  let vehicleAInactiveId: string;
  let vehicleBId: string;

  beforeAll(async () => {
    // 1. Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Fleet Campus A ${suffix}`, code: `FCA_${suffix}` },
      { id: instB, name: `Fleet Campus B ${suffix}`, code: `FCB_${suffix}` },
    ]).run();

    // 2. Seed Staff members
    const staffRows: (typeof staff.$inferInsert)[] = [
      { id: adminAId, employeeId: `EMP_ADM_${suffix}`, firstName: "Admin", lastName: "Alpha", email: `admin.a.${suffix}@example.com`, role: "admin" },
      { id: principalAId, employeeId: `EMP_PRN_${suffix}`, firstName: "Principal", lastName: "Alpha", email: `principal.a.${suffix}@example.com`, role: "principal" },
      { id: staffA1Id, employeeId: `EMP_S1_${suffix}`, firstName: "Driver", lastName: "One", email: `staff.a1.${suffix}@example.com`, role: "staff" },
      { id: staffA2Id, employeeId: `EMP_S2_${suffix}`, firstName: "Staff", lastName: "Two", email: `staff.a2.${suffix}@example.com`, role: "staff" },
      { id: staffBId, employeeId: `EMP_SB_${suffix}`, firstName: "Staff", lastName: "Bravo", email: `staff.b.${suffix}@example.com`, role: "staff" },
    ];
    for (const row of staffRows) {
      await db.insert(staff).values(row).run();
    }

    await db.insert(staffInstitutions).values([
      { id: `si_adm_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_pa_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_s1_${suffix}`, staffId: staffA1Id, institutionId: instA },
      { id: `si_s2_${suffix}`, staffId: staffA2Id, institutionId: instA },
      { id: `si_sb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]).run();

    // 3. Seed Vehicles
    vehicleA1Id = `veh_a1_${suffix}`;
    vehicleAInactiveId = `veh_ainact_${suffix}`;
    vehicleBId = `veh_b_${suffix}`;

    await db.insert(vehicles).values([
      {
        id: vehicleA1Id,
        registrationNumber: `KL-10-A-${suffix.toUpperCase()}`,
        model: "Tata Starbus 32",
        type: "bus",
        capacity: 32,
        fuelType: "diesel",
        institutionId: instA,
        isActive: true,
      },
      {
        id: vehicleAInactiveId,
        registrationNumber: `KL-10-INA-${suffix.toUpperCase()}`,
        model: "Mahindra Bolero",
        type: "van",
        capacity: 7,
        fuelType: "diesel",
        institutionId: instA,
        isActive: false,
      },
      {
        id: vehicleBId,
        registrationNumber: `KL-11-B-${suffix.toUpperCase()}`,
        model: "Force Traveller",
        type: "van",
        capacity: 14,
        fuelType: "diesel",
        institutionId: instB,
        isActive: true,
      },
    ]).run();

    createdVehicleIds.push(vehicleA1Id, vehicleAInactiveId, vehicleBId);
  });

  afterAll(async () => {
    if (createdMaintenanceIds.length > 0) {
      await db.delete(fleetMaintenanceLogs).where(inArray(fleetMaintenanceLogs.id, createdMaintenanceIds)).run();
    }
    if (createdRouteIds.length > 0) {
      await db.delete(fleetRoutes).where(inArray(fleetRoutes.id, createdRouteIds)).run();
    }
    if (createdLogIds.length > 0) {
      await db.delete(vehicleLogs).where(inArray(vehicleLogs.id, createdLogIds)).run();
    }
    if (createdBookingIds.length > 0) {
      await db.delete(vehicleBookings).where(inArray(vehicleBookings.id, createdBookingIds)).run();
    }
    if (createdVehicleIds.length > 0) {
      await db.delete(vehicles).where(inArray(vehicles.id, createdVehicleIds)).run();
    }
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [adminAId, principalAId, staffA1Id, staffA2Id, staffBId])).run();
    await db.delete(staff).where(inArray(staff.id, [adminAId, principalAId, staffA1Id, staffA2Id, staffBId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  function mockUser(role: string, staffId: string | null, institutionId: string | null) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      userId: staffId ? `usr_${staffId}` : "usr_external",
      role,
      staffId,
      institutionId,
    });
    (hasPermission as unknown as jest.Mock).mockReturnValue(true);
  }

  function mockPermissionDenied() {
    (hasPermission as unknown as jest.Mock).mockReturnValue(false);
  }

  describe("Double-Booking Race Condition & Overlap Prevention (VULN-FL-01)", () => {
    const futureDate = "2028-11-15";

    it("creates a vehicle booking successfully with valid future parameters", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: futureDate,
          startTime: "09:00",
          endTime: "12:00",
          purpose: "Field Trip to Regional Science Center",
          destination: "Science Center",
        }),
      });

      const res = await createBooking(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.booking).toBeDefined();
      expect(data.booking.status).toBe("pending");
      createdBookingIds.push(data.booking.id);
    });

    it("rejects overlapping booking for the same vehicle and same date with 409 Conflict", async () => {
      mockUser("staff", staffA2Id, instA);
      // Overlaps with 09:00-12:00 (10:00-14:00)
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: futureDate,
          startTime: "10:00",
          endTime: "14:00",
          purpose: "Guest Lecture Pickup",
          destination: "Airport",
        }),
      });

      const res = await createBooking(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already booked or has a pending reservation");
    });

    it("allows non-overlapping booking for the same vehicle on the same date", async () => {
      mockUser("staff", staffA2Id, instA);
      // Non-overlapping time slot: 14:00-17:00
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: futureDate,
          startTime: "14:00",
          endTime: "17:00",
          purpose: "Afternoon Athletics Meet",
          destination: "Sports Ground",
        }),
      });

      const res = await createBooking(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.booking).toBeDefined();
      createdBookingIds.push(data.booking.id);
    });
  });

  describe("Temporal Validation & Status Guards", () => {
    it("rejects bookings in the past (400)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: "2020-01-01",
          startTime: "09:00",
          endTime: "11:00",
          purpose: "Past event test",
        }),
      });

      const res = await createBooking(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("past");
    });

    it("rejects booking when end time is before or equal to start time (400)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: "2028-12-01",
          startTime: "15:00",
          endTime: "14:00",
          purpose: "Time reversal test",
        }),
      });

      const res = await createBooking(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("End time must be after start time");
    });

    it("rejects booking an inactive or decommissioned vehicle (400)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleAInactiveId,
          date: "2028-12-01",
          startTime: "09:00",
          endTime: "11:00",
          purpose: "Inactive test",
        }),
      });

      const res = await createBooking(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("inactive or decommissioned");
    });
  });

  describe("Foreign Key Integrity & Staff Profile Enforcement (VULN-FL-03)", () => {
    it("rejects booking creation if caller lacks a staff profile (400)", async () => {
      mockUser("super_admin", null, instA);
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: "2028-12-01",
          startTime: "09:00",
          endTime: "11:00",
          purpose: "External caller test",
        }),
      });

      const res = await createBooking(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("valid staff profile is required");
    });

    it("rejects log creation if caller lacks a staff profile (400)", async () => {
      mockUser("super_admin", null, instA);
      const req = new Request("http://localhost/api/vehicles/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: "2028-12-01",
          startOdometer: 1000,
          endOdometer: 1050,
        }),
      });

      const res = await createLog(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("valid staff profile is required");
    });
  });

  describe("Multi-Tenant Isolation & IDOR Prevention (VULN-FL-02)", () => {
    it("prevents staff from booking a vehicle belonging to another institution (fail-closed 404)", async () => {
      mockUser("staff", staffBId, instB);
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id, // Belongs to Inst A
          date: "2028-12-10",
          startTime: "09:00",
          endTime: "11:00",
          purpose: "Cross tenant booking exploit",
        }),
      });

      const res = await createBooking(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Vehicle not found");
    });

    it("prevents cross-tenant vehicle detail inspection (fail-closed 404)", async () => {
      mockUser("staff", staffBId, instB);
      const req = new Request(`http://localhost/api/vehicles/${vehicleA1Id}`);
      const res = await getVehicleDetail(req, { params: Promise.resolve({ id: vehicleA1Id }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Vehicle not found");
    });

    it("prevents cross-tenant booking detail inspection (fail-closed 404)", async () => {
      mockUser("staff", staffBId, instB);
      const bookingId = createdBookingIds[0];
      const req = new Request(`http://localhost/api/vehicles/bookings/${bookingId}`);
      const res = await getBookingDetail(req, { params: Promise.resolve({ id: bookingId }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Booking request not found");
    });

    it("restricts regular staff listing to their own bookings only", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/vehicles/bookings");
      const res = await listBookings(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      // Should only contain bookings created by staffA1Id
      expect(data.bookings.every((b: { bookedById: string }) => b.bookedById === staffA1Id)).toBe(true);
    });

    it("allows institutional managers to see all institution bookings", async () => {
      mockUser("principal", principalAId, instA);
      const req = new Request("http://localhost/api/vehicles/bookings");
      const res = await listBookings(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      // Contains both staffA1 and staffA2 bookings for instA
      expect(data.bookings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("REST Parity, Approval State Machine & Withdrawal Parity (VULN-FL-04)", () => {
    let pendingBookingId: string;
    const bookingDate = "2028-12-20";

    beforeAll(async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: bookingDate,
          startTime: "08:00",
          endTime: "10:00",
          purpose: "Pre-approval test booking",
        }),
      });
      const res = await createBooking(req);
      const data = await res.json();
      pendingBookingId = data.booking.id;
      createdBookingIds.push(pendingBookingId);
    });

    it("fetches single booking detail via GET /api/vehicles/bookings/[id]", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/vehicles/bookings/${pendingBookingId}`);
      const res = await getBookingDetail(req, { params: Promise.resolve({ id: pendingBookingId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.booking.id).toBe(pendingBookingId);
      expect(data.booking.model).toBe("Tata Starbus 32");
    });

    it("allows manager to approve a pending booking", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/vehicles/bookings/${pendingBookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          notes: "Approved by Campus Admin",
        }),
      });

      const res = await updateBookingDetail(req, { params: Promise.resolve({ id: pendingBookingId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.booking.status).toBe("approved");
    });

    it("blocks updating an already approved booking (terminal status immutability 400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/vehicles/bookings/${pendingBookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          notes: "Attempt to reject approved booking",
        }),
      });

      const res = await updateBookingDetail(req, { params: Promise.resolve({ id: pendingBookingId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("already in 'approved' status");
    });

    it("prevents submitter from withdrawing an approved booking (400)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/vehicles/bookings/${pendingBookingId}`, {
        method: "DELETE",
      });

      const res = await deleteBookingDetail(req, { params: Promise.resolve({ id: pendingBookingId }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Only pending bookings can be withdrawn directly");
    });

    it("permits submitter to withdraw their own pending booking", async () => {
      // Create a fresh pending booking
      mockUser("staff", staffA1Id, instA);
      const createReq = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: "2028-12-25",
          startTime: "09:00",
          endTime: "11:00",
          purpose: "To be cancelled by submitter",
        }),
      });
      const createRes = await createBooking(createReq);
      const createData = await createRes.json();
      const withdrawId = createData.booking.id;
      createdBookingIds.push(withdrawId);

      // Submitter withdraws pending booking
      const delReq = new Request(`http://localhost/api/vehicles/bookings/${withdrawId}`, {
        method: "DELETE",
      });
      const delRes = await deleteBookingDetail(delReq, { params: Promise.resolve({ id: withdrawId }) });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);

      // Verify status is now cancelled
      const verifyReq = new Request(`http://localhost/api/vehicles/bookings/${withdrawId}`);
      const verifyRes = await getBookingDetail(verifyReq, { params: Promise.resolve({ id: withdrawId }) });
      const verifyData = await verifyRes.json();
      expect(verifyData.booking.status).toBe("cancelled");
    });

    it("blocks other staff members from withdrawing someone else's booking (403)", async () => {
      // Create pending booking for staffA1
      mockUser("staff", staffA1Id, instA);
      const createReq = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: "2028-12-26",
          startTime: "09:00",
          endTime: "11:00",
          purpose: "Other staff test",
        }),
      });
      const createRes = await createBooking(createReq);
      const createData = await createRes.json();
      const targetId = createData.booking.id;
      createdBookingIds.push(targetId);

      // staffA2 attempts to withdraw staffA1's booking
      mockUser("staff", staffA2Id, instA);
      const delReq = new Request(`http://localhost/api/vehicles/bookings/${targetId}`, {
        method: "DELETE",
      });
      const delRes = await deleteBookingDetail(delReq, { params: Promise.resolve({ id: targetId }) });
      expect(delRes.status).toBe(403);
    });
  });

  describe("Active Booking Guard & Cascading Safety on Vehicle Deletion (VULN-FL-05)", () => {
    it("blocks deleting a vehicle that has active/pending bookings (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/vehicles/${vehicleA1Id}`, {
        method: "DELETE",
      });

      const res = await deleteVehicle(req, { params: Promise.resolve({ id: vehicleA1Id }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("active or pending bookings");
    });

    it("cleanly deletes an unbooked vehicle without foreign key constraint violations", async () => {
      // Create temporary vehicle with associated maintenance log and route
      mockUser("admin", adminAId, instA);
      const tempVehId = `veh_del_${suffix}`;
      await db.insert(vehicles).values({
        id: tempVehId,
        registrationNumber: `KL-10-DEL-${suffix.toUpperCase()}`,
        model: "Temporary Van",
        type: "van",
        capacity: 8,
        institutionId: instA,
        isActive: true,
      }).run();

      const tempRouteId = `rt_del_${suffix}`;
      await db.insert(fleetRoutes).values({
        id: tempRouteId,
        institutionId: instA,
        name: "Temporary Route",
        startLocation: "Campus Gate",
        endLocation: "Metro Station",
        vehicleId: tempVehId,
      }).run();
      createdRouteIds.push(tempRouteId);

      const tempMaintId = `maint_del_${suffix}`;
      await db.insert(fleetMaintenanceLogs).values({
        id: tempMaintId,
        institutionId: instA,
        vehicleId: tempVehId,
        maintenanceDate: "2028-10-01",
        serviceType: "general",
        cost: 2500,
      }).run();
      createdMaintenanceIds.push(tempMaintId);

      // Now delete the vehicle
      const req = new Request(`http://localhost/api/vehicles/${tempVehId}`, {
        method: "DELETE",
      });
      const res = await deleteVehicle(req, { params: Promise.resolve({ id: tempVehId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify route was disassociated (vehicleId nullified) and maintenance log was cascaded
      const route = await db.select().from(fleetRoutes).where(eq(fleetRoutes.id, tempRouteId)).get();
      expect(route?.vehicleId).toBeNull();

      const maint = await db.select().from(fleetMaintenanceLogs).where(eq(fleetMaintenanceLogs.id, tempMaintId)).get();
      expect(maint).toBeUndefined();
    });
  });

  describe("Validation Bounds on Logs & Maintenance (VULN-FL-07)", () => {
    it("rejects vehicle log when end odometer is less than start odometer (400)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/vehicles/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          date: "2028-12-01",
          startOdometer: 5000,
          endOdometer: 4900, // Invalid!
        }),
      });

      const res = await createLog(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid vehicle log parameters");
    });

    it("rejects maintenance log with negative cost (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/vehicles/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          maintenanceDate: "2028-12-01",
          serviceType: "oil_change",
          cost: -500, // Invalid!
        }),
      });

      const res = await createMaintenance(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid maintenance parameters");
    });
  });

  describe("Unhandled JSON Parse Crash Prevention (VULN-FL-06)", () => {
    it("safely handles empty body on vehicle creation with 400 (not 500)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      });

      const res = await createVehicle(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("safely handles empty body on booking creation with 400 (not 500)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      });

      const res = await createBooking(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("safely handles empty body on vehicle update with 400 (not 500)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/vehicles/${vehicleA1Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "",
      });

      const res = await updateVehicle(req, { params: Promise.resolve({ id: vehicleA1Id }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("Fleet Export Multi-Tenant Scoping", () => {
    it("restricts export to tenant-scoped vehicles (Campus A cannot export Campus B)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/export/fleet?format=csv&institutionId=${instA}`);
      const res = await exportFleet(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      // Should include Campus A vehicle but NOT Campus B vehicle
      expect(text).toContain(`KL-10-A-${suffix.toUpperCase()}`);
      expect(text).not.toContain(`KL-11-B-${suffix.toUpperCase()}`);
    });

    it("allows super_admin to export global fleet across all campuses", async () => {
      mockUser("super_admin", null, null);
      const req = new Request("http://localhost/api/export/fleet?format=csv");
      const res = await exportFleet(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain(`KL-10-A-${suffix.toUpperCase()}`);
      expect(text).toContain(`KL-11-B-${suffix.toUpperCase()}`);
    });
  });

  describe("Mobile Fleet Check-in Hardening & Invariants", () => {
    it("rejects malformed or empty JSON checkin payload (400)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/mobile/v1/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });
      const res = await fleetCheckin(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("rejects invalid check-in action (400)", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/mobile/v1/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          action: "pause_trip", // invalid action
        }),
      });
      const res = await fleetCheckin(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid trip check-in parameters");
    });

    it("rejects starting trip when an active trip is already in progress (409 Conflict)", async () => {
      mockUser("staff", staffA1Id, instA);

      // 1. Start first trip
      const req1 = new Request("http://localhost/api/mobile/v1/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          action: "start_trip",
          startOdometer: 10000,
          route: "Morning Route",
        }),
      });
      const res1 = await fleetCheckin(req1);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.success).toBe(true);
      expect(data1.status).toBe("in_use");
      createdLogIds.push(data1.log.id);

      // 2. Attempt to start second trip without ending the first
      const req2 = new Request("http://localhost/api/mobile/v1/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          action: "start_trip",
          startOdometer: 10000,
          route: "Afternoon Route",
        }),
      });
      const res2 = await fleetCheckin(req2);
      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error).toContain("A trip is already in progress");

      // 3. Attempt to end trip with endOdometer < startOdometer (400)
      const reqProgressionFail = new Request("http://localhost/api/mobile/v1/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          action: "end_trip",
          endOdometer: 9990, // Less than start 10000!
        }),
      });
      const resProgFail = await fleetCheckin(reqProgressionFail);
      expect(resProgFail.status).toBe(400);
      const dataProgFail = await resProgFail.json();
      expect(dataProgFail.error).toContain("cannot be less than start odometer");

      // 4. Properly end the trip
      const reqEnd = new Request("http://localhost/api/mobile/v1/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          action: "end_trip",
          endOdometer: 10025,
        }),
      });
      const resEnd = await fleetCheckin(reqEnd);
      expect(resEnd.status).toBe(200);
      const dataEnd = await resEnd.json();
      expect(dataEnd.success).toBe(true);
      expect(dataEnd.status).toBe("available");
      expect(dataEnd.log.distanceKm).toBe(25);
    });

    it("returns 404 when ending trip if no active trip exists for driver and vehicle", async () => {
      mockUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/mobile/v1/fleet/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleA1Id,
          action: "end_trip",
          endOdometer: 10050,
        }),
      });
      const res = await fleetCheckin(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("No active trip found to end");
    });
  });

  describe("Fleet Route Validation & Driver Assignment", () => {
    it("rejects route creation with missing fields (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/vehicles/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Campus Express",
          // missing startLocation and endLocation
        }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid route parameters");
    });

    it("rejects assigning driver from a different institution (400)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/vehicles/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          name: "Inter-Campus Shuttle",
          startLocation: "North Gate",
          endLocation: "South Gate",
          driverId: staffBId, // From Campus B!
        }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Assigned driver does not belong to this institution");
    });

    it("successfully creates a fleet route with valid data (201)", async () => {
      mockUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/vehicles/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          name: "Campus North Express",
          startLocation: "Main Terminal",
          endLocation: "Science Block",
          vehicleId: vehicleA1Id,
          driverId: staffA1Id,
          stopsJson: ["Stop 1", "Stop 2", "Stop 3"],
        }),
      });
      const res = await createRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.route.name).toBe("Campus North Express");
      createdRouteIds.push(data.route.id);
    });
  });

  describe("Fleet Dispatch Deletion & Persistence (AIMS)", () => {
    it("deletes dispatch from store and reflects in subsequent GET (404)", async () => {
      mockUser("admin", adminAId, instA);
      const store = AimsDbStore.getInstance();
      const testRouteId = `route_dsp_${suffix}`;
      store.saveDispatch({
        routeId: testRouteId,
        campusId: instA,
        status: "SCHEDULED",
        stops: [],
      });

      // 1. Verify dispatch exists
      const getReq1 = new Request(`http://localhost/api/admin/operations/fleet/dispatches/${testRouteId}`);
      const getRes1 = await getDispatchRoute(getReq1, { params: Promise.resolve({ id: testRouteId }) });
      expect(getRes1.status).toBe(200);

      // 2. Delete dispatch
      const delReq = new Request(`http://localhost/api/admin/operations/fleet/dispatches/${testRouteId}`, {
        method: "DELETE",
      });
      const delRes = await deleteDispatchRoute(delReq, { params: Promise.resolve({ id: testRouteId }) });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);

      // 3. Subsequent GET must return 404
      const getReq2 = new Request(`http://localhost/api/admin/operations/fleet/dispatches/${testRouteId}`);
      const getRes2 = await getDispatchRoute(getReq2, { params: Promise.resolve({ id: testRouteId }) });
      expect(getRes2.status).toBe(404);
    });
  });
});
