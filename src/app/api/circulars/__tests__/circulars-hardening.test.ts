/**
 * @jest-environment node
 *
 * Circulars & Policy Broadcasts Pipeline Hardening Suite:
 * - Target audience isolation on download and detail view (role, dept, inst scoping)
 * - Inactive circular authorization gating (staff 404, author/super_admin 200/302)
 * - Download audit logging and open redirect origin defense
 * - REST parity on /api/circulars/[id] (GET, PATCH, DELETE)
 * - Cross-tenant update/delete boundary checks
 * - Canonical RBAC permission enforcement (circulars:read, circulars:manage)
 */
import {
  db,
  institutions,
  departments,
  staff,
  staffInstitutions,
  staffDepartments,
  circulars,
  circularDownloads,
} from "@/db";
import { verifySession } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import { GET as circularsGet, POST as circularsPost } from "@/app/api/circulars/route";
import {
  GET as circularDetailGet,
  PATCH as circularDetailPatch,
  DELETE as circularDetailDelete,
} from "@/app/api/circulars/[id]/route";
import { GET as circularDownloadGet } from "@/app/api/circulars/[id]/download/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Circulars & Policy Broadcasts Pipeline Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instAId = `inst_circ_a_${suffix}`;
  const instBId = `inst_circ_b_${suffix}`;
  const deptAId = `dept_circ_a_${suffix}`;
  const deptBId = `dept_circ_b_${suffix}`;

  const superAdminId = `stf_circ_sa_${suffix}`;
  const principalAId = `stf_circ_pa_${suffix}`;
  const principalBId = `stf_circ_pb_${suffix}`;
  const hodAId = `stf_circ_hoda_${suffix}`;
  const staffAId = `stf_circ_sa_mem_${suffix}`;
  const staffBId = `stf_circ_sb_mem_${suffix}`;

  const setSession = (payload: Record<string, unknown> | null) => {
    (verifySession as jest.Mock).mockResolvedValue(payload);
  };

  const req = (url: string, method = "GET", body?: unknown) =>
    new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

  const contextParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: instAId, name: `Institution Circ A ${suffix}`, code: `ICA-${suffix}` },
      { id: instBId, name: `Institution Circ B ${suffix}`, code: `ICB-${suffix}` },
    ]).run();

    // Seed staff first (so headUserId in departments can reference staff)
    await db.insert(staff).values([
      {
        id: superAdminId,
        employeeId: `EMP_SA_${suffix}`,
        firstName: "Super",
        lastName: "Admin",
        email: `sa_${suffix}@circ.test`,
        role: "super_admin",
      },
      {
        id: principalAId,
        employeeId: `EMP_PA_${suffix}`,
        firstName: "Principal",
        lastName: "Alpha",
        email: `pa_${suffix}@circ.test`,
        role: "principal",
      },
      {
        id: principalBId,
        employeeId: `EMP_PB_${suffix}`,
        firstName: "Principal",
        lastName: "Beta",
        email: `pb_${suffix}@circ.test`,
        role: "principal",
      },
      {
        id: hodAId,
        employeeId: `EMP_HOD_${suffix}`,
        firstName: "HOD",
        lastName: "Alpha",
        email: `hod_${suffix}@circ.test`,
        role: "hod",
      },
      {
        id: staffAId,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "Staff",
        lastName: "MemberA",
        email: `staff_a_${suffix}@circ.test`,
        role: "staff",
      },
      {
        id: staffBId,
        employeeId: `EMP_STB_${suffix}`,
        firstName: "Staff",
        lastName: "MemberB",
        email: `staff_b_${suffix}@circ.test`,
        role: "staff",
      },
    ]).run();

    // Seed departments
    await db.insert(departments).values([
      { id: deptAId, code: `DCA-${suffix}`, name: `Dept Circ A ${suffix}`, institutionId: instAId, headUserId: hodAId },
      { id: deptBId, code: `DCB-${suffix}`, name: `Dept Circ B ${suffix}`, institutionId: instBId },
    ]).run();

    // Seed staffInstitutions
    await db.insert(staffInstitutions).values([
      { id: `si_pa_${suffix}`, staffId: principalAId, institutionId: instAId },
      { id: `si_pb_${suffix}`, staffId: principalBId, institutionId: instBId },
      { id: `si_hod_${suffix}`, staffId: hodAId, institutionId: instAId },
      { id: `si_sa_${suffix}`, staffId: staffAId, institutionId: instAId },
      { id: `si_sb_${suffix}`, staffId: staffBId, institutionId: instBId },
    ]).run();

    // Seed staffDepartments
    await db.insert(staffDepartments).values([
      { id: `sd_hoda_${suffix}`, staffId: hodAId, departmentId: deptAId },
      { id: `sd_sta_${suffix}`, staffId: staffAId, departmentId: deptAId },
      { id: `sd_stb_${suffix}`, staffId: staffBId, departmentId: deptBId },
    ]).run();
  });

  afterAll(async () => {
    // Cleanup seeded data
    const allStaffIds = [superAdminId, principalAId, principalBId, hodAId, staffAId, staffBId];
    await db.delete(circularDownloads).where(inArray(circularDownloads.staffId, allStaffIds)).run();
    await db.delete(circulars).where(inArray(circulars.uploadedById, allStaffIds)).run();
    await db.delete(staffDepartments).where(inArray(staffDepartments.staffId, allStaffIds)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, allStaffIds)).run();
    await db.delete(departments).where(inArray(departments.id, [deptAId, deptBId])).run();
    await db.delete(staff).where(inArray(staff.id, allStaffIds)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instAId, instBId])).run();
  });

  describe("Download Route Target Audience & Security Gates", () => {
    it("denies download with 404 if user does not match target role", async () => {
      // Create circular targeted specifically to principal
      const circId = `circ_role_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Confidential Principal Briefing",
        fileUrl: "/documents/briefing.pdf",
        targetRole: "principal",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      // Regular staff in instA tries to download
      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });
      const resStaff = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect(resStaff.status).toBe(404);

      // Principal in instA tries to download
      setSession({ staffId: principalAId, role: "principal", institutionId: instAId });
      const resPrincipal = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect([302, 307]).toContain(resPrincipal.status);
      expect(resPrincipal.headers.get("location")).toBe("https://thaiba.edu/documents/briefing.pdf");
    });

    it("denies download with 404 if user does not belong to target department", async () => {
      const circId = `circ_dept_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Department A Notice",
        fileUrl: "/documents/notice_a.pdf",
        targetDepartmentId: deptAId,
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      // Staff in dept B attempts download
      setSession({ staffId: staffBId, role: "staff", institutionId: instBId });
      const resDeptB = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect(resDeptB.status).toBe(404);

      // Staff in dept A attempts download
      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });
      const resDeptA = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect([302, 307]).toContain(resDeptA.status);
    });

    it("denies download with 404 if user belongs to another institution", async () => {
      const circId = `circ_inst_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Campus A Operational Guide",
        fileUrl: "/documents/campus_a.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      // Staff in inst B attempts download
      setSession({ staffId: staffBId, role: "staff", institutionId: instBId });
      const resInstB = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect(resInstB.status).toBe(404);

      // Staff in inst A attempts download
      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });
      const resInstA = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect([302, 307]).toContain(resInstA.status);
    });

    it("denies download for inactive circular to regular staff, but allows author and super_admin", async () => {
      const circId = `circ_inact_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Draft Policy",
        fileUrl: "/documents/draft.pdf",
        targetInstitutionId: instAId,
        uploadedById: hodAId,
        isActive: false,
      }).run();

      // Regular staff in inst A -> 404
      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });
      const resStaff = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect(resStaff.status).toBe(404);

      // Author (hodA) -> redirect
      setSession({ staffId: hodAId, role: "hod", institutionId: instAId });
      const resAuthor = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect([302, 307]).toContain(resAuthor.status);

      // Super admin -> redirect
      setSession({ staffId: superAdminId, role: "super_admin" });
      const resAdmin = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect([302, 307]).toContain(resAdmin.status);
    });

    it("blocks open redirect attempts to foreign origins with 400", async () => {
      const circId = `circ_openredir_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "External Phishing Link",
        fileUrl: "https://evil-attacker.example.com/malware.exe",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });
      const res = await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid document URL origin/i);
    });

    it("records audit logs in circular_downloads on successful download only", async () => {
      const circId = `circ_audit_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Audited Document",
        fileUrl: "/documents/audited.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      // Failed download attempt (unauthorized staff)
      setSession({ staffId: staffBId, role: "staff", institutionId: instBId });
      await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );

      const logsBefore = await db
        .select()
        .from(circularDownloads)
        .where(eq(circularDownloads.circularId, circId))
        .all();
      expect(logsBefore).toHaveLength(0);

      // Successful download attempt
      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });
      await circularDownloadGet(
        req(`https://thaiba.edu/api/circulars/${circId}/download`),
        contextParams(circId)
      );

      const logsAfter = await db
        .select()
        .from(circularDownloads)
        .where(eq(circularDownloads.circularId, circId))
        .all();
      expect(logsAfter).toHaveLength(1);
      expect(logsAfter[0].staffId).toBe(staffAId);
    });
  });

  describe("Detail Route GET /api/circulars/[id]", () => {
    it("returns 404 for unauthorized staff to prevent title enumeration", async () => {
      const circId = `circ_enum_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Restricted Executive Memo",
        fileUrl: "/documents/memo.pdf",
        targetRole: "principal",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });
      const res = await circularDetailGet(
        req(`https://thaiba.edu/api/circulars/${circId}`),
        contextParams(circId)
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Circular not found");
    });

    it("returns circular detail with downloadCount for authorized viewers", async () => {
      const circId = `circ_detail_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Campus Notice With Downloads",
        description: "Official campus notice",
        fileUrl: "/documents/notice_dl.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      // Seed 2 downloads
      await db.insert(circularDownloads).values([
        { id: `cd_1_${suffix}`, circularId: circId, staffId: staffAId },
        { id: `cd_2_${suffix}`, circularId: circId, staffId: hodAId },
      ]).run();

      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });
      const res = await circularDetailGet(
        req(`https://thaiba.edu/api/circulars/${circId}`),
        contextParams(circId)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.circular.title).toBe("Campus Notice With Downloads");
      expect(data.circular.downloadCount).toBe(2);
    });
  });

  describe("Update Route PATCH /api/circulars/[id]", () => {
    it("blocks update with 403 when non-admin tries to modify circular from another institution", async () => {
      const circId = `circ_patch_inst_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Campus A Circular",
        fileUrl: "/documents/c_a.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      // Principal B attempts to update Principal A's circular
      setSession({ staffId: principalBId, role: "principal", institutionId: instBId });
      const res = await circularDetailPatch(
        req(`https://thaiba.edu/api/circulars/${circId}`, "PATCH", { title: "Hijacked Title" }),
        contextParams(circId)
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Cannot modify circular from another institution/i);
    });

    it("blocks principal from setting targetInstitutionId to an institution they do not belong to", async () => {
      const circId = `circ_patch_inst_target_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Principal Notice",
        fileUrl: "/documents/prin.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      setSession({ staffId: principalAId, role: "principal", institutionId: instAId });
      const res = await circularDetailPatch(
        req(`https://thaiba.edu/api/circulars/${circId}`, "PATCH", { targetInstitutionId: instBId }),
        contextParams(circId)
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Cannot target another institution/i);
    });

    it("allows authorized principal to update circular metadata and active status", async () => {
      const circId = `circ_patch_ok_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Initial Title",
        description: "Initial description",
        fileUrl: "/documents/initial.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      setSession({ staffId: principalAId, role: "principal", institutionId: instAId });
      const res = await circularDetailPatch(
        req(`https://thaiba.edu/api/circulars/${circId}`, "PATCH", {
          title: "Updated Title",
          description: "Updated description",
          isActive: false,
        }),
        contextParams(circId)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.circular.title).toBe("Updated Title");
      expect(data.circular.description).toBe("Updated description");
      expect(data.circular.isActive).toBe(false);

      const dbRow = await db.select().from(circulars).where(eq(circulars.id, circId)).get();
      expect(dbRow?.title).toBe("Updated Title");
      expect(dbRow?.isActive).toBe(false);
    });
  });

  describe("Delete Route DELETE /api/circulars/[id]", () => {
    it("blocks non-admin from deleting circular from another institution", async () => {
      const circId = `circ_del_cross_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Inst A Protected Notice",
        fileUrl: "/documents/prot.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      setSession({ staffId: principalBId, role: "principal", institutionId: instBId });
      const res = await circularDetailDelete(
        req(`https://thaiba.edu/api/circulars/${circId}`, "DELETE"),
        contextParams(circId)
      );
      expect(res.status).toBe(403);
    });

    it("allows authorized principal to delete circular and cascades download records", async () => {
      const circId = `circ_del_ok_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "Deletable Notice",
        fileUrl: "/documents/deletable.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      await db.insert(circularDownloads).values({
        id: `cd_del_${suffix}`,
        circularId: circId,
        staffId: staffAId,
      }).run();

      setSession({ staffId: principalAId, role: "principal", institutionId: instAId });
      const res = await circularDetailDelete(
        req(`https://thaiba.edu/api/circulars/${circId}`, "DELETE"),
        contextParams(circId)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify row is deleted
      const circRow = await db.select().from(circulars).where(eq(circulars.id, circId)).get();
      expect(circRow).toBeUndefined();

      // Verify downloads are cleaned up
      const dlRows = await db
        .select()
        .from(circularDownloads)
        .where(eq(circularDownloads.circularId, circId))
        .all();
      expect(dlRows).toHaveLength(0);
    });
  });

  describe("Canonical RBAC Permission Enforcement", () => {
    it("blocks staff without circulars:manage from calling PATCH and DELETE", async () => {
      const circId = `circ_rbac_${suffix}`;
      await db.insert(circulars).values({
        id: circId,
        title: "RBAC Test Circular",
        fileUrl: "/documents/rbac.pdf",
        targetInstitutionId: instAId,
        uploadedById: principalAId,
        isActive: true,
      }).run();

      // Staff role only has circulars:read, not circulars:manage
      setSession({ staffId: staffAId, role: "staff", institutionId: instAId });

      const patchRes = await circularDetailPatch(
        req(`https://thaiba.edu/api/circulars/${circId}`, "PATCH", { title: "Staff Attempt" }),
        contextParams(circId)
      );
      expect(patchRes.status).toBe(403);

      const deleteRes = await circularDetailDelete(
        req(`https://thaiba.edu/api/circulars/${circId}`, "DELETE"),
        contextParams(circId)
      );
      expect(deleteRes.status).toBe(403);
    });

    it("returns 401 when unauthenticated request arrives", async () => {
      setSession(null);
      const res = await circularDetailGet(
        req(`https://thaiba.edu/api/circulars/dummy_id`),
        contextParams("dummy_id")
      );
      expect(res.status).toBe(401);
    });
  });
});
