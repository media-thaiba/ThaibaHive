import { GET as getPools, POST as createPool } from "@/app/api/cross-campus/pools/route";
import { GET as getRequests, POST as createRequest } from "@/app/api/cross-campus/requests/route";
import { POST as approveRequest } from "@/app/api/cross-campus/requests/[id]/approve/route";
import { GET as checkAvailability } from "@/app/api/cross-campus/availability/route";
import { ResourcePoolService } from "../resource-pool";
import { AllocationEngine } from "../allocation-engine";
import { AllocationLedger } from "../allocation-ledger";
import { setTenantFeatureFlag, clearTenantFeatureOverrides } from "@/lib/features";

const mockSession = {
  current: {
    userId: "usr_admin",
    staffId: "usr_admin",
    email: "admin@thaiba.edu",
    role: "admin",
    institutionId: "inst_campus_alpha",
    permissions: [
      "crosscampus:read",
      "crosscampus:request",
      "crosscampus:approve",
    ],
  } as any,
};

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockImplementation(() => Promise.resolve(mockSession.current)),
    resolveInstitutionScopeForSession: jest.fn().mockImplementation(() =>
      Promise.resolve(mockSession.current?.institutionId || "inst_campus_alpha")
    ),
  };
});

describe("Wave 4: Cross-Campus API Route Handlers (Gates 10 & 13)", () => {
  const hostInst = "inst_campus_alpha";
  const reqInst = "inst_campus_beta";
  let poolId: string;

  beforeEach(async () => {
    ResourcePoolService.setUseMemory(true);
    ResourcePoolService.clearMemory();
    AllocationEngine.setUseMemory(true);
    AllocationEngine.clearMemory();
    AllocationLedger.setUseMemory(true);
    AllocationLedger.clearMemory();
    clearTenantFeatureOverrides();

    mockSession.current = {
      userId: "usr_admin",
      staffId: "usr_admin",
      email: "admin@thaiba.edu",
      role: "admin",
      institutionId: hostInst,
      permissions: [
        "crosscampus:read",
        "crosscampus:request",
        "crosscampus:approve",
      ],
    };

    setTenantFeatureFlag(hostInst, "sis_sync", true);
    setTenantFeatureFlag(reqInst, "sis_sync", true);

    const pool = await ResourcePoolService.createPool(hostInst, {
      regionalGroupId: "reg_south",
      resourceType: "hall",
      name: "Grand Auditorium",
      capacity: 600,
    });
    poolId = pool.id;
  });

  afterEach(() => {
    ResourcePoolService.clearMemory();
    AllocationEngine.clearMemory();
    AllocationLedger.clearMemory();
    clearTenantFeatureOverrides();
  });

  describe("RBAC & Denials (Gate 13)", () => {
    it("returns 401 when no session is present", async () => {
      mockSession.current = null;
      const req = new Request("http://localhost/api/cross-campus/pools");
      const res = await getPools(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when staff role attempts crosscampus:approve", async () => {
      mockSession.current = {
        userId: "usr_staff",
        staffId: "usr_staff",
        email: "staff@thaiba.edu",
        role: "staff",
        institutionId: hostInst,
        permissions: ["crosscampus:read", "crosscampus:request"],
      };

      const req = new Request("http://localhost/api/cross-campus/requests/ccb_123/approve", {
        method: "POST",
      });

      const res = await approveRequest(req, { params: Promise.resolve({ id: "ccb_123" }) });
      expect(res.status).toBe(403);
    });
  });

  describe("Pools & Booking Lifecycle with Gate 10 Conflict", () => {
    it("creates a booking request and approves it", async () => {
      const req = new Request("http://localhost/api/cross-campus/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId,
          hostInstitutionId: hostInst,
          title: "Robotics Exhibition",
          startsAt: "2026-11-20T09:00:00Z",
          endsAt: "2026-11-20T17:00:00Z",
        }),
      });

      const res = await createRequest(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.booking.status).toBe("requested");

      // Approve
      const approveReq = new Request(`http://localhost/api/cross-campus/requests/${json.booking.id}/approve`, {
        method: "POST",
      });
      const approveRes = await approveRequest(approveReq, {
        params: Promise.resolve({ id: json.booking.id }),
      });
      expect(approveRes.status).toBe(200);
      const approveJson = await approveRes.json();
      expect(approveJson.booking.status).toBe("approved");
    });

    it("enforces Gate 10: returns 409 Conflict when approving overlapping booking", async () => {
      // 1. Submit Request 1 (09:00 - 13:00)
      const req1 = new Request("http://localhost/api/cross-campus/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId,
          hostInstitutionId: hostInst,
          title: "Session 1",
          startsAt: "2026-11-25T09:00:00Z",
          endsAt: "2026-11-25T13:00:00Z",
        }),
      });
      const res1 = await createRequest(req1);
      const json1 = await res1.json();

      // 2. Approve Request 1
      const app1 = await approveRequest(
        new Request(`http://localhost/api/cross-campus/requests/${json1.booking.id}/approve`, { method: "POST" }),
        { params: Promise.resolve({ id: json1.booking.id }) }
      );
      expect(app1.status).toBe(200);

      // 3. Submit Request 2 overlapping (11:00 - 15:00)
      const req2 = new Request("http://localhost/api/cross-campus/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId,
          hostInstitutionId: hostInst,
          title: "Session 2 (Overlapping)",
          startsAt: "2026-11-25T11:00:00Z",
          endsAt: "2026-11-25T15:00:00Z",
        }),
      });
      const res2 = await createRequest(req2);
      const json2 = await res2.json();

      // 4. Approve Request 2 -> Gate 10 returns 409 Conflict!
      const app2 = await approveRequest(
        new Request(`http://localhost/api/cross-campus/requests/${json2.booking.id}/approve`, { method: "POST" }),
        { params: Promise.resolve({ id: json2.booking.id }) }
      );
      expect(app2.status).toBe(409);
      const conflictJson = await app2.json();
      expect(conflictJson.error).toContain("Double-booking conflict");
      expect(conflictJson.conflictingBookingId).toBe(json1.booking.id);
    });

    it("checks availability accurately via API", async () => {
      // Create and approve a booking for Nov 28, 10:00 - 12:00
      const b = await AllocationEngine.requestBooking(reqInst, "staff_1", {
        poolId,
        hostInstitutionId: hostInst,
        title: "Reserved Slot",
        startsAt: "2026-11-28T10:00:00Z",
        endsAt: "2026-11-28T12:00:00Z",
      });
      await AllocationEngine.approveBooking(hostInst, b.id, "staff_approver");

      const req = new Request(
        `http://localhost/api/cross-campus/availability?poolId=${poolId}&startsAt=2026-11-28T11:00:00Z&endsAt=2026-11-28T13:00:00Z`
      );
      const res = await checkAvailability(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.available).toBe(false);
      expect(json.conflictingBookings).toHaveLength(1);
    });
  });
});
