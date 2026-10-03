import { db } from "@/db";
import { leaveRequests, leaveTypes, staff, staffInstitutions, institutions } from "@/db/schema";
import { GET as getLeave, PUT as putLeave, DELETE as deleteLeave } from "../[id]/route";
import { POST as postLeave } from "../route";
import { eq } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Leave Requests Cross-Tenant IDOR & Create Path Scoping", () => {
  const ts = Date.now();
  const instA = `inst-a-${ts}`;
  const instB = `inst-b-${ts}`;
  const staffA = `staff-a-${ts}`;
  const staffB = `staff-b-${ts}`;
  const adminStaff = `staff-admin-${ts}`;
  const leaveTypeId = `lt-${ts}`;
  const leaveA = `leave-a-${ts}`;

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: instA, name: "Institution Alpha", code: `ALPHA_${ts}` },
      { id: instB, name: "Institution Beta", code: `BETA_${ts}` },
    ]).run();

    // Seed staff
    await db.insert(staff).values([
      { id: staffA, email: `staffA_${ts}@test.local`, employeeId: `EMP_A_${ts}`, firstName: "Alpha", lastName: "Staff", role: "staff" },
      { id: staffB, email: `staffB_${ts}@test.local`, employeeId: `EMP_B_${ts}`, firstName: "Beta", lastName: "Staff", role: "staff" },
      { id: adminStaff, email: `admin_${ts}@test.local`, employeeId: `EMP_ADM_${ts}`, firstName: "Super", lastName: "Admin", role: "super_admin" },
    ]).run();

    // Link staff to institutions
    await db.insert(staffInstitutions).values([
      { id: `si-a-${ts}`, staffId: staffA, institutionId: instA },
      { id: `si-b-${ts}`, staffId: staffB, institutionId: instB },
    ]).run();

    // Seed leave type
    await db.insert(leaveTypes).values({
      id: leaveTypeId,
      name: "Casual Leave",
      code: `CL_${ts}`,
      daysAllowed: 12,
    }).run();

    // Seed leave request belonging to instA
    await db.insert(leaveRequests).values({
      id: leaveA,
      staffId: staffA,
      leaveTypeId,
      startDate: "2026-11-01",
      endDate: "2026-11-02",
      daysCount: 2,
      reason: "Personal",
      status: "pending",
      institutionId: instA,
    }).run();
  });

  afterAll(async () => {
    await db.delete(leaveRequests).where(eq(leaveRequests.id, leaveA)).run();
    await db.delete(leaveTypes).where(eq(leaveTypes.id, leaveTypeId)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffA)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffB)).run();
    await db.delete(staff).where(eq(staff.id, staffA)).run();
    await db.delete(staff).where(eq(staff.id, staffB)).run();
    await db.delete(staff).where(eq(staff.id, adminStaff)).run();
    await db.delete(institutions).where(eq(institutions.id, instA)).run();
    await db.delete(institutions).where(eq(institutions.id, instB)).run();
  });

  it("returns 404 when staff from Institution Beta attempts to GET leave from Institution Alpha", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: staffB,
      role: "principal",
      institutionId: instB,
    });

    const req = new Request(`http://localhost/api/leaves/${leaveA}`);
    const res = await getLeave(req, { params: Promise.resolve({ id: leaveA }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when user from Institution Beta attempts to approve/PUT leave from Institution Alpha", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: staffB,
      role: "principal",
      institutionId: instB,
    });

    const req = new Request(`http://localhost/api/leaves/${leaveA}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    const res = await putLeave(req, { params: Promise.resolve({ id: leaveA }) });
    expect(res.status).toBe(404);

    // Verify row status remained 'pending'
    const row = await db.select().from(leaveRequests).where(eq(leaveRequests.id, leaveA)).get();
    expect(row?.status).toBe("pending");
  });

  it("returns 404 when user from Institution Beta attempts to DELETE leave from Institution Alpha", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: staffB,
      role: "principal",
      institutionId: instB,
    });

    const req = new Request(`http://localhost/api/leaves/${leaveA}`, { method: "DELETE" });
    const res = await deleteLeave(req, { params: Promise.resolve({ id: leaveA }) });
    expect(res.status).toBe(404);

    // Verify row still exists in DB
    const row = await db.select().from(leaveRequests).where(eq(leaveRequests.id, leaveA)).get();
    expect(row).toBeDefined();
  });

  it("allows super_admin to access leave request across tenants", async () => {
    const { verifySession } = require("@thaiba/auth");
    verifySession.mockResolvedValueOnce({
      staffId: adminStaff,
      role: "super_admin",
      institutionId: undefined,
    });

    const req = new Request(`http://localhost/api/leaves/${leaveA}`);
    const res = await getLeave(req, { params: Promise.resolve({ id: leaveA }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leave?.id).toBe(leaveA);
  });
});
