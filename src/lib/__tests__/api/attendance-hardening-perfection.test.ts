/**
 * @jest-environment node
 *
 * Biometric & Manual Attendance Logs Pipeline Perfection & Hardening Suite:
 * - Safe JSON parsing across all mutating endpoints (400 on malformed payloads)
 * - Coordinate bounds (-90 to 90 lat, -180 to 180 lng, non-negative accuracy)
 * - Idempotent check-in debounce (duplicate: true within 60s)
 * - Check-out lifecycle & 409 conflict guards
 * - Multi-tenant attendance log isolation & pagination limits
 */
import {
  db,
  institutions,
  departments,
  staff,
  staffInstitutions,
  staffDepartments,
  attendanceLocations,
  attendanceLogs,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { POST as checkIn } from "@/app/api/attendance/check-in/route";
import { POST as checkOut } from "@/app/api/attendance/check-out/route";
import { GET as getLogs } from "@/app/api/attendance/logs/route";
import { GET as getMyLogs } from "@/app/api/attendance/my/route";
import { GET as getTodayLog } from "@/app/api/attendance/today/route";
import { POST as postPresenceLog } from "@/app/api/attendance/presence-log/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Attendance Logs Pipeline Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_att_a_${suffix}`;
  const instB = `inst_att_b_${suffix}`;
  const deptA = `dept_att_a_${suffix}`;

  const adminAId = `stf_att_adm_a_${suffix}`;
  const staffAId = `stf_att_sa_${suffix}`;
  const staffBId = `stf_att_sb_${suffix}`;

  const nfcTagA = `nfc_tag_att_${suffix}`;
  const locAId = `loc_att_a_${suffix}`;

  const asUser = (role: string, staffId: string, instId: string) => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: staffId,
      staffId,
      email: `${staffId}@test.local`,
      role,
      institutionId: instId,
    });
  };

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: instA, name: `Attendance Inst A ${suffix}`, code: `AIA_${suffix}`, isActive: true },
      { id: instB, name: `Attendance Inst B ${suffix}`, code: `AIB_${suffix}`, isActive: true },
    ]);

    await db.insert(departments).values([
      { id: deptA, institutionId: instA, name: `Att Dept A ${suffix}`, code: `ADA_${suffix}` },
    ]);

    await db.insert(staff).values([
      {
        id: adminAId,
        email: `adm_att_a_${suffix}@test.local`,
        employeeId: `EMP_ATA_${suffix}`,
        firstName: "Admin",
        lastName: "Alpha",
        role: "admin",
      },
      {
        id: staffAId,
        email: `staff_att_a_${suffix}@test.local`,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "Staff",
        lastName: "Alpha",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_att_b_${suffix}@test.local`,
        employeeId: `EMP_STB_${suffix}`,
        firstName: "Staff",
        lastName: "Beta",
        role: "staff",
      },
    ]);

    await db.insert(staffInstitutions).values([
      { id: `si_att_adm_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_att_sa_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_att_sb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]);

    await db.insert(staffDepartments).values([
      { id: `sd_att_sa_${suffix}`, staffId: staffAId, departmentId: deptA },
    ]);

    await db.insert(attendanceLocations).values({
      id: locAId,
      institutionId: instA,
      name: `Main Gate ${suffix}`,
      nfcTagId: nfcTagA,
      qrSecret: `sec_${suffix}`,
      latitude: 12.9716,
      longitude: 77.5946,
      radius: 200,
      isActive: true,
    });
  });

  afterAll(async () => {
    await db.delete(attendanceLogs).where(inArray(attendanceLogs.staffId, [staffAId, staffBId, adminAId])).run();
    await db.delete(attendanceLocations).where(eq(attendanceLocations.id, locAId)).run();
    await db.delete(staffDepartments).where(eq(staffDepartments.departmentId, deptA)).run();
    await db.delete(departments).where(eq(departments.id, deptA)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.institutionId, [instA, instB])).run();
    await db.delete(staff).where(inArray(staff.id, [adminAId, staffAId, staffBId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across Mutating Endpoints", () => {
    it("POST /api/attendance/check-in returns 400 on malformed JSON", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_payload",
      });
      const res = await checkIn(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("POST /api/attendance/check-out returns 400 on malformed JSON body", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_json",
      });
      const res = await checkOut(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("POST /api/attendance/presence-log returns 400 on malformed JSON", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/presence-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad_json",
      });
      const res = await postPresenceLog(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Coordinate & Payload Bounds Validation", () => {
    it("rejects latitude greater than 90", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "nfc",
          nfcTagId: nfcTagA,
          latitude: 91.5,
          longitude: 77.59,
        }),
      });
      const res = await checkIn(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Latitude must be between -90 and 90/i);
    });

    it("rejects longitude less than -180", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "nfc",
          nfcTagId: nfcTagA,
          latitude: 12.97,
          longitude: -181.2,
        }),
      });
      const res = await checkIn(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Longitude must be between -180 and 180/i);
    });

    it("rejects negative accuracy", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "nfc",
          nfcTagId: nfcTagA,
          latitude: 12.97,
          longitude: 77.59,
          accuracy: -10,
        }),
      });
      const res = await checkIn(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Accuracy cannot be negative/i);
    });
  });

  describe("3. Check-In Lifecycle, Debounce & Check-Out State Machine", () => {
    it("successfully checks in Staff A via NFC", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "nfc",
          nfcTagId: nfcTagA,
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 10,
        }),
      });
      const res = await checkIn(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.log.staffId).toBe(staffAId);
      expect(data.log.checkIn).toBeTruthy();
    });

    it("idempotently returns 200 with duplicate: true on immediate second check-in (Debounce)", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "nfc",
          nfcTagId: nfcTagA,
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 10,
        }),
      });
      const res = await checkIn(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.duplicate).toBe(true);
      expect(data.log.staffId).toBe(staffAId);
    });

    it("rejects check-out for Staff B who never checked in today", async () => {
      asUser("staff", staffBId, instB);
      const req = new Request("http://localhost/api/attendance/check-out", {
        method: "POST",
      });
      const res = await checkOut(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/No check-in found for today/i);
    });

    it("successfully checks out Staff A", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 12.9716,
          longitude: 77.5946,
          batteryLevel: 90,
        }),
      });
      const res = await checkOut(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.log.checkOut).toBeTruthy();
    });

    it("rejects repeat check-out with 409 Conflict", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/check-out", {
        method: "POST",
      });
      const res = await checkOut(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/Already checked out today/i);
    });
  });

  describe("4. Attendance Logs Queries, Scoping & Pagination", () => {
    it("Staff query to /api/attendance/my returns own logs and todayLog", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/my");
      const res = await getMyLogs(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.todayLog).toBeTruthy();
      expect(data.todayLog.staffId).toBe(staffAId);
    });

    it("Staff query to /api/attendance/today returns today active log", async () => {
      asUser("staff", staffAId, instA);
      const req = new Request("http://localhost/api/attendance/today");
      const res = await getTodayLog(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.log).toBeTruthy();
      expect(data.log.staffId).toBe(staffAId);
    });

    it("Admin of Institution A can only see logs of Institution A staff (Tenant Scoping)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/attendance/logs");
      const res = await getLogs(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
      // All logs must belong to Institution A staff
      for (const log of data.logs) {
        expect(log.staffId).not.toBe(staffBId);
      }
    });

    it("Clamps excessive limit parameter to 100", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/attendance/logs?limit=500");
      const res = await getLogs(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.limit).toBe(100);
    });
  });
});
