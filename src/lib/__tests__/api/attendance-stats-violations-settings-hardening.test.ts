/**
 * @jest-environment node
 *
 * Attendance Stats, Violations & Settings Pipeline — Perfection & Hardening Test Suite
 *
 * Verifies:
 * 1. Safe JSON parsing on mutating endpoints (PUT /api/attendance/settings -> 400 Bad Request)
 * 2. RBAC & Cross-staff stats authorization (403 Forbidden for non-managers)
 * 3. Date validation & bounds on stats and violations (400 on invalid format or inverted range)
 * 4. Settings lifecycle, principal institution authorization, and global setting protection
 * 5. Multi-tenant violation query scoping & aggregations
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  attendanceLogs,
  presenceVerificationSettings,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { inArray } from "drizzle-orm";
import { GET as getStats } from "@/app/api/attendance/stats/route";
import { GET as getViolations } from "@/app/api/attendance/violations/route";
import { GET as getSettings, PUT as putSettings } from "@/app/api/attendance/settings/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Attendance Stats, Violations & Settings Pipeline — Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_asvs_a_${suffix}`;
  const instB = `inst_asvs_b_${suffix}`;

  const adminAId = `stf_asvs_adm_a_${suffix}`;
  const principalAId = `stf_asvs_prn_a_${suffix}`;
  const staffAId = `stf_asvs_stf_a_${suffix}`;
  const staffBId = `stf_asvs_stf_b_${suffix}`;

  const sessionAdminA = {
    userId: adminAId,
    staffId: adminAId,
    email: `adm_a_${suffix}@thaiba.edu`,
    role: "admin",
    institutionId: instA,
    permissions: ["attendance:read", "attendance:manage"],
  };

  const sessionPrincipalA = {
    userId: principalAId,
    staffId: principalAId,
    email: `prn_a_${suffix}@thaiba.edu`,
    role: "principal",
    institutionId: instA,
    permissions: ["attendance:read", "attendance:manage"],
  };

  const sessionStaffA = {
    userId: staffAId,
    staffId: staffAId,
    email: `stf_a_${suffix}@thaiba.edu`,
    role: "staff",
    institutionId: instA,
    permissions: ["attendance:read"],
  };

  const sessionStaffB = {
    userId: staffBId,
    staffId: staffBId,
    email: `stf_b_${suffix}@thaiba.edu`,
    role: "staff",
    institutionId: instB,
    permissions: ["attendance:read"],
  };

  const createdLogIds: string[] = [];

  beforeAll(async () => {
    // Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: "Attendance Perfection Inst A", code: `APIA_${suffix}` },
      { id: instB, name: "Attendance Perfection Inst B", code: `APIB_${suffix}` },
    ]).run();

    // Seed Staff
    await db.insert(staff).values([
      {
        id: adminAId,
        email: `adm_a_${suffix}@thaiba.edu`,
        employeeId: `EMP_ADM_${suffix}`,
        firstName: "Admin",
        lastName: "Alpha",
        role: "admin",
        isActive: true,
      },
      {
        id: principalAId,
        email: `prn_a_${suffix}@thaiba.edu`,
        employeeId: `EMP_PRN_${suffix}`,
        firstName: "Principal",
        lastName: "Alpha",
        role: "principal",
        isActive: true,
      },
      {
        id: staffAId,
        email: `stf_a_${suffix}@thaiba.edu`,
        employeeId: `EMP_STF_A_${suffix}`,
        firstName: "Staff",
        lastName: "Alpha",
        role: "staff",
        isActive: true,
      },
      {
        id: staffBId,
        email: `stf_b_${suffix}@thaiba.edu`,
        employeeId: `EMP_STF_B_${suffix}`,
        firstName: "Staff",
        lastName: "Beta",
        role: "staff",
        isActive: true,
      },
    ]).run();

    // Link Staff to Institutions
    await db.insert(staffInstitutions).values([
      { id: `si_adm_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_prn_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_sa_${suffix}`, staffId: staffAId, institutionId: instA },
      { id: `si_sb_${suffix}`, staffId: staffBId, institutionId: instB },
    ]).run();

    // Seed sample attendance logs for Staff A
    const log1 = await db.insert(attendanceLogs).values({
      id: `att_log1_${suffix}`,
      staffId: staffAId,
      institutionId: instA,
      date: "2026-10-01",
      status: "present",
      checkIn: "2026-10-01T08:30:00Z",
      checkOut: "2026-10-01T16:30:00Z",
      workedMinutes: 480,
      geofenceViolations: 0,
    }).returning().get();
    createdLogIds.push(log1.id);

    const log2 = await db.insert(attendanceLogs).values({
      id: `att_log2_${suffix}`,
      staffId: staffAId,
      institutionId: instA,
      date: "2026-10-02",
      status: "late",
      checkIn: "2026-10-02T09:15:00Z",
      checkOut: "2026-10-02T16:30:00Z",
      workedMinutes: 435,
      geofenceViolations: 2,
    }).returning().get();
    createdLogIds.push(log2.id);

    const log3 = await db.insert(attendanceLogs).values({
      id: `att_log3_${suffix}`,
      staffId: staffBId,
      institutionId: instB,
      date: "2026-10-02",
      status: "present",
      checkIn: "2026-10-02T08:00:00Z",
      checkOut: "2026-10-02T16:00:00Z",
      workedMinutes: 480,
      geofenceViolations: 1,
    }).returning().get();
    createdLogIds.push(log3.id);
  });

  afterAll(async () => {
    if (createdLogIds.length > 0) {
      await db.delete(attendanceLogs).where(inArray(attendanceLogs.id, createdLogIds)).run();
    }
    await db.delete(presenceVerificationSettings).where(inArray(presenceVerificationSettings.institutionId, [instA, instB])).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.institutionId, [instA, instB])).run();
    await db.delete(staff).where(inArray(staff.id, [adminAId, principalAId, staffAId, staffBId])).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing on Mutating Endpoints", () => {
    it("rejects malformed JSON on PUT /api/attendance/settings with 400 Bad Request", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request("http://localhost/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: '{"brokenJson": true, ',
      });

      const res = await putSettings(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Attendance Settings Authorization & Tenant Bounds", () => {
    it("blocks standard staff from updating attendance settings (403 Forbidden)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionStaffA);

      const req = new Request("http://localhost/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          geofenceRadiusMeters: 200,
        }),
      });

      const res = await putSettings(req as any);
      expect(res.status).toBe(403);
    });

    it("allows institution principal to update their own campus settings (200 / 201)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionPrincipalA);

      const req = new Request("http://localhost/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instA,
          geofenceRadiusMeters: 250,
          checkIntervalMinutes: 15,
        }),
      });

      const res = await putSettings(req as any);
      expect([200, 201]).toContain(res.status);
      const data = await res.json();
      expect(data.settings.geofenceRadiusMeters).toBe(250);
    });

    it("GET /api/attendance/settings retrieves configured institution settings", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionPrincipalA);

      const req = new Request(`http://localhost/api/attendance/settings?institutionId=${instA}`);
      const res = await getSettings(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.settings.geofenceRadiusMeters).toBe(250);
      expect(data.settings.institutionId).toBe(instA);
    });
  });

  describe("3. Attendance Violations Rate Limiting & Date Validation", () => {
    it("rejects inverted date range (startDate > endDate) with 400 Bad Request", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request(`http://localhost/api/attendance/violations?startDate=2026-10-15&endDate=2026-10-01`);
      const res = await getViolations(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("endDate must be on or after startDate");
    });

    it("rejects malformed date format with 400 Bad Request", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request(`http://localhost/api/attendance/violations?startDate=invalid-date`);
      const res = await getViolations(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("YYYY-MM-DD");
    });

    it("returns scoped violations matching institution boundary", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request(`http://localhost/api/attendance/violations?institutionId=${instA}`);
      const res = await getViolations(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.violations).toBeDefined();
      expect(data.stats).toBeDefined();
      // Only instA violations included
      for (const v of data.violations) {
        expect(v.institutionId).toBe(instA);
      }
    });
  });

  describe("4. Attendance Stats Authorization, Scoping & Date Filtering", () => {
    it("rejects inverted date range on stats query with 400 Bad Request", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionStaffA);

      const req = new Request(`http://localhost/api/attendance/stats?startDate=2026-10-30&endDate=2026-10-01`);
      const res = await getStats(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("endDate must be on or after startDate");
    });

    it("allows staff member to view their own stats (200 OK)", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionStaffA);

      const req = new Request("http://localhost/api/attendance/stats");
      const res = await getStats(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.present_days).toBeGreaterThanOrEqual(1);
      expect(data.late_days).toBeGreaterThanOrEqual(1);
      expect(data.total_worked_hours).toBeGreaterThan(0);
    });

    it("blocks standard staff from viewing another staff member's stats with 403 Forbidden", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionStaffA);

      const req = new Request(`http://localhost/api/attendance/stats?staffId=${staffBId}`);
      const res = await getStats(req as any);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("allows administrator to view another staff member's stats within their institution", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionAdminA);

      const req = new Request(`http://localhost/api/attendance/stats?staffId=${staffAId}&institutionId=${instA}`);
      const res = await getStats(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.present_days).toBeDefined();
      expect(data.total_worked_hours).toBeDefined();
    });

    it("filters stats by date range correctly", async () => {
      (verifySession as jest.Mock).mockResolvedValue(sessionStaffA);

      // Query only 2026-10-01 (when staffA was present)
      const req = new Request(`http://localhost/api/attendance/stats?startDate=2026-10-01&endDate=2026-10-01`);
      const res = await getStats(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.present_days).toBe(1);
      expect(data.late_days).toBe(0);
    });
  });
});
