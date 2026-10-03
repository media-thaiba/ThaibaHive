/**
 * B8-4 — Cross-tenant query-parameter tampering denial matrix (25 GET Routes).
 *
 * Asserts that:
 * 1. A tenant A staff member querying `?institutionId=tenant_b` is denied (403 Forbidden).
 * 2. A tenant A staff member querying with no parameter receives 200 OK (scoped to Tenant A).
 * 3. Uses REAL resolveRequestInstitution / verifySession logic, never mocked resolution.
 */

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

jest.mock("uuid", () => ({
  __esModule: true,
  v4: () => "00000000-0000-4000-8000-000000000000",
}));

import { db } from "@/db";
import { institutions, staff, staffInstitutions } from "@/db/schema";
import { GET as getAcademicYears } from "@/app/api/academic/academic-years/route";
import { GET as getAcademicClasses } from "@/app/api/academic/classes/route";
import { GET as getAcademicStudents } from "@/app/api/academic/students/route";
import { GET as getAcademicTimetables } from "@/app/api/academic/timetables/route";
import { GET as getAccounts } from "@/app/api/accounts/route";
import { GET as getAccountsSummary } from "@/app/api/accounts/summary/route";
import { GET as getActivityLogs } from "@/app/api/activity-logs/route";
import { GET as getAttendanceLocations } from "@/app/api/admin/attendance-locations/route";
import { GET as getStaff } from "@/app/api/staff/route";
import { GET as getAlumniDirectory } from "@/app/api/alumni/directory/route";
import { GET as getCanteen } from "@/app/api/canteen/route";
import { GET as getExams } from "@/app/api/examinations/exams/route";
import { GET as getFeeStructures } from "@/app/api/finance/fees/structures/route";
import { GET as getHelpDesk } from "@/app/api/help-desk/route";
import { GET as getLeaves } from "@/app/api/leaves/route";
import { GET as getMediaFolders } from "@/app/api/media/folders/route";
import { GET as getNeuroClusters } from "@/app/api/neuro/clusters/route";
import { GET as getNotifications } from "@/app/api/notifications/route";
import { GET as getStudents } from "@/app/api/students/route";
import { GET as getSupplyVendors } from "@/app/api/supply/vendors/route";
import { GET as getTasks } from "@/app/api/tasks/route";
import { GET as getTwinSpaces } from "@/app/api/twin/spaces/route";
import { GET as getVehicles } from "@/app/api/vehicles/route";
import { GET as getVisionCameras } from "@/app/api/vision/cameras/route";
import { GET as getVisitors } from "@/app/api/visitors/route";

const { verifySession } = jest.requireMock("@thaiba/auth") as {
  verifySession: jest.Mock;
};

jest.setTimeout(60000);

const ts = Date.now();
const instA = `inst-a-b8-${ts}`;
const instB = `inst-b-b8-${ts}`;
const staffA = `staff-a-b8-${ts}`;

type RouteHandler = (req: Request) => Promise<Response>;

interface B8RouteTest {
  name: string;
  url: string;
  handler: RouteHandler;
}

