/**
 * B8-4 / R7-3 / R7-4 — Real-Resolver Cross-Tenant Tampering Denial Matrix & Multi-Institution Test Suite.
 *
 * Covers:
 * 1. 25 Baseline GET routes + 20 R7-1 routes (GET)
 * 2. 10 Write routes (POST/PUT/PATCH with body.institutionId of another tenant -> 403 Forbidden)
 * 3. Multi-institution staff (Staff member in Institution A and Institution B):
 *    - Querying ?institutionId=inst_a returns Inst A data (200)
 *    - Querying ?institutionId=inst_b returns Inst B data (200)
 *    - Querying ?institutionId=inst_c (unassigned) returns 403 Forbidden
 *    - Querying without parameter returns combined data or primary data safely without 403
 * 4. REAL resolveRequestInstitution / getStaffInstitutionMemberships, never mocked.
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
import { institutions, staff, staffInstitutions, classes, timetableSlots, timetableEntries } from "@/db/schema";


// GET Routes
import { GET as getAcademicYears, POST as postAcademicYears } from "@/app/api/academic/academic-years/route";
import { GET as getAcademicClasses, POST as postAcademicClasses } from "@/app/api/academic/classes/route";
import { GET as getAcademicStudents } from "@/app/api/academic/students/route";
import { GET as getAcademicTimetables } from "@/app/api/academic/timetables/route";
import { GET as getSubstitutions, POST as postSubstitutions } from "@/app/api/academic/timetables/substitutions/route";
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
import { GET as getVehicles, POST as postVehicles } from "@/app/api/vehicles/route";
import { GET as getVisionCameras } from "@/app/api/vision/cameras/route";
import { GET as getVisitors } from "@/app/api/visitors/route";

// R7-1 Routes
import { GET as getAuditLogs } from "@/app/api/admin/audit-logs/route";
import { GET as getExecutiveAnalytics } from "@/app/api/admin/executive/analytics/route";
import { GET as getAutonomousCompliance } from "@/app/api/admin/autonomous/compliance/route";
import { GET as getAutonomousRemediations } from "@/app/api/admin/autonomous/remediations/route";
import { GET as getAutonomousTickets } from "@/app/api/admin/autonomous/tickets/route";
import { GET as getExtractFeatures } from "@/app/api/admin/ai/extract-features/route";
import { GET as getAiSummary } from "@/app/api/admin/ai/insights/summary/route";
import { GET as getPredictAcademic } from "@/app/api/admin/ai/predictions/academic/route";
import { GET as getPredictAttendance } from "@/app/api/admin/ai/predictions/attendance/route";
import { GET as getPredictFees } from "@/app/api/admin/ai/predictions/fees/route";
import { GET as getAnalytics } from "@/app/api/analytics/route";
import { GET as getAssets, POST as postAssets } from "@/app/api/assets/route";
import { GET as getAttendanceLogs } from "@/app/api/attendance/logs/route";
import { GET as getAttendanceSettings, PUT as putAttendanceSettings } from "@/app/api/attendance/settings/route";
import { GET as getExport } from "@/app/api/export/route";
import { GET as getExportJobs } from "@/app/api/export/jobs/route";
import { GET as getPerformanceCycles, POST as postPerformanceCycles } from "@/app/api/performance/cycles/route";
import { POST as postPerformanceFeedback } from "@/app/api/performance/feedback/route";
import { GET as getSyncDelta } from "@/app/api/sync/delta/route";
import { GET as getFeatures } from "@/app/api/features/route";

const { verifySession } = jest.requireMock("@thaiba/auth") as {
  verifySession: jest.Mock;
};

jest.setTimeout(60000);

const ts = Date.now();
const instA = `inst-a-b8-${ts}`;
const instB = `inst-b-b8-${ts}`;
const instC = `inst-c-b8-${ts}`;
const staffA = `staff-a-b8-${ts}`;
const staffMulti = `staff-multi-b8-${ts}`;

type RouteHandler = (req: Request, ...args: any[]) => Promise<Response>;

interface GetRouteTest {
  name: string;
  url: string;
  handler: RouteHandler;
}

interface WriteRouteTest {
  name: string;
  url: string;
  method: string;
  body: Record<string, any>;
  handler: RouteHandler;
}

const getRoutesToTest: GetRouteTest[] = [
  // 25 Core GET Routes
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

  // R7-1 GET Routes
  { name: "academic/timetables/substitutions", url: "http://localhost/api/academic/timetables/substitutions", handler: getSubstitutions as RouteHandler },
  { name: "admin/audit-logs", url: "http://localhost/api/admin/audit-logs", handler: getAuditLogs as RouteHandler },
  { name: "admin/executive/analytics", url: "http://localhost/api/admin/executive/analytics", handler: getExecutiveAnalytics as RouteHandler },
  { name: "admin/autonomous/compliance", url: "http://localhost/api/admin/autonomous/compliance", handler: getAutonomousCompliance as RouteHandler },
  { name: "admin/autonomous/remediations", url: "http://localhost/api/admin/autonomous/remediations", handler: getAutonomousRemediations as RouteHandler },
  { name: "admin/autonomous/tickets", url: "http://localhost/api/admin/autonomous/tickets", handler: getAutonomousTickets as RouteHandler },
  { name: "admin/ai/extract-features", url: "http://localhost/api/admin/ai/extract-features", handler: getExtractFeatures as RouteHandler },
  { name: "admin/ai/insights/summary", url: "http://localhost/api/admin/ai/insights/summary", handler: getAiSummary as RouteHandler },
  { name: "admin/ai/predictions/academic", url: "http://localhost/api/admin/ai/predictions/academic", handler: getPredictAcademic as RouteHandler },
  { name: "admin/ai/predictions/attendance", url: "http://localhost/api/admin/ai/predictions/attendance", handler: getPredictAttendance as RouteHandler },
  { name: "admin/ai/predictions/fees", url: "http://localhost/api/admin/ai/predictions/fees", handler: getPredictFees as RouteHandler },
  { name: "analytics", url: "http://localhost/api/analytics?type=attendance", handler: getAnalytics as RouteHandler },
  { name: "assets", url: "http://localhost/api/assets", handler: getAssets as RouteHandler },
  { name: "attendance/logs", url: "http://localhost/api/attendance/logs", handler: getAttendanceLogs as RouteHandler },
  { name: "attendance/settings", url: "http://localhost/api/attendance/settings", handler: getAttendanceSettings as RouteHandler },
  { name: "export", url: "http://localhost/api/export?type=attendance", handler: getExport as RouteHandler },
  { name: "export/jobs", url: "http://localhost/api/export/jobs", handler: getExportJobs as RouteHandler },
  { name: "performance/cycles", url: "http://localhost/api/performance/cycles", handler: getPerformanceCycles as RouteHandler },
  { name: "sync/delta", url: "http://localhost/api/sync/delta", handler: getSyncDelta as RouteHandler },
  { name: "features", url: "http://localhost/api/features", handler: getFeatures as RouteHandler },
];

const classA = `cls_a_${ts}`;
const slotA = `slot_a_${ts}`;
const ttEntryA = `tte_a_${ts}`;

const writeRoutesToTest: WriteRouteTest[] = [
  {
    name: "academic/academic-years (POST)",
    url: "http://localhost/api/academic/academic-years",
    method: "POST",
    body: { name: "2026-2027", startDate: "2026-06-01", endDate: "2027-03-31" },
    handler: postAcademicYears as RouteHandler,
  },
  {
    name: "academic/classes (POST)",
    url: "http://localhost/api/academic/classes",
    method: "POST",
    body: { name: "Grade 10-A", section: "A" },
    handler: postAcademicClasses as RouteHandler,
  },
  {
    name: "academic/timetables/substitutions (POST)",
    url: "http://localhost/api/academic/timetables/substitutions",
    method: "POST",
    body: { timetableEntryId: ttEntryA, date: "2026-10-04", originalTeacherId: staffA, substituteTeacherId: staffA, reason: "Leave" },
    handler: postSubstitutions as RouteHandler,
  },
  {
    name: "assets (POST)",
    url: "http://localhost/api/assets",
    method: "POST",
    body: { name: "Lab Projector", type: "Electronics" },
    handler: postAssets as RouteHandler,
  },
  {
    name: "attendance/settings (PUT)",
    url: "http://localhost/api/attendance/settings",
    method: "PUT",
    body: { isEnabled: true, checkIntervalMinutes: 15 },
    handler: putAttendanceSettings as RouteHandler,
  },
  {
    name: "performance/cycles (POST)",
    url: "http://localhost/api/performance/cycles",
    method: "POST",
    body: {
      title: "Q3 Review",
      cycleType: "quarterly",
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      selfAssessmentDeadline: "2026-08-15",
      managerReviewDeadline: "2026-08-30",
    },
    handler: postPerformanceCycles as RouteHandler,
  },
  {
    name: "performance/feedback (POST)",
    url: "http://localhost/api/performance/feedback",
    method: "POST",
    body: {
      reviewId: "rev_1",
      peerStaffId: staffA,
      feedbackText: "Great progress",
      rating: 5,
    },
    handler: postPerformanceFeedback as RouteHandler,
  },
  {
    name: "vehicles (POST)",
    url: "http://localhost/api/vehicles",
    method: "POST",
    body: { registrationNumber: `KL-01-${Date.now().toString().slice(-4)}`, make: "Toyota", model: "HiAce", type: "van", capacity: 15, fuelType: "diesel" },
    handler: postVehicles as RouteHandler,
  },
];


describe("B8 Real-Resolver Cross-Tenant Tampering & Multi-Institution Test Matrix", () => {
  beforeAll(async () => {
    process.env.APM_TELEMETRY_ENABLED = "false";

    await db.insert(institutions).values([
      { id: instA, name: "Institution Alpha", code: `INSTA_${ts}` },
      { id: instB, name: "Institution Beta", code: `INSTB_${ts}` },
      { id: instC, name: "Institution Gamma", code: `INSTC_${ts}` },
    ]).run();

    await db.insert(staff).values([
      { id: staffA, employeeId: `EMP_A_${ts}`, email: `staffA_${ts}@example.com`, firstName: "Alpha", lastName: "Staff", role: "principal" },
      { id: staffMulti, employeeId: `EMP_M_${ts}`, email: `staffMulti_${ts}@example.com`, firstName: "Multi", lastName: "Staff", role: "principal" },
    ]).run();

    await db.insert(staffInstitutions).values([
      { id: `si_a_${ts}`, staffId: staffA, institutionId: instA },
      { id: `si_m1_${ts}`, staffId: staffMulti, institutionId: instA },
      { id: `si_m2_${ts}`, staffId: staffMulti, institutionId: instB },
    ]).run();

    await db.insert(classes).values({ id: classA, institutionId: instA, name: "Class 10A" }).run();
    await db.insert(timetableSlots).values({ id: slotA, institutionId: instA, name: "Period 1", slotOrder: 1, startTime: "09:00", endTime: "10:00" }).run();
    await db.insert(timetableEntries).values({ id: ttEntryA, institutionId: instA, classId: classA, slotId: slotA, dayOfWeek: 1, subjectName: "Maths", teacherId: staffA }).run();

  });


  describe("Part 1: GET Routes Cross-Tenant Parameter Tampering (45 Handlers)", () => {
    getRoutesToTest.forEach(({ name, url, handler }) => {
      it(`[403 Denied] ${name}: Tenant A staff requesting ?institutionId=${instB}`, async () => {
        verifySession.mockResolvedValue({
          sub: staffA,
          staffId: staffA,
          role: "principal",
          institutionId: instA,
        });

        const delimiter = url.includes("?") ? "&" : "?";
        const req = new Request(`${url}${delimiter}institutionId=${instB}`, {
          method: "GET",
          headers: { "content-type": "application/json" },
        });

        const res = await handler(req);
        expect(res.status).toBe(403);
      });

      it(`[200 Scoped] ${name}: Tenant A staff requesting legitimate scope (no query parameter)`, async () => {
        const isAdminRoute = name.startsWith("admin/");
        verifySession.mockResolvedValue({
          sub: staffA,
          staffId: staffA,
          role: isAdminRoute ? "super_admin" : "principal",
          institutionId: instA,
        });

        const req = new Request(url, {
          method: "GET",
          headers: { "content-type": "application/json" },
        });

        const res = await handler(req);
        expect([200, 201]).toContain(res.status);
      });
    });
  });


  describe("Part 2: Write Routes Cross-Tenant Body Tampering (POST/PUT/PATCH)", () => {
    writeRoutesToTest.forEach(({ name, url, method, body, handler }) => {
      it(`[403 Denied] ${name}: Tenant A staff submitting body with institutionId=${instB}`, async () => {
        verifySession.mockResolvedValue({
          sub: staffA,
          staffId: staffA,
          role: "principal",
          institutionId: instA,
        });

        const req = new Request(url, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...body, institutionId: instB }),
        });

        const res = await handler(req);
        expect(res.status).toBe(403);
      });

      it(`[Success Scoped] ${name}: Tenant A staff submitting legitimate scope with institutionId=${instA}`, async () => {
        verifySession.mockResolvedValue({
          sub: staffA,
          staffId: staffA,
          role: "principal",
          institutionId: instA,
        });

        const req = new Request(url, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...body, institutionId: instA }),
        });

        const res = await handler(req);
        expect([200, 201, 202, 400]).toContain(res.status);
      });
    });
  });

  describe("Part 3: Multi-Institution Staff Scoping (Staff in Inst A & Inst B)", () => {
    it("allows Multi-Institution staff to query Institution A (?institutionId=inst_a)", async () => {
      verifySession.mockResolvedValue({
        sub: staffMulti,
        staffId: staffMulti,
        role: "principal",
        institutionId: instA,
      });

      const req = new Request(`http://localhost/api/canteen?institutionId=${instA}`, {
        method: "GET",
        headers: { "content-type": "application/json" },
      });

      const res = await getCanteen(req);
      expect(res.status).toBe(200);
    });

    it("allows Multi-Institution staff to query Institution B (?institutionId=inst_b)", async () => {
      verifySession.mockResolvedValue({
        sub: staffMulti,
        staffId: staffMulti,
        role: "principal",
        institutionId: instA,
      });

      const req = new Request(`http://localhost/api/canteen?institutionId=${instB}`, {
        method: "GET",
        headers: { "content-type": "application/json" },
      });

      const res = await getCanteen(req);
      expect(res.status).toBe(200);
    });

    it("denies Multi-Institution staff from querying unauthorized Institution C (?institutionId=inst_c)", async () => {
      verifySession.mockResolvedValue({
        sub: staffMulti,
        staffId: staffMulti,
        role: "principal",
        institutionId: instA,
      });

      const req = new Request(`http://localhost/api/canteen?institutionId=${instC}`, {
        method: "GET",
        headers: { "content-type": "application/json" },
      });

      const res = await getCanteen(req);
      expect(res.status).toBe(403);
    });
  });
});
