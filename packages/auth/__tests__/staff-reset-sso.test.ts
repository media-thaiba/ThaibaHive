import { POST as resetSsoHandler } from "../../../src/app/api/staff/[id]/reset-sso/route";
import { DELETE as deleteStaffHandler } from "../../../src/app/api/staff/[id]/route";
import { db, staff, staffInstitutions, institutions } from "../../../src/db";
import { auditLog } from "../../../src/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createSession, createStepUpToken, verifySession } from "../session";
import { createActionStepUpToken } from "../step-up";

let mockCookieValue: string | undefined;

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockImplementation(async () => ({
    get: (name: string) => ({ value: mockCookieValue }),
  })),
  headers: jest.fn().mockImplementation(async () => ({
    get: (name: string) => undefined,
  })),
}));

describe("Route-Level: Staff Reset-SSO & Deactivate Boundary Guards", () => {
  const instId = "inst-jest-lockout";
  const adminId = "admin-jest-lockout";
  const superAdminId = "staff_root_media_admin";

  beforeAll(async () => {
    process.env.AUTH_JWT_SECRET = "test-secret-at-least-32-chars-long-security-key";

    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instId)).run();
    await db.delete(institutions).where(eq(institutions.id, instId)).run();
    await db.delete(staff).where(eq(staff.id, adminId)).run();

    await db.insert(institutions).values({
      id: instId,
      name: "Jest Test School",
      code: "SCH-JEST",
    }).run();

    await db.insert(staff).values({
      id: adminId,
      email: "admin.jest@lockout.local",
      employeeId: "EMP-ADM-JEST",
      firstName: "Admin",
      lastName: "Jest",
      role: "admin",
      isActive: true,
      tokenVersion: 0,
    }).run();

    await db.insert(staffInstitutions).values({
      id: "si-admin-jest",
      staffId: adminId,
      institutionId: instId,
    }).run();
  });

  afterAll(async () => {
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instId)).run();
    await db.delete(institutions).where(eq(institutions.id, instId)).run();
    await db.delete(staff).where(eq(staff.id, adminId)).run();
  });

  it("blocks reset-sso when step-up token is missing (returns 403 STEP_UP_REQUIRED)", async () => {
    mockCookieValue = await createSession({
      staffId: adminId,
      email: "admin.jest@lockout.local",
      role: "admin",
      employeeId: "EMP-ADM-JEST",
      name: "Admin Jest",
      tokenVersion: 0,
    });

    const req = new Request(`http://localhost/api/staff/${superAdminId}/reset-sso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: "hacker@gmail.com" }),
    });

    const res = await resetSsoHandler(req, { params: Promise.resolve({ id: superAdminId }) } as unknown as { params: Promise<{ id: string }> });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("STEP_UP_REQUIRED");
  });

  it("blocks reset-sso when scoped admin attempts to modify super_admin (returns 403 Rank Guard)", async () => {
    mockCookieValue = await createSession({
      staffId: adminId,
      email: "admin.jest@lockout.local",
      role: "admin",
      employeeId: "EMP-ADM-JEST",
      name: "Admin Jest",
      tokenVersion: 0,
    });

    const stepUpToken = await createStepUpToken(adminId, "challenge-123");

    const req = new Request(`http://localhost/api/staff/${superAdminId}/reset-sso`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-step-up-token": stepUpToken,
      },
      body: JSON.stringify({ newEmail: "hacker@gmail.com" }),
    });

    const res = await resetSsoHandler(req, { params: Promise.resolve({ id: superAdminId }) } as unknown as { params: Promise<{ id: string }> });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("blocks DELETE when scoped admin attempts to deactivate super_admin (returns 403)", async () => {
    mockCookieValue = await createSession({
      staffId: adminId,
      email: "admin.jest@lockout.local",
      role: "admin",
      employeeId: "EMP-ADM-JEST",
      name: "Admin Jest",
      tokenVersion: 0,
    });

    const req = new Request(`http://localhost/api/staff/${superAdminId}`, { method: "DELETE" });
    const res = await deleteStaffHandler(req, { params: Promise.resolve({ id: superAdminId }) } as unknown as { params: Promise<{ id: string }> });
    expect(res.status).toBe(403);
  });

  it("blocks DELETE of the last active super_admin (returns 400 Zero-Lockout Guard)", async () => {
    const callerId = "sa-jest-caller";
    const targetId = "sa-jest-target";

    await db.delete(staff).where(eq(staff.id, callerId)).run();
    await db.delete(staff).where(eq(staff.id, targetId)).run();

    // Insert 2 active super admins for the test
    await db.insert(staff).values([
      {
        id: callerId,
        email: "caller.sa@jest.local",
        employeeId: "EMP-SA-C",
        firstName: "Caller",
        lastName: "SA",
        role: "super_admin",
        isActive: true,
        tokenVersion: 0,
      },
      {
        id: targetId,
        email: "target.sa@jest.local",
        employeeId: "EMP-SA-T",
        firstName: "Target",
        lastName: "SA",
        role: "super_admin",
        isActive: true,
        tokenVersion: 0,
      },
    ]).run();

    // Temporarily deactivate all other super admins in DB so exactly 2 exist
    const others = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.role, "super_admin"), sql`${staff.id} not in (${callerId}, ${targetId})`, eq(staff.isActive, true)))
      .all();

    for (const o of others) {
      await db.update(staff).set({ isActive: false }).where(eq(staff.id, o.id)).run();
    }

    mockCookieValue = await createSession({
      staffId: callerId,
      email: "caller.sa@jest.local",
      role: "super_admin",
      employeeId: "EMP-SA-C",
      name: "Caller SA",
      tokenVersion: 0,
    });

    const sessionData = await verifySession();
    expect(sessionData).not.toBeNull();

    const stepUp1 = await createActionStepUpToken({
      staffId: callerId,
      sid: sessionData!.sid,
      action: "staff:mutate",
    });

    // 1. First deactivation: caller deletes targetId. 2 active -> 1 active. MUST SUCCEED (200).
    const req1 = new Request(`http://localhost/api/staff/${targetId}`, {
      method: "DELETE",
      headers: { "x-step-up-token": stepUp1 },
    });
    const res1 = await deleteStaffHandler(req1, { params: Promise.resolve({ id: targetId }) } as unknown as { params: Promise<{ id: string }> });
    expect(res1.status).toBe(200);

    // Verify targetId is now inactive and active count is exactly 1 (only callerId remains active)
    const activeCountAfter = (await db.select({ count: sql<number>`count(*)` }).from(staff).where(and(eq(staff.role, "super_admin"), eq(staff.isActive, true))).get())?.count;
    expect(activeCountAfter).toBe(1);

    // 2. Second deactivation attempt: targetId was deactivated in step 1, leaving exactly 1 active super_admin (callerId).
    // Now caller attempts to delete targetId again (or another super_admin). Since active count is now 1 (<= 1),
    // the Zero-Lockout guard blocks deactivation with 400 Bad Request.
    const stepUp2 = await createActionStepUpToken({
      staffId: callerId,
      sid: sessionData!.sid,
      action: "staff:mutate",
    });

    const req2 = new Request(`http://localhost/api/staff/${targetId}`, {
      method: "DELETE",
      headers: { "x-step-up-token": stepUp2 },
    });
    const res2 = await deleteStaffHandler(req2, { params: Promise.resolve({ id: targetId }) } as unknown as { params: Promise<{ id: string }> });
    expect(res2.status).toBe(400);
    const data2 = await res2.json();
    expect(data2.error).toContain("Cannot deactivate the last active super_admin account");

    // Restore other super admins
    for (const o of others) {
      await db.update(staff).set({ isActive: true }).where(eq(staff.id, o.id)).run();
    }
    await db.delete(auditLog).where(eq(auditLog.staffId, callerId)).run();
    await db.delete(auditLog).where(eq(auditLog.entityId, targetId)).run();
    await db.delete(staff).where(eq(staff.id, callerId)).run();
    await db.delete(staff).where(eq(staff.id, targetId)).run();
  });
});
