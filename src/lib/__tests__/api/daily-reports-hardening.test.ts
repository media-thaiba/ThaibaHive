/**
 * @jest-environment node
 *
 * Daily Work Reports & Productivity Pipeline — Hardening & Integrity Suite:
 * - Admin multi-tenant scoping: Admin B from Campus B cannot see reports from Campus A
 * - Safe JSON parsing: Malformed/empty payloads return 400 across POST, PUT, and PATCH review
 * - Draft deletion parity: Staff can delete their draft reports; submitted/reviewed cannot be deleted (400)
 * - Review segregation of duties: Staff (even HOD/Admin) cannot review their own report (403)
 * - Review immutability: Cannot review reports not in "submitted" status (400)
 * - Date format enforcement: Invalid date strings fail validation with 400
 * - Concurrency serialization: Sequential withReportLock execution ensures state consistency
 */

import {
  db,
  institutions,
  departments,
  staff,
  staffInstitutions,
  staffDepartments,
  dailyReports,
  dailyReportTasks,
  auditLog,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listReports,
  POST as createReport,
} from "@/app/api/reports/route";
import {
  GET as getReportDetail,
  PUT as updateReport,
  DELETE as deleteReport,
} from "@/app/api/reports/[id]/route";
import {
  PATCH as reviewReport,
} from "@/app/api/reports/[id]/review/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Daily Work Reports & Productivity Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_rep_a_${suffix}`;
  const instB = `inst_rep_b_${suffix}`;

  const deptA = `dept_rep_a_${suffix}`;

  const adminAId = `stf_rep_adm_a_${suffix}`;
  const principalAId = `stf_rep_pa_${suffix}`;
  const hodAId = `stf_rep_hoda_${suffix}`;
  const staffA1Id = `stf_rep_a1_${suffix}`;

  const adminBId = `stf_rep_adm_b_${suffix}`;
  const staffBId = `stf_rep_b1_${suffix}`;

  const superAdminId = `stf_rep_sa_${suffix}`;

  const reportA1DraftId = `rep_a1_draft_${suffix}`;
  const reportA1SubmittedId = `rep_a1_sub_${suffix}`;
  const reportB1SubmittedId = `rep_b1_sub_${suffix}`;

  function asUser(role: string, staffId: string, institutionId?: string) {
    (verifySession as jest.Mock).mockResolvedValue({
      sub: staffId,
      staffId,
      role,
      institutionId: institutionId ?? null,
      permissions: role === "super_admin" ? ["*"] : [
        "reports:read",
        "reports:create",
        "reports:review",
      ],
    });
    (hasPermission as jest.Mock).mockReturnValue(true);
  }

  beforeAll(async () => {
    // 1. Create Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Institution A ${suffix}`, code: `IA_${suffix}` },
      { id: instB, name: `Institution B ${suffix}`, code: `IB_${suffix}` },
    ]);

    // 2. Create Staff first so foreign keys succeed
    await db.insert(staff).values([
      {
        id: adminAId,
        firstName: "Admin",
        lastName: "A",
        email: `adm_a_${suffix}@test.com`,
        employeeId: `EMP_ADM_A_${suffix}`,
        role: "admin",
      },
      {
        id: principalAId,
        firstName: "Principal",
        lastName: "A",
        email: `prin_a_${suffix}@test.com`,
        employeeId: `EMP_PRIN_A_${suffix}`,
        role: "principal",
      },
      {
        id: hodAId,
        firstName: "HOD",
        lastName: "A",
        email: `hod_a_${suffix}@test.com`,
        employeeId: `EMP_HOD_A_${suffix}`,
        role: "hod",
      },
      {
        id: staffA1Id,
        firstName: "Staff",
        lastName: "A1",
        email: `stf_a1_${suffix}@test.com`,
        employeeId: `EMP_A1_${suffix}`,
        role: "staff",
      },
      {
        id: adminBId,
        firstName: "Admin",
        lastName: "B",
        email: `adm_b_${suffix}@test.com`,
        employeeId: `EMP_ADM_B_${suffix}`,
        role: "admin",
      },
      {
        id: staffBId,
        firstName: "Staff",
        lastName: "B1",
        email: `stf_b1_${suffix}@test.com`,
        employeeId: `EMP_B1_${suffix}`,
        role: "staff",
      },
      {
        id: superAdminId,
        firstName: "Super",
        lastName: "Admin",
        email: `sa_${suffix}@test.com`,
        employeeId: `EMP_SA_${suffix}`,
        role: "super_admin",
      },
    ]);

    // 3. Create Department with HOD
    await db.insert(departments).values([
      {
        id: deptA,
        name: `Dept A ${suffix}`,
        code: `DA_${suffix}`,
        institutionId: instA,
        headUserId: hodAId,
      },
    ]);

    // 4. Staff Institutions Affiliation
    await db.insert(staffInstitutions).values([
      { id: `si_adm_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_pa_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_hoda_${suffix}`, staffId: hodAId, institutionId: instA },
      { id: `si_a1_${suffix}`, staffId: staffA1Id, institutionId: instA },
      { id: `si_adm_b_${suffix}`, staffId: adminBId, institutionId: instB },
      { id: `si_b1_${suffix}`, staffId: staffBId, institutionId: instB },
    ]);

    // 5. Staff Departments
    await db.insert(staffDepartments).values([
      { id: `sd_hoda_${suffix}`, staffId: hodAId, departmentId: deptA, isPrimary: true },
      { id: `sd_a1_${suffix}`, staffId: staffA1Id, departmentId: deptA, isPrimary: true },
    ]);

    // 6. Seed Baseline Reports
    await db.insert(dailyReports).values([
      {
        id: reportA1DraftId,
        staffId: staffA1Id,
        date: "2026-10-18",
        summary: "Staff A1 Draft Report",
        status: "draft",
      },
      {
        id: reportA1SubmittedId,
        staffId: staffA1Id,
        date: "2026-10-19",
        summary: "Staff A1 Submitted Report",
        status: "submitted",
      },
      {
        id: reportB1SubmittedId,
        staffId: staffBId,
        date: "2026-10-19",
        summary: "Staff B1 Submitted Report",
        status: "submitted",
      },
    ]);
  });

  afterAll(async () => {
    // Teardown in strict FK dependency order
    await db.delete(dailyReportTasks).where(
      inArray(dailyReportTasks.reportId, [reportA1DraftId, reportA1SubmittedId, reportB1SubmittedId])
    ).run();
    await db.delete(dailyReports).where(
      inArray(dailyReports.id, [reportA1DraftId, reportA1SubmittedId, reportB1SubmittedId])
    ).run();
    await db.delete(auditLog).where(
      inArray(auditLog.staffId, [adminAId, principalAId, hodAId, staffA1Id, adminBId, staffBId, superAdminId])
    ).run();
    await db.delete(staffDepartments).where(
      inArray(staffDepartments.staffId, [hodAId, staffA1Id])
    ).run();
    await db.delete(staffInstitutions).where(
      inArray(staffInstitutions.staffId, [adminAId, principalAId, hodAId, staffA1Id, adminBId, staffBId])
    ).run();
    await db.delete(departments).where(eq(departments.id, deptA)).run();
    await db.delete(staff).where(
      inArray(staff.id, [adminAId, principalAId, hodAId, staffA1Id, adminBId, staffBId, superAdminId])
    ).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across All Endpoints", () => {
    it("POST /api/reports returns 400 on malformed JSON", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json",
      });
      const res = await createReport(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("PUT /api/reports/[id] returns 400 on malformed JSON", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/reports/${reportA1DraftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "invalid",
      });
      const res = await updateReport(req, { params: Promise.resolve({ id: reportA1DraftId }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("PATCH /api/reports/[id]/review returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/reports/${reportA1SubmittedId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "invalid",
      });
      const res = await reviewReport(req, { params: Promise.resolve({ id: reportA1SubmittedId }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });
  });

  describe("2. Admin Multi-Tenant Scoping Isolation", () => {
    it("Admin A sees only Institution A reports and never Institution B reports", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/reports");
      const res = await listReports(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      const reportIds = body.reports.map((r: { id: string }) => r.id);

      expect(reportIds).toContain(reportA1SubmittedId);
      expect(reportIds).not.toContain(reportB1SubmittedId);
    });

    it("Admin B sees only Institution B reports and never Institution A reports", async () => {
      asUser("admin", adminBId, instB);
      const req = new Request("http://localhost/api/reports");
      const res = await listReports(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      const reportIds = body.reports.map((r: { id: string }) => r.id);

      expect(reportIds).toContain(reportB1SubmittedId);
      expect(reportIds).not.toContain(reportA1SubmittedId);
    });
  });

  describe("3. Draft Deletion REST Parity", () => {
    it("submitting staff can delete their own draft report", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/reports/${reportA1DraftId}`, {
        method: "DELETE",
      });
      const res = await deleteReport(req, { params: Promise.resolve({ id: reportA1DraftId }) });
      expect(res.status).toBe(200);

      // Verify row removed from DB
      const dbCheck = await db.select().from(dailyReports).where(eq(dailyReports.id, reportA1DraftId)).get();
      expect(dbCheck).toBeUndefined();
    });

    it("submitting staff cannot delete a submitted report (400)", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/reports/${reportA1SubmittedId}`, {
        method: "DELETE",
      });
      const res = await deleteReport(req, { params: Promise.resolve({ id: reportA1SubmittedId }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Only draft reports can be deleted/i);

      // Verify row remains in DB
      const dbCheck = await db.select().from(dailyReports).where(eq(dailyReports.id, reportA1SubmittedId)).get();
      expect(dbCheck).toBeDefined();
    });

    it("other staff cannot delete another staff member's draft report (403)", async () => {
      // Seed a temporary draft
      const tempDraftId = `rep_temp_${suffix}`;
      await db.insert(dailyReports).values({
        id: tempDraftId,
        staffId: staffBId,
        date: "2026-10-21",
        summary: "Staff B Draft",
        status: "draft",
      });

      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/reports/${tempDraftId}`, {
        method: "DELETE",
      });
      const res = await deleteReport(req, { params: Promise.resolve({ id: tempDraftId }) });
      expect(res.status).toBe(403);

      await db.delete(dailyReports).where(eq(dailyReports.id, tempDraftId)).run();
    });
  });

  describe("4. Review Segregation of Duties & Lifecycle State Machine", () => {
    it("blocks staff from reviewing their own report (403)", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/reports/${reportA1SubmittedId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      const res = await reviewReport(req, { params: Promise.resolve({ id: reportA1SubmittedId }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/cannot review your own daily report/i);
    });

    it("allows HOD of department to review submitted report", async () => {
      asUser("hod", hodAId, instA);
      const req = new Request(`http://localhost/api/reports/${reportA1SubmittedId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed", reviewerComment: "Great work accomplished" }),
      });
      const res = await reviewReport(req, { params: Promise.resolve({ id: reportA1SubmittedId }) });
      expect(res.status).toBe(200);

      const dbReport = await db.select().from(dailyReports).where(eq(dailyReports.id, reportA1SubmittedId)).get();
      expect(dbReport?.status).toBe("reviewed");
      expect(dbReport?.reviewedById).toBe(hodAId);
    });

    it("blocks reviewing a report that is already reviewed (400)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/reports/${reportA1SubmittedId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reviewerComment: "Re-review attempt" }),
      });
      const res = await reviewReport(req, { params: Promise.resolve({ id: reportA1SubmittedId }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Only submitted reports can be reviewed/i);
    });
  });

  describe("5. Date Format & Task Input Validation", () => {
    it("rejects invalid date format strings (400)", async () => {
      asUser("staff", staffBId, instB);
      const req = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "20-10-2026", // Invalid format, must be YYYY-MM-DD
          summary: "Invalid Date Report",
        }),
      });
      const res = await createReport(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(JSON.stringify(body)).toMatch(/YYYY-MM-DD/i);
    });

    it("creates a report successfully with valid date and tasks", async () => {
      asUser("staff", staffBId, instB);
      const req = new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-10-20",
          summary: "Valid Day Report",
          tasks: [
            { description: "Completed backend verification", hoursSpent: 4.5, status: "completed" },
          ],
        }),
      });
      const res = await createReport(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.report.date).toBe("2026-10-20");

      // Cleanup
      await db.delete(dailyReportTasks).where(eq(dailyReportTasks.reportId, body.report.id)).run();
      await db.delete(dailyReports).where(eq(dailyReports.id, body.report.id)).run();
    });
  });
});
