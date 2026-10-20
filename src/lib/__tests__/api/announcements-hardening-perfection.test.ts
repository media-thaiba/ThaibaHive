/**
 * @jest-environment node
 *
 * Announcements & Broadcasts Pipeline — Hardening & Integrity Suite:
 * - Safe JSON parsing: Malformed/empty payloads return 400 on POST and PATCH
 * - Bounded input validation: Priority "low" accepted, bounded title (<= 200) and content (<= 10000)
 * - Multi-tenant isolation: Admin cannot target foreign institution (403) or cross-tenant department (400)
 * - Audience IDOR guards: Non-targeted roles and departments cannot view or mark read (404)
 * - REST parity: GET detail with readCount/isRead, PATCH updates, DELETE cascade
 * - Concurrency: Concurrent read-receipt recording deduplicated under lock
 */

import {
  db,
  institutions,
  departments,
  staff,
  staffInstitutions,
  staffDepartments,
  announcements,
  announcementReads,
  notifications,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  GET as listAnnouncements,
  POST as createAnnouncement,
} from "@/app/api/announcements/route";
import {
  GET as getAnnouncementDetail,
  PATCH as updateAnnouncement,
  DELETE as deleteAnnouncement,
} from "@/app/api/announcements/[id]/route";
import { POST as markAnnouncementRead } from "@/app/api/announcements/[id]/read/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Announcements & Broadcasts Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_ann_a_${suffix}`;
  const instB = `inst_ann_b_${suffix}`;
  const deptA = `dept_ann_a_${suffix}`;
  const deptB = `dept_ann_b_${suffix}`;

  const adminAId = `stf_admin_a_${suffix}`;
  const adminBId = `stf_admin_b_${suffix}`;
  const principalAId = `stf_prin_a_${suffix}`;
  const hodAId = `stf_hod_a_${suffix}`;
  const staffA1Id = `stf_staff_a1_${suffix}`;
  const staffA2Id = `stf_staff_a2_${suffix}`;

  let createdAnnId: string = "";

  function asUser(role: string, staffId: string, instId: string) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      userId: `usr_${staffId}`,
      staffId,
      role,
      institutionId: instId,
    });
    (hasPermission as unknown as jest.Mock).mockImplementation((_session: unknown, perm: string) => {
      if (role === "super_admin") return true;
      if (role === "admin") return true;
      if (role === "principal") return true;
      if (role === "hod") {
        return ["announcements:read", "announcements:create"].includes(perm);
      }
      if (role === "staff") {
        return ["announcements:read"].includes(perm);
      }
      return false;
    });
  }

  beforeAll(async () => {
    // 1. Create Institutions
    await db.insert(institutions).values([
      { id: instA, name: `Institution A ${suffix}`, code: `IA_${suffix}` },
      { id: instB, name: `Institution B ${suffix}`, code: `IB_${suffix}` },
    ]);

    // 2. Create Staff Fixtures
    await db.insert(staff).values([
      { id: adminAId, email: `admin_a_${suffix}@test.local`, employeeId: `EMP_ADM_A_${suffix}`, firstName: "Admin", lastName: "A", role: "admin" },
      { id: adminBId, email: `admin_b_${suffix}@test.local`, employeeId: `EMP_ADM_B_${suffix}`, firstName: "Admin", lastName: "B", role: "admin" },
      { id: principalAId, email: `prin_a_${suffix}@test.local`, employeeId: `EMP_PRN_A_${suffix}`, firstName: "Principal", lastName: "A", role: "principal" },
      { id: hodAId, email: `hod_a_${suffix}@test.local`, employeeId: `EMP_HOD_A_${suffix}`, firstName: "HOD", lastName: "A", role: "hod" },
      { id: staffA1Id, email: `staff_a1_${suffix}@test.local`, employeeId: `EMP_STF_A1_${suffix}`, firstName: "Staff", lastName: "A1", role: "staff" },
      { id: staffA2Id, email: `staff_a2_${suffix}@test.local`, employeeId: `EMP_STF_A2_${suffix}`, firstName: "Staff", lastName: "A2", role: "staff" },
    ]);

    // 3. Create Departments
    await db.insert(departments).values([
      { id: deptA, name: `Dept A ${suffix}`, code: `DA_${suffix}`, institutionId: instA },
      { id: deptB, name: `Dept B ${suffix}`, code: `DB_${suffix}`, institutionId: instB },
    ]);

    // 4. Staff Institutions Affiliation
    await db.insert(staffInstitutions).values([
      { id: `si_adm_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_adm_b_${suffix}`, staffId: adminBId, institutionId: instB },
      { id: `si_prn_a_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_hod_a_${suffix}`, staffId: hodAId, institutionId: instA },
      { id: `si_stf_a1_${suffix}`, staffId: staffA1Id, institutionId: instA },
      { id: `si_stf_a2_${suffix}`, staffId: staffA2Id, institutionId: instA },
    ]);

    // 5. Staff Departments: staffA1 is in Dept A; staffA2 is NOT in Dept A
    await db.insert(staffDepartments).values([
      { id: `sd_hod_a_${suffix}`, staffId: hodAId, departmentId: deptA },
      { id: `sd_stf_a1_${suffix}`, staffId: staffA1Id, departmentId: deptA },
    ]);
  });

  afterAll(async () => {
    const testStaffIds = [adminAId, adminBId, principalAId, hodAId, staffA1Id, staffA2Id];
    // Teardown in strict FK dependency order
    await db.delete(notifications).where(inArray(notifications.staffId, testStaffIds)).run();
    await db.delete(announcementReads).where(inArray(announcementReads.staffId, testStaffIds)).run();
    await db.delete(announcements).where(inArray(announcements.createdById, testStaffIds)).run();
    await db.delete(staffDepartments).where(inArray(staffDepartments.staffId, testStaffIds)).run();
    await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, testStaffIds)).run();
    await db.delete(departments).where(inArray(departments.id, [deptA, deptB])).run();
    await db.delete(staff).where(inArray(staff.id, testStaffIds)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across Endpoints", () => {
    it("POST /api/announcements returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad json {",
      });
      const res = await createAnnouncement(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("PATCH /api/announcements/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements/dummy-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{ unclosed json",
      });
      const res = await updateAnnouncement(req, { params: Promise.resolve({ id: "dummy-id" }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });
  });

  describe("2. Schema Validation & Priority Bug Fix", () => {
    it("accepts 'low' priority without schema rejection", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Low Priority Test Notice",
          content: "This is a low priority notice for all staff members.",
          priority: "low",
        }),
      });
      const res = await createAnnouncement(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.announcement.priority).toBe("low");
      expect(body.announcement.targetInstitutionId).toBe(instA);
    });

    it("rejects empty title or missing content with 400", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "   ",
          content: "",
        }),
      });
      const res = await createAnnouncement(req);
      expect(res.status).toBe(400);
    });

    it("rejects oversized title (> 200 chars) with 400", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "X".repeat(201),
          content: "Valid content",
        }),
      });
      const res = await createAnnouncement(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/200 characters/i);
    });
  });

  describe("3. Multi-Tenant Scoping & Creation Isolation", () => {
    it("auto-binds targetInstitutionId to caller's scoped institution when omitted", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Campus Safety Drill",
          content: "All staff must assemble at the main ground.",
          priority: "high",
        }),
      });
      const res = await createAnnouncement(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.announcement.targetInstitutionId).toBe(instA);
      createdAnnId = body.announcement.id;
    });

    it("rejects non-super_admin attempting to create an announcement for another institution (403)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Infiltrated Notice",
          content: "Attempting to broadcast into Institution B.",
          targetInstitutionId: instB,
        }),
      });
      const res = await createAnnouncement(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/another institution/i);
    });

    it("rejects targeting a department that does not belong to the institution (400)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Misplaced Department Notice",
          content: "Targeting Dept B from Institution A.",
          targetDepartmentId: deptB,
        }),
      });
      const res = await createAnnouncement(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/does not belong/i);
    });
  });

  describe("4. Audience Targeting & IDOR Defense", () => {
    let deptAnnId: string = "";

    beforeAll(async () => {
      // Create announcement targeted specifically to Dept A
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Dept A Faculty Meeting",
          content: "Quarterly review for Department A staff only.",
          targetDepartmentId: deptA,
        }),
      });
      const res = await createAnnouncement(req);
      const body = await res.json();
      deptAnnId = body.announcement.id;
    });

    it("Staff A1 (member of Dept A) CAN view the announcement", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/announcements/${deptAnnId}`);
      const res = await getAnnouncementDetail(req, { params: Promise.resolve({ id: deptAnnId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.announcement.id).toBe(deptAnnId);
      expect(body.announcement.isRead).toBe(false);
    });

    it("Staff A2 (NOT member of Dept A) CANNOT view the announcement (404 IDOR guard)", async () => {
      asUser("staff", staffA2Id, instA);
      const req = new Request(`http://localhost/api/announcements/${deptAnnId}`);
      const res = await getAnnouncementDetail(req, { params: Promise.resolve({ id: deptAnnId }) });
      expect(res.status).toBe(404);
    });

    it("Staff A2 CANNOT mark un-targeted announcement as read (404 IDOR guard)", async () => {
      asUser("staff", staffA2Id, instA);
      const req = new Request(`http://localhost/api/announcements/${deptAnnId}/read`, {
        method: "POST",
      });
      const res = await markAnnouncementRead(req, { params: Promise.resolve({ id: deptAnnId }) });
      expect(res.status).toBe(404);
    });
  });

  describe("5. REST Lifecycle: Read Receipts, PATCH Updates, and Deletion", () => {
    it("Staff A1 marks announcement as read", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/announcements/${createdAnnId}/read`, {
        method: "POST",
      });
      const res = await markAnnouncementRead(req, { params: Promise.resolve({ id: createdAnnId }) });
      expect(res.status).toBe(200);

      // Verify GET by staff reflects isRead: true
      const getReq = new Request(`http://localhost/api/announcements/${createdAnnId}`);
      const getRes = await getAnnouncementDetail(getReq, { params: Promise.resolve({ id: createdAnnId }) });
      expect(getRes.status).toBe(200);
      const getBody = await getRes.json();
      expect(getBody.announcement.isRead).toBe(true);
    });

    it("Admin A views announcement and sees readCount = 1", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/announcements/${createdAnnId}`);
      const res = await getAnnouncementDetail(req, { params: Promise.resolve({ id: createdAnnId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.announcement.readCount).toBe(1);
    });

    it("Admin A updates announcement title and pins it via PATCH", async () => {
      asUser("admin", adminAId, instA);
      const pinDate = new Date(Date.now() + 86400000).toISOString();
      const req = new Request(`http://localhost/api/announcements/${createdAnnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Campus Safety Drill [UPDATED]",
          pinnedUntil: pinDate,
        }),
      });
      const res = await updateAnnouncement(req, { params: Promise.resolve({ id: createdAnnId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.announcement.title).toBe("Campus Safety Drill [UPDATED]");
      expect(body.announcement.pinnedUntil).toBe(pinDate);
    });

    it("Admin B from Institution B CANNOT update or delete Institution A's announcement (403/404)", async () => {
      asUser("admin", adminBId, instB);
      const patchReq = new Request(`http://localhost/api/announcements/${createdAnnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Tampered" }),
      });
      const patchRes = await updateAnnouncement(patchReq, { params: Promise.resolve({ id: createdAnnId }) });
      expect(patchRes.status).toBe(403);

      const delReq = new Request(`http://localhost/api/announcements/${createdAnnId}`, {
        method: "DELETE",
      });
      const delRes = await deleteAnnouncement(delReq, { params: Promise.resolve({ id: createdAnnId }) });
      expect(delRes.status).toBe(404);
    });

    it("Admin A deletes announcement with cascading read receipt cleanup", async () => {
      asUser("admin", adminAId, instA);
      const delReq = new Request(`http://localhost/api/announcements/${createdAnnId}`, {
        method: "DELETE",
      });
      const delRes = await deleteAnnouncement(delReq, { params: Promise.resolve({ id: createdAnnId }) });
      expect(delRes.status).toBe(200);

      // Verify cascading deletion in DB
      const readRows = await db
        .select()
        .from(announcementReads)
        .where(eq(announcementReads.announcementId, createdAnnId))
        .all();
      expect(readRows.length).toBe(0);

      const annRow = await db
        .select()
        .from(announcements)
        .where(eq(announcements.id, createdAnnId))
        .get();
      expect(annRow).toBeUndefined();
    });
  });

  describe("6. Concurrent Read-Receipt Deduplication Mutex", () => {
    let raceAnnId: string = "";

    beforeAll(async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Concurrency Race Test Announcement",
          content: "Testing simultaneous read receipts.",
        }),
      });
      const res = await createAnnouncement(req);
      const body = await res.json();
      raceAnnId = body.announcement.id;
    });

    it("simultaneous parallel mark-as-read requests do not duplicate read rows", async () => {
      asUser("staff", staffA1Id, instA);

      // Fire 5 simultaneous read requests for the same staff member
      const promises = Array.from({ length: 5 }).map(() => {
        const req = new Request(`http://localhost/api/announcements/${raceAnnId}/read`, {
          method: "POST",
        });
        return markAnnouncementRead(req, { params: Promise.resolve({ id: raceAnnId }) });
      });

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res.status).toBe(200);
      }

      // Check DB: exactly 1 row should exist for (raceAnnId, staffA1Id)
      const rows = await db
        .select()
        .from(announcementReads)
        .where(
          and(
            eq(announcementReads.announcementId, raceAnnId),
            eq(announcementReads.staffId, staffA1Id)
          )
        )
        .all();

      expect(rows.length).toBe(1);
    });
  });
});
