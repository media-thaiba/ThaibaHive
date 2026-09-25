import { db } from "@/db";
import { vehicles, vehicleBookings, mealNotifications, visitors, staff, institutions, staffInstitutions } from "@/db/schema";
import { GET as getServicesOverview } from "@/app/api/services/route";
import { GET as listVehicles, POST as createVehicle } from "@/app/api/services/vehicles/route";
import { GET as getVehicle, PATCH as updateVehicle, DELETE as deleteVehicle } from "@/app/api/services/vehicles/[id]/route";
import { GET as listCanteen, POST as createCanteen } from "@/app/api/services/canteen/route";
import { GET as listVisitors, POST as createVisitor } from "@/app/api/services/visitors/route";
import { GET as getVisitor, PATCH as updateVisitor, DELETE as deleteVisitor } from "@/app/api/services/visitors/[id]/route";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Operations & Campus Services Hardened Engine", () => {
  const timestamp = Date.now();
  const instId = `inst-srv-${timestamp}`;
  const staffId = `staff-srv-${timestamp}`;
  let vehicleId: string;
  let visitorId: string;
  let mealId: string;

  beforeAll(async () => {
    // 1. Setup institution
    await db.insert(institutions).values({
      id: instId,
      name: `Thaiba Campus Services ${timestamp}`,
      code: `TCS${timestamp.toString().slice(-4)}`,
    }).run();

    // 2. Setup staff member
    await db.insert(staff).values({
      id: staffId,
      email: `staff-${timestamp}@thaibahive.local`,
      employeeId: `EMP-SRV-${timestamp}`,
      firstName: "Campus",
      lastName: "Coordinator",
      role: "admin",
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si-srv-${timestamp}`,
      staffId,
      institutionId: instId,
    }).run();
  });

  afterAll(async () => {
    try {
      if (vehicleId) await db.delete(vehicles).where(eq(vehicles.id, vehicleId)).run();
      if (visitorId) await db.delete(visitors).where(eq(visitors.id, visitorId)).run();
      if (mealId) await db.delete(mealNotifications).where(eq(mealNotifications.id, mealId)).run();
      await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instId)).run();
      await db.delete(staff).where(eq(staff.id, staffId)).run();
      await db.delete(institutions).where(eq(institutions.id, instId)).run();
    } catch {
      // Cleanup fallback
    }
  });

  describe("1. Campus Services Overview Dashboard", () => {
    it("should aggregate fleet, canteen, and visitor metrics", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId,
        role: "admin",
      });

      const req = new Request("http://localhost:3000/api/services");
      const res = await getServicesOverview(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.fleet).toBeDefined();
      expect(data.canteen).toBeDefined();
      expect(data.visitors).toBeDefined();
      expect(typeof data.fleet.totalVehicles).toBe("number");
      expect(typeof data.visitors.currentlyOnCampus).toBe("number");
    });
  });

  describe("2. Fleet & Vehicle Management (/api/services/vehicles)", () => {
    it("should register a new campus fleet vehicle", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId,
        role: "admin",
      });

      const req = new Request("http://localhost:3000/api/services/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNumber: `KL-${timestamp.toString().slice(-2)}-AB-1234`,
          model: "Toyota HiAce 14-Seater",
          type: "van",
          capacity: 14,
          fuelType: "diesel",
          institutionId: instId,
          notes: "Campus Shuttle Fleet",
        }),
      });

      const res = await createVehicle(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.vehicle.id).toBeDefined();
      expect(data.vehicle.capacity).toBe(14);
      vehicleId = data.vehicle.id;
    });

    it("should retrieve vehicle details and bookings", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId,
        role: "admin",
      });

      const req = new Request(`http://localhost:3000/api/services/vehicles/${vehicleId}`);
      const res = await getVehicle(req, { params: Promise.resolve({ id: vehicleId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.vehicle.model).toBe("Toyota HiAce 14-Seater");
      expect(data.bookings).toBeDefined();
    });

    it("should update vehicle status and notes", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId,
        role: "admin",
      });

      const req = new Request(`http://localhost:3000/api/services/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: "Updated maintenance schedule",
          isActive: true,
        }),
      });

      const res = await updateVehicle(req, { params: Promise.resolve({ id: vehicleId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.vehicle.notes).toBe("Updated maintenance schedule");
    });
  });

  describe("3. Canteen & Dining Services (/api/services/canteen)", () => {
    it("should record a meal notification with guest attendance", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId,
        role: "staff",
      });

      const today = new Date().toISOString().split("T")[0];
      const req = new Request("http://localhost:3000/api/services/canteen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          mealType: "lunch",
          status: "bring_guest",
          guestCount: 2,
          notes: "Host visiting delegates for luncheon",
        }),
      });

      const res = await createCanteen(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const created = await db
        .select()
        .from(mealNotifications)
        .where(eq(mealNotifications.staffId, staffId))
        .get();
      if (created) mealId = created.id;
    });

    it("should list meal attendance notifications for the campus", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId,
        role: "admin",
      });

      const today = new Date().toISOString().split("T")[0];
      const req = new Request(`http://localhost:3000/api/services/canteen?date=${today}`);
      const res = await listCanteen(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.summary.lunch.guests).toBeGreaterThanOrEqual(2);
    });
  });

  describe("4. Campus Visitor Management (/api/services/visitors)", () => {
    it("should check-in a new campus visitor", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId,
        role: "admin",
      });

      const req = new Request("http://localhost:3000/api/services/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Dr. Alexander Wright",
          contact: "+91-9876543210",
          idType: "national_id",
          idNumber: `ID-${timestamp.toString().slice(-6)}`,
          hostStaffId: staffId,
          purpose: "Academic Curriculum Review",
          notes: "Keynote Guest Speaker",
        }),
      });

      const res = await createVisitor(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.visitor.id).toBeDefined();
      expect(data.visitor.status).toBe("checked_in");
      visitorId = data.visitor.id;
    });

    it("should check-out visitor and record departure time", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId,
        role: "admin",
      });

      const checkOutTime = new Date().toISOString();
      const req = new Request(`http://localhost:3000/api/services/visitors/${visitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "checked_out",
          checkOut: checkOutTime,
          notes: "Meeting completed successfully",
        }),
      });

      const res = await updateVisitor(req, { params: Promise.resolve({ id: visitorId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.visitor.status).toBe("checked_out");
      expect(data.visitor.checkOut).toBe(checkOutTime);
    });
  });
});
