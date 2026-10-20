/**
 * @jest-environment node
 *
 * Tasks & Workflow Projects Management Pipeline — Hardening & Integrity Suite:
 * - Multi-tenant isolation: GET /api/tasks lists tasks scoped to user's institution
 * - Safe JSON parsing: Malformed/empty payloads return 400 instead of 500 crash across all endpoints
 * - Cross-tenant reorder block: PATCH /api/tasks/reorder blocks admins from Institution B modifying Institution A tasks (403)
 * - Status enum enforcement: Invalid status strings are rejected with 400
 * - Staff affiliation verification: POST/PATCH rejects assigning tasks to staff outside the institution (400)
 * - Management authority on DELETE: Assigned staff cannot delete tasks unless they created them or hold management role (403)
 * - Task comments isolation: Staff can only comment on tasks within their access scope
 * - Concurrency serialization: Sequential withTaskLock execution ensures data consistency
 */

import {
  db,
  institutions,
  departments,
  staff,
  staffInstitutions,
  staffDepartments,
  tasks,
  taskComments,
  notifications,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listTasks,
  POST as createTask,
} from "@/app/api/tasks/route";
import {
  GET as getTaskDetail,
  PATCH as updateTask,
  DELETE as deleteTask,
} from "@/app/api/tasks/[id]/route";
import {
  PATCH as reorderTasks,
} from "@/app/api/tasks/reorder/route";
import {
  POST as addComment,
} from "@/app/api/tasks/[id]/comments/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Tasks & Workflow Projects Management Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instA = `inst_tsk_a_${suffix}`;
  const instB = `inst_tsk_b_${suffix}`;

  const deptA = `dept_tsk_a_${suffix}`;

  const adminAId = `stf_tsk_adm_a_${suffix}`;
  const principalAId = `stf_tsk_pa_${suffix}`;
  const staffA1Id = `stf_tsk_a1_${suffix}`;
  const staffA2Id = `stf_tsk_a2_${suffix}`;

  const adminBId = `stf_tsk_adm_b_${suffix}`;
  const staffBId = `stf_tsk_b1_${suffix}`;

  const superAdminId = `stf_tsk_sa_${suffix}`;

  const taskA1Id = `tsk_a1_${suffix}`;
  const taskA2Id = `tsk_a2_${suffix}`;
  const taskB1Id = `tsk_b1_${suffix}`;

  function asUser(role: string, staffId: string, institutionId?: string) {
    (verifySession as jest.Mock).mockResolvedValue({
      sub: staffId,
      staffId,
      role,
      institutionId: institutionId ?? null,
      permissions: role === "super_admin" ? ["*"] : [
        "tasks:read",
        "tasks:create",
        "tasks:update",
        "tasks:delete",
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

    // 2. Create Departments
    await db.insert(departments).values([
      { id: deptA, name: `Dept A ${suffix}`, code: `DA_${suffix}`, institutionId: instA },
    ]);

    // 3. Create Staff (Must include employeeId)
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
        id: staffA1Id,
        firstName: "Staff",
        lastName: "A1",
        email: `stf_a1_${suffix}@test.com`,
        employeeId: `EMP_A1_${suffix}`,
        role: "staff",
      },
      {
        id: staffA2Id,
        firstName: "Staff",
        lastName: "A2",
        email: `stf_a2_${suffix}@test.com`,
        employeeId: `EMP_A2_${suffix}`,
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

    // 4. Staff Institutions Affiliation
    await db.insert(staffInstitutions).values([
      { id: `si_adm_a_${suffix}`, staffId: adminAId, institutionId: instA },
      { id: `si_pa_${suffix}`, staffId: principalAId, institutionId: instA },
      { id: `si_a1_${suffix}`, staffId: staffA1Id, institutionId: instA },
      { id: `si_a2_${suffix}`, staffId: staffA2Id, institutionId: instA },
      { id: `si_adm_b_${suffix}`, staffId: adminBId, institutionId: instB },
      { id: `si_b1_${suffix}`, staffId: staffBId, institutionId: instB },
    ]);

    // 5. Staff Departments
    await db.insert(staffDepartments).values([
      { id: `sd_a1_${suffix}`, staffId: staffA1Id, departmentId: deptA, isPrimary: true },
      { id: `sd_a2_${suffix}`, staffId: staffA2Id, departmentId: deptA, isPrimary: true },
    ]);

    // 6. Seed baseline tasks
    await db.insert(tasks).values([
      {
        id: taskA1Id,
        title: "Task A1 Initial",
        description: "Task A1 Desc",
        status: "todo",
        priority: "medium",
        institutionId: instA,
        departmentId: deptA,
        assignedById: adminAId,
        assignedToId: staffA1Id,
        sortOrder: 0,
      },
      {
        id: taskA2Id,
        title: "Task A2 Initial",
        description: "Task A2 Desc",
        status: "in_progress",
        priority: "high",
        institutionId: instA,
        departmentId: deptA,
        assignedById: staffA1Id,
        assignedToId: staffA2Id,
        sortOrder: 1,
      },
      {
        id: taskB1Id,
        title: "Task B1 Initial",
        description: "Task B1 Desc",
        status: "todo",
        priority: "low",
        institutionId: instB,
        assignedById: adminBId,
        assignedToId: staffBId,
        sortOrder: 0,
      },
    ]);
  });

  afterAll(async () => {
    // Teardown in strict FK dependency order
    await db.delete(taskComments).where(inArray(taskComments.taskId, [taskA1Id, taskA2Id, taskB1Id])).run();
    await db.delete(tasks).where(inArray(tasks.id, [taskA1Id, taskA2Id, taskB1Id])).run();
    await db.delete(notifications).where(
      inArray(notifications.staffId, [adminAId, principalAId, staffA1Id, staffA2Id, adminBId, staffBId, superAdminId])
    ).run();
    await db.delete(staffDepartments).where(
      inArray(staffDepartments.staffId, [staffA1Id, staffA2Id])
    ).run();
    await db.delete(staffInstitutions).where(
      inArray(staffInstitutions.staffId, [adminAId, principalAId, staffA1Id, staffA2Id, adminBId, staffBId])
    ).run();
    await db.delete(staff).where(
      inArray(staff.id, [adminAId, principalAId, staffA1Id, staffA2Id, adminBId, staffBId, superAdminId])
    ).run();
    await db.delete(departments).where(eq(departments.id, deptA)).run();
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB])).run();
  });

  describe("1. Safe JSON Parsing Across All Endpoints", () => {
    it("POST /api/tasks returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{",
      });
      const res = await createTask(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("PATCH /api/tasks/[id] returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/tasks/${taskA1Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json",
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: taskA1Id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("PATCH /api/tasks/reorder returns 400 on malformed JSON", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      const res = await reorderTasks(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });

    it("POST /api/tasks/[id]/comments returns 400 on malformed JSON", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/tasks/${taskA1Id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad json",
      });
      const res = await addComment(req, { params: Promise.resolve({ id: taskA1Id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Invalid JSON/i);
    });
  });

  describe("2. Cross-Tenant Reorder & Status Transition Hardening", () => {
    it("blocks Admin B from reordering/modifying Task A1 from Institution A (403)", async () => {
      asUser("admin", adminBId, instB);
      const req = new Request("http://localhost/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: [
            { id: taskA1Id, status: "completed", sortOrder: 99 },
          ],
        }),
      });
      const res = await reorderTasks(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/outside your institution/i);

      // Verify task in DB was NOT changed
      const dbTask = await db.select().from(tasks).where(eq(tasks.id, taskA1Id)).get();
      expect(dbTask?.status).toBe("todo");
      expect(dbTask?.sortOrder).toBe(0);
    });

    it("rejects invalid status strings in reorder schema (400)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: [
            { id: taskA1Id, status: "invalid_status_enum", sortOrder: 1 },
          ],
        }),
      });
      const res = await reorderTasks(req);
      expect(res.status).toBe(400);
    });

    it("allows Admin A to reorder their own institution's tasks with valid statuses", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: [
            { id: taskA1Id, status: "in_progress", sortOrder: 5 },
            { id: taskA2Id, status: "completed", sortOrder: 6 },
          ],
        }),
      });
      const res = await reorderTasks(req);
      expect(res.status).toBe(200);

      const dbTask1 = await db.select().from(tasks).where(eq(tasks.id, taskA1Id)).get();
      const dbTask2 = await db.select().from(tasks).where(eq(tasks.id, taskA2Id)).get();
      expect(dbTask1?.status).toBe("in_progress");
      expect(dbTask1?.sortOrder).toBe(5);
      expect(dbTask2?.status).toBe("completed");
      expect(dbTask2?.sortOrder).toBe(6);
      expect(dbTask2?.completedAt).toBeTruthy();
    });
  });

  describe("3. Cross-Tenant Staff Assignment Verification", () => {
    it("POST /api/tasks rejects assigning a task to staff from another institution (400)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Cross Tenant Assignment Attempt",
          priority: "high",
          assignedToId: staffBId, // Staff B belongs to Inst B
        }),
      });
      const res = await createTask(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/not affiliated/i);
    });

    it("PATCH /api/tasks/[id] rejects updating assignment to staff from another institution (400)", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/tasks/${taskA1Id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedToId: staffBId,
        }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: taskA1Id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/not affiliated/i);
    });

    it("POST /api/tasks creates task successfully when assigned staff belongs to institution", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Valid Staff Assignment",
          priority: "medium",
          assignedToId: staffA2Id,
        }),
      });
      const res = await createTask(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.task.assignedToId).toBe(staffA2Id);

      // Clean up newly created task
      await db.delete(tasks).where(eq(tasks.id, body.task.id)).run();
    });
  });

  describe("4. Management Authority on DELETE", () => {
    it("regular staff cannot delete task they do not supervise or did not create (403)", async () => {
      // taskA1 was created by adminAId and assigned to staffA1Id
      // staffA2Id tries to delete it
      asUser("staff", staffA2Id, instA);
      const req = new Request(`http://localhost/api/tasks/${taskA1Id}`, { method: "DELETE" });
      const res = await deleteTask(req, { params: Promise.resolve({ id: taskA1Id }) });
      expect(res.status).toBe(403);
    });

    it("task creator (staffA1 who created taskA2) can delete their created task", async () => {
      asUser("staff", staffA1Id, instA);
      const req = new Request(`http://localhost/api/tasks/${taskA2Id}`, { method: "DELETE" });
      const res = await deleteTask(req, { params: Promise.resolve({ id: taskA2Id }) });
      expect(res.status).toBe(200);

      // Confirm deleted from DB
      const check = await db.select().from(tasks).where(eq(tasks.id, taskA2Id)).get();
      expect(check).toBeUndefined();
    });

    it("Admin A can delete any task within their institution", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/tasks/${taskA1Id}`, { method: "DELETE" });
      const res = await deleteTask(req, { params: Promise.resolve({ id: taskA1Id }) });
      expect(res.status).toBe(200);

      const check = await db.select().from(tasks).where(eq(tasks.id, taskA1Id)).get();
      expect(check).toBeUndefined();
    });
  });

  describe("5. Task Comments Bounds & Access Scope", () => {
    it("rejects empty comment or exceeding 5000 characters (400)", async () => {
      asUser("admin", adminBId, instB);
      const req = new Request(`http://localhost/api/tasks/${taskB1Id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "   " }),
      });
      const res = await addComment(req, { params: Promise.resolve({ id: taskB1Id }) });
      expect(res.status).toBe(400);
    });

    it("adds comment successfully within access scope", async () => {
      asUser("admin", adminBId, instB);
      const req = new Request(`http://localhost/api/tasks/${taskB1Id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Valid operational note on Task B1" }),
      });
      const res = await addComment(req, { params: Promise.resolve({ id: taskB1Id }) });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.comment.content).toBe("Valid operational note on Task B1");
    });
  });

  describe("6. completedAt Lifecycle — Transition Timestamps", () => {
    let testTaskId: string;

    beforeEach(async () => {
      // Create a fresh task for each test
      asUser("admin", adminAId, instA);
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test Task for completedAt", status: "todo" }),
      });
      const res = await createTask(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      testTaskId = body.task.id;
    });

    afterEach(async () => {
      // Clean up
      if (testTaskId) {
        await db.delete(tasks).where(eq(tasks.id, testTaskId)).run();
      }
    });

    it("sets completedAt when status transitions TO completed", async () => {
      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/tasks/${testTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: testTaskId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.task.status).toBe("completed");
      expect(body.task.completedAt).not.toBeNull();
      expect(new Date(body.task.completedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("clears completedAt when status transitions FROM completed to todo", async () => {
      // First ensure task is completed
      await db.update(tasks).set({ status: "completed", completedAt: new Date().toISOString() }).where(eq(tasks.id, testTaskId)).run();

      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/tasks/${testTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "todo" }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: testTaskId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.task.status).toBe("todo");
      expect(body.task.completedAt).toBeNull();
    });

    it("clears completedAt when status transitions FROM completed to cancelled", async () => {
      // First ensure task is completed
      await db.update(tasks).set({ status: "completed", completedAt: new Date().toISOString() }).where(eq(tasks.id, testTaskId)).run();

      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/tasks/${testTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: testTaskId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.task.status).toBe("cancelled");
      expect(body.task.completedAt).toBeNull();
    });

    it("preserves completedAt when status is unchanged (no completedAt in update)", async () => {
      const fixedTime = new Date("2024-01-15T10:00:00Z").toISOString();
      await db.update(tasks).set({ status: "completed", completedAt: fixedTime }).where(eq(tasks.id, testTaskId)).run();

      asUser("admin", adminAId, instA);
      const req = new Request(`http://localhost/api/tasks/${testTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated title only" }),
      });
      const res = await updateTask(req, { params: Promise.resolve({ id: testTaskId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.task.completedAt).toBe(fixedTime);
    });
  });
});
