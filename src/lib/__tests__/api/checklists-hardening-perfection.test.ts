/**
 * @jest-environment node
 *
 * Operational Checklists & Compliance Pipeline — Hardening & Integrity Suite:
 * - Safe JSON parsing across all mutating endpoints (400 Bad Request on invalid payloads)
 * - Schema bounds & enum validation (onboarding/offboarding, valid status transitions, boolean checks)
 * - 404 existence guards on missing templates, assignments, and tasks
 * - Task completion auto-stamping (completedById, completedAt)
 * - Assignment lifecycle timestamps (startedAt, completedAt)
 * - Department & staff boundary authorization enforcement (403 Forbidden)
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  checklistTemplates,
  checklistTemplateItems,
  staffChecklists,
  staffChecklistTasks,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listTemplates,
  POST as createTemplate,
} from "@/app/api/checklists/route";
import {
  GET as getTemplate,
  PATCH as updateTemplate,
  DELETE as deleteTemplate,
} from "@/app/api/checklists/[id]/route";
import {
  GET as listAssignments,
  POST as createAssignment,
} from "@/app/api/checklists/assignments/route";
import {
  GET as getAssignment,
  PATCH as updateAssignment,
  DELETE as deleteAssignment,
} from "@/app/api/checklists/assignments/[id]/route";
import { PATCH as updateTask } from "@/app/api/checklists/tasks/[id]/route";
import {
  POST as createTemplateItem,
  PATCH as updateTemplateItem,
  DELETE as deleteTemplateItem,
} from "@/app/api/checklists/templates/[templateId]/items/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Operational Checklists & Compliance Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instId = `inst_chk_${suffix}`;
  const adminId = `stf_chk_admin_${suffix}`;
  const staffAId = `stf_chk_staff_a_${suffix}`;
  const staffBId = `stf_chk_staff_b_${suffix}`;

  function asUser(role: string, staffId: string) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      userId: `usr_${staffId}`,
      staffId,
      role,
      institutionId: instId,
    });
    (hasPermission as unknown as jest.Mock).mockImplementation((_session: unknown, perm: string) => {
      if (role === "super_admin" || role === "admin") return true;
      if (role === "staff") {
        if (
          perm === "checklists:read" ||
          perm === "staff:read" ||
          perm === "checklists:update"
        ) {
          return true;
        }
      }
      return false;
    });
  }

  beforeAll(async () => {
    await db.insert(institutions).values({
      id: instId,
      name: `Institution Checklists ${suffix}`,
      code: `CHK_${suffix}`,
    });

    await db.insert(staff).values([
      {
        id: adminId,
        email: `admin_${suffix}@test.local`,
        employeeId: `EMP_A_${suffix}`,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      },
      {
        id: staffAId,
        email: `staff_a_${suffix}@test.local`,
        employeeId: `EMP_SA_${suffix}`,
        firstName: "Staff",
        lastName: "Alpha",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@test.local`,
        employeeId: `EMP_SB_${suffix}`,
        firstName: "Staff",
        lastName: "Beta",
        role: "staff",
      },
    ]);

    await db.insert(staffInstitutions).values([
      { id: `si_chk_adm_${suffix}`, staffId: adminId, institutionId: instId },
      { id: `si_chk_sa_${suffix}`, staffId: staffAId, institutionId: instId },
      { id: `si_chk_sb_${suffix}`, staffId: staffBId, institutionId: instId },
    ]);
  });

  afterAll(async () => {
    await db.delete(staffChecklistTasks).run();
    await db.delete(staffChecklists).run();
    await db.delete(checklistTemplateItems).run();
    await db.delete(checklistTemplates).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instId)).run();
    await db.delete(staff).where(inArray(staff.id, [adminId, staffAId, staffBId])).run();
    await db.delete(institutions).where(eq(institutions.id, instId)).run();
  });

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    it("POST /api/checklists returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{",
      });
      const res = await createTemplate(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/checklists/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/tmpl-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{malformed",
      });
      const res = await updateTemplate(req, { params: Promise.resolve({ id: "tmpl-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/checklists/assignments returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad json",
      });
      const res = await createAssignment(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/checklists/assignments/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/assignments/asgn-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{broken",
      });
      const res = await updateAssignment(req, { params: Promise.resolve({ id: "asgn-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/checklists/tasks/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/tasks/tsk-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: "tsk-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/checklists/templates/[templateId]/items returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/templates/tmpl-123/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad",
      });
      const res = await createTemplateItem(req, { params: Promise.resolve({ templateId: "tmpl-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("PATCH /api/checklists/templates/[templateId]/items returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/templates/tmpl-123/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{",
      });
      const res = await updateTemplateItem(req, { params: Promise.resolve({ templateId: "tmpl-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("DELETE /api/checklists/templates/[templateId]/items returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/templates/tmpl-123/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "}",
      });
      const res = await deleteTemplateItem(req, { params: Promise.resolve({ templateId: "tmpl-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Schema Bounds & Input Validation", () => {
    it("rejects invalid template type with 400", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid Type Checklist",
          type: "custom_invalid",
        }),
      });
      const res = await createTemplate(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/onboarding.*offboarding/i);
    });

    it("rejects empty template name with 400", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "   ",
          type: "onboarding",
        }),
      });
      const res = await createTemplate(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Name is required/i);
    });

    it("rejects invalid assignment status with 400", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/assignments/asgn-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "arbitrary_unsupported_status",
        }),
      });
      const res = await updateAssignment(req, { params: Promise.resolve({ id: "asgn-123" }) });
      expect(res.status).toBe(400);
    });

    it("rejects non-boolean isCompleted with 400", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/tasks/tsk-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCompleted: "true", // string instead of boolean
        }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: "tsk-123" }) });
      expect(res.status).toBe(400);
    });
  });

  describe("3. 404 Existence Guards on Nonexistent Entities", () => {
    it("GET /api/checklists/[id] returns 404 for nonexistent id", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/nonexistent-id");
      const res = await getTemplate(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });

    it("PATCH /api/checklists/[id] returns 404 for nonexistent id", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/nonexistent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await updateTemplate(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });

    it("DELETE /api/checklists/[id] returns 404 for nonexistent id", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/nonexistent-id", {
        method: "DELETE",
      });
      const res = await deleteTemplate(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });

    it("GET /api/checklists/assignments/[id] returns 404 for nonexistent id", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/assignments/nonexistent-id");
      const res = await getAssignment(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });

    it("PATCH /api/checklists/assignments/[id] returns 404 for nonexistent id", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/assignments/nonexistent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      const res = await updateAssignment(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });

    it("DELETE /api/checklists/assignments/[id] returns 404 for nonexistent id", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/assignments/nonexistent-id", {
        method: "DELETE",
      });
      const res = await deleteAssignment(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });

    it("PATCH /api/checklists/tasks/[id] returns 404 for nonexistent id", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/tasks/nonexistent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: "nonexistent-id" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("4. End-to-End Lifecycle & Auto-Stamping", () => {
    let createdTemplateId: string;
    let createdAssignmentId: string;
    let instantiatedTaskId: string;

    it("creates a template with nested items", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Staff Onboarding Checklist ${suffix}`,
          type: "onboarding",
          description: "Standard onboarding procedure",
          items: [
            { title: "Collect ID Card", description: "Collect identity documents", order: 1 },
            { title: "Setup Campus Email", description: "Issue IT credentials", order: 2 },
          ],
        }),
      });
      const res = await createTemplate(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.template).toBeDefined();
      expect(json.template.name).toBe(`Staff Onboarding Checklist ${suffix}`);
      createdTemplateId = json.template.id;

      // Verify template GET
      const getReq = new Request(`http://localhost/api/checklists/${createdTemplateId}`);
      const getRes = await getTemplate(getReq, { params: Promise.resolve({ id: createdTemplateId }) });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.items).toHaveLength(2);
    });

    it("assigns template to staff member and instantiates tasks", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/checklists/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffAId,
          templateId: createdTemplateId,
          type: "onboarding",
          notes: "Welcome to Thaiba campus!",
        }),
      });
      const res = await createAssignment(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.assignment).toBeDefined();
      expect(json.assignment.staffId).toBe(staffAId);
      expect(json.assignment.status).toBe("pending");
      createdAssignmentId = json.assignment.id;

      // Verify assignment details and instantiated tasks
      const getReq = new Request(`http://localhost/api/checklists/assignments/${createdAssignmentId}`);
      const getRes = await getAssignment(getReq, { params: Promise.resolve({ id: createdAssignmentId }) });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.tasks).toHaveLength(2);
      expect(getJson.tasks[0].title).toBe("Collect ID Card");
      expect(getJson.tasks[0].isCompleted).toBe(false);
      instantiatedTaskId = getJson.tasks[0].id;
    });

    it("completing a task auto-stamps completedById and completedAt", async () => {
      asUser("staff", staffAId);
      const req = new Request(`http://localhost/api/checklists/tasks/${instantiatedTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: instantiatedTaskId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.task.isCompleted).toBe(true);
      expect(json.task.completedById).toBe(staffAId);
      expect(json.task.completedAt).toBeTruthy();
    });

    it("transitions assignment status with timestamp tracking", async () => {
      asUser("staff", staffAId);

      // Transition to in_progress
      const req1 = new Request(`http://localhost/api/checklists/assignments/${createdAssignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      const res1 = await updateAssignment(req1, { params: Promise.resolve({ id: createdAssignmentId }) });
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.assignment.status).toBe("in_progress");
      expect(json1.assignment.startedAt).toBeTruthy();

      // Transition to completed
      const req2 = new Request(`http://localhost/api/checklists/assignments/${createdAssignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const res2 = await updateAssignment(req2, { params: Promise.resolve({ id: createdAssignmentId }) });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.assignment.status).toBe("completed");
      expect(json2.assignment.completedAt).toBeTruthy();
    });

    it("deleting an assignment removes both assignment and tasks", async () => {
      asUser("admin", adminId);
      const delReq = new Request(`http://localhost/api/checklists/assignments/${createdAssignmentId}`, {
        method: "DELETE",
      });
      const delRes = await deleteAssignment(delReq, { params: Promise.resolve({ id: createdAssignmentId }) });
      expect(delRes.status).toBe(200);

      // Verify 404
      const getReq = new Request(`http://localhost/api/checklists/assignments/${createdAssignmentId}`);
      const getRes = await getAssignment(getReq, { params: Promise.resolve({ id: createdAssignmentId }) });
      expect(getRes.status).toBe(404);
    });
  });

  describe("5. Scope & Boundary Authorization Enforcement", () => {
    let foreignAssignmentId: string;
    let foreignTaskId: string;
    let testTemplateId: string;

    beforeAll(async () => {
      asUser("admin", adminId);
      // Create template
      const tmplRes = await createTemplate(
        new Request("http://localhost/api/checklists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Staff A Secret Checklist ${suffix}`,
            type: "offboarding",
            items: [{ title: "Revoke Access", order: 1 }],
          }),
        })
      );
      const tmplJson = await tmplRes.json();
      testTemplateId = tmplJson.template.id;

      // Assign to Staff A
      const asgnRes = await createAssignment(
        new Request("http://localhost/api/checklists/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId: staffAId,
            templateId: testTemplateId,
            type: "offboarding",
          }),
        })
      );
      const asgnJson = await asgnRes.json();
      foreignAssignmentId = asgnJson.assignment.id;

      // Retrieve tasks
      const getRes = await getAssignment(
        new Request(`http://localhost/api/checklists/assignments/${foreignAssignmentId}`),
        { params: Promise.resolve({ id: foreignAssignmentId }) }
      );
      const getJson = await getRes.json();
      foreignTaskId = getJson.tasks[0].id;
    });

    it("Staff B cannot view Staff A assignment (403 Forbidden)", async () => {
      asUser("staff", staffBId);
      const req = new Request(`http://localhost/api/checklists/assignments/${foreignAssignmentId}`);
      const res = await getAssignment(req, { params: Promise.resolve({ id: foreignAssignmentId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden");
    });

    it("Staff B cannot update Staff A assignment (403 Forbidden)", async () => {
      asUser("staff", staffBId);
      const req = new Request(`http://localhost/api/checklists/assignments/${foreignAssignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      const res = await updateAssignment(req, { params: Promise.resolve({ id: foreignAssignmentId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden");
    });

    it("Staff B cannot mutate Staff A task completion (403 Forbidden)", async () => {
      asUser("staff", staffBId);
      const req = new Request(`http://localhost/api/checklists/tasks/${foreignTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: foreignTaskId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden");
    });
  });
});