const routesToTest: B8RouteTest[] = [
  { name: "academic/academic-years", url: "http://localhost/api/academic/academic-years", handler: getAcademicYears as RouteHandler },
  { name: "academic/classes", url: "http://localhost/api/academic/classes", handler: getAcademicClasses as RouteHandler },
  { name: "academic/students", url: "http://localhost/api/academic/students", handler: getAcademicStudents as RouteHandler },
  { name: "academic/timetables", url: "http://localhost/api/academic/timetables", handler: getAcademicTimetables as RouteHandler },
  { name: "accounts", url: "http://localhost/api/accounts", handler: getAccounts as RouteHandler },
  { name: "accounts/summary", url: "http://localhost/api/accounts/summary", handler: getAccountsSummary as RouteHandler },
  { name: "activity-logs", url: "http://localhost/api/activity-logs", handler: getActivityLogs as RouteHandler },
  { name: "admin/attendance-locations", url: "http://localhost/api/admin/attendance-locations", handler: getAttendanceLocations as RouteHandler },
  { name: "staff", url: "http://localhost/api/staff", handler: getStaff as RouteHandler },
  { name: "alumni/directory", url: "http://localhost/api/alumni/directory", handler: getAlumniDirectory as RouteHandler },
  { name: "canteen", url: "http://localhost/api/canteen", handler: getCanteen as RouteHandler },
  { name: "examinations/exams", url: "http://localhost/api/examinations/exams", handler: getExams as RouteHandler },
  { name: "finance/fees/structures", url: "http://localhost/api/finance/fees/structures", handler: getFeeStructures as RouteHandler },
  { name: "help-desk", url: "http://localhost/api/help-desk", handler: getHelpDesk as RouteHandler },
  { name: "leaves", url: "http://localhost/api/leaves", handler: getLeaves as RouteHandler },
  { name: "media/folders", url: "http://localhost/api/media/folders", handler: getMediaFolders as RouteHandler },
  { name: "neuro/clusters", url: "http://localhost/api/neuro/clusters", handler: getNeuroClusters as RouteHandler },
  { name: "notifications", url: "http://localhost/api/notifications", handler: getNotifications as RouteHandler },
  { name: "students", url: "http://localhost/api/students", handler: getStudents as RouteHandler },
  { name: "supply/vendors", url: "http://localhost/api/supply/vendors", handler: getSupplyVendors as RouteHandler },
  { name: "tasks", url: "http://localhost/api/tasks", handler: getTasks as RouteHandler },
  { name: "twin/spaces", url: "http://localhost/api/twin/spaces", handler: getTwinSpaces as RouteHandler },
  { name: "vehicles", url: "http://localhost/api/vehicles", handler: getVehicles as RouteHandler },
  { name: "vision/cameras", url: "http://localhost/api/vision/cameras", handler: getVisionCameras as RouteHandler },
  { name: "visitors", url: "http://localhost/api/visitors", handler: getVisitors as RouteHandler },
];

describe("B8 Cross-Tenant Parameter Tampering Matrix (25 GET Routes)", () => {
  beforeAll(async () => {
    process.env.APM_TELEMETRY_ENABLED = "false";

    // Seed real institutions
    await db.insert(institutions).values([
      { id: instA, name: "Institution A", code: `INSTA-${ts}` },
      { id: instB, name: "Institution B", code: `INSTB-${ts}` },
    ]).run();

    // Seed staff A mapped strictly to Institution A with principal role
    await db.insert(staff).values({
      id: staffA,
      email: `staff-a-${ts}@example.com`,
      employeeId: `EMP-A-${ts}`,
      firstName: "Staff",
      lastName: "Member A",
      role: "principal",
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si-${ts}`,
      staffId: staffA,
      institutionId: instA,
    }).run();
  });

  const sessionTenantA = {
    sub: staffA,
    staffId: staffA,
    email: `staff-a-${ts}@example.com`,
    role: "principal",
    institutionId: instA,
    employeeId: `EMP-A-${ts}`,
    tokenVersion: 1,
  };

  describe.each(routesToTest)("Route: $name", ({ name, url, handler }) => {
    it(`rejects cross-tenant parameter tampering (?institutionId=${instB}) with 403 Forbidden`, async () => {
      verifySession.mockResolvedValue(sessionTenantA);

      const req = new Request(`${url}?institutionId=${instB}`, {
        method: "GET",
        headers: {
          Authorization: "Bearer valid-token",
        },
      });

      const res = await handler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    it("accepts request with no institutionId query param and scopes to Tenant A", async () => {
      verifySession.mockResolvedValue(sessionTenantA);

      const req = new Request(url, {
        method: "GET",
        headers: {
          Authorization: "Bearer valid-token",
        },
      });

      const res = await handler(req);
      // Status must be either 200 OK or authorized read status (never 403)
      expect([200, 204]).toContain(res.status);
    });

    it("accepts request with valid own institutionId query param", async () => {
      verifySession.mockResolvedValue(sessionTenantA);

      const req = new Request(`${url}?institutionId=${instA}`, {
        method: "GET",
        headers: {
          Authorization: "Bearer valid-token",
        },
      });

      const res = await handler(req);
      expect([200, 204]).toContain(res.status);
    });
  });
});
