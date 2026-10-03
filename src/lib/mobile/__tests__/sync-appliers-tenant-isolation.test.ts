import { db } from "@/db";
import {
  institutions,
  leaveBalances,
  leaveRequests,
  leaveTypes,
  staff,
  staffInstitutions,
} from "@/db/schema";
import { applySyncMutation } from "../sync-appliers";
import { eq } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockResolvedValue(null),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Mobile Sync Appliers Cross-Tenant Isolation", () => {
  const ts = Date.now();
  const instA = `inst-a-${ts}`;
  const instB = `inst-b-${ts}`;
  const staffA = `staff-a-${ts}`;
  const staffA2 = `staff-a2-${ts}`;
  const staffB = `staff-b-${ts}`;
  const adminStaff = `staff-adm-${ts}`;
  const leaveTypeId = `lt-${ts}`;
  const leaveA = `leave-a-${ts}`;
  const leaveA2 = `leave-a2-${ts}`;
  const leaveA3 = `leave-a3-${ts}`;
  const leaveA4 = `leave-a4-${ts}`;
  const year = new Date().getFullYear();

  const ctxB = { staffId: staffB, role: "principal", institutionId: instB };
  const ctxA2 = { staffId: staffA2, role: "principal", institutionId: instA };
  const ctxGlobal = { staffId: adminStaff, role: "super_admin", institutionId: "global" };

  const newLeave = (id: string, requester: string) => ({
    id,
    staffId: requester,
    leaveTypeId,
    startDate: "2026-12-01",
    endDate: "2026-12-02",
    daysCount: 2,
    reason: "Sync tenant isolation",
    status: "pending",
    institutionId: instA,
  });

  const getStatus = async (id: string) => {
    const row = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();
    return row?.status;
  };

  beforeAll(async () => {
    await db
      .insert(institutions)
      .values([
        { id: instA, name: "Institution Alpha", code: `ALPHA_${ts}` },
        { id: instB, name: "Institution Beta", code: `BETA_${ts}` },
      ])
      .run();

    await db
      .insert(staff)
      .values([
        {
          id: staffA,
          email: `syncA_${ts}@test.local`,
          employeeId: `SYNC_A_${ts}`,
          firstName: "Alpha",
          lastName: "One",
          role: "staff",
        },
        {
          id: staffA2,
          email: `syncA2_${ts}@test.local`,
          employeeId: `SYNC_A2_${ts}`,
          firstName: "Alpha",
          lastName: "Two",
          role: "principal",
        },
        {
          id: staffB,
          email: `syncB_${ts}@test.local`,
          employeeId: `SYNC_B_${ts}`,
          firstName: "Beta",
          lastName: "One",
          role: "principal",
        },
        {
          id: adminStaff,
          email: `syncAdm_${ts}@test.local`,
          employeeId: `SYNC_ADM_${ts}`,
          firstName: "Global",
          lastName: "Admin",
          role: "super_admin",
        },
      ])
      .run();

    await db
      .insert(staffInstitutions)
      .values([
        { id: `si-a-${ts}`, staffId: staffA, institutionId: instA },
        { id: `si-a2-${ts}`, staffId: staffA2, institutionId: instA },
        { id: `si-b-${ts}`, staffId: staffB, institutionId: instB },
      ])
      .run();

    await db
      .insert(leaveTypes)
      .values({ id: leaveTypeId, name: "Sync Casual", code: `SC_${ts}`, daysAllowed: 12 })
      .run();

    await db
      .insert(leaveBalances)
      .values({
        id: `lb-${ts}`,
        staffId: staffA,
        leaveTypeId,
        totalDays: 12,
        usedDays: 0,
        year,
      })
      .run();

    await db
      .insert(leaveRequests)
      .values([
        newLeave(leaveA, staffA),
        newLeave(leaveA2, staffA),
        newLeave(leaveA3, staffA),
        newLeave(leaveA4, staffA),
      ])
      .run();
  });

  afterAll(async () => {
    for (const id of [leaveA, leaveA2, leaveA3, leaveA4]) {
      await db.delete(leaveRequests).where(eq(leaveRequests.id, id)).run();
    }
    await db.delete(leaveBalances).where(eq(leaveBalances.id, `lb-${ts}`)).run();
    await db.delete(leaveTypes).where(eq(leaveTypes.id, leaveTypeId)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.id, `si-a-${ts}`)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.id, `si-a2-${ts}`)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.id, `si-b-${ts}`)).run();
    await db.delete(staff).where(eq(staff.id, staffA)).run();
    await db.delete(staff).where(eq(staff.id, staffA2)).run();
    await db.delete(staff).where(eq(staff.id, staffB)).run();
    await db.delete(staff).where(eq(staff.id, adminStaff)).run();
    await db.delete(institutions).where(eq(institutions.id, instA)).run();
    await db.delete(institutions).where(eq(institutions.id, instB)).run();
  });

  it("blocks approval of a leave request owned by another institution", async () => {
    await expect(
      applySyncMutation(ctxB, "approval_approve", { type: "leave", id: leaveA })
    ).rejects.toThrow("Leave request not found");

    expect(await getStatus(leaveA)).toBe("pending");
  });

  it("allows a same-institution principal to advance the request", async () => {
    await applySyncMutation(ctxA2, "approval_approve", { type: "leave", id: leaveA2 });

    expect(await getStatus(leaveA2)).toBe("hod_approved");
  });

  it("keeps global scope able to review across tenants", async () => {
    await applySyncMutation(ctxGlobal, "approval_reject", { type: "leave", id: leaveA3 });

    expect(await getStatus(leaveA3)).toBe("rejected");
  });

  it("blocks leave_cancel from another institution even for the owning staff id", async () => {
    await expect(
      applySyncMutation({ staffId: staffA, role: "staff", institutionId: instB }, "leave_cancel", {
        id: leaveA4,
      })
    ).rejects.toThrow("not found");

    expect(await getStatus(leaveA4)).toBe("pending");
  });

  it("stamps the session institution on leave_apply inserts", async () => {
    const reason = `Sync scope stamp ${ts}`;

    await applySyncMutation(
      { staffId: staffA, role: "staff", institutionId: instA },
      "leave_apply",
      {
        leave_type_id: leaveTypeId,
        start_date: "2026-12-05",
        end_date: "2026-12-06",
        days: 1,
        reason,
      }
    );

    const row = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.reason, reason))
      .get();
    expect(row?.institutionId).toBe(instA);

    await db.delete(leaveRequests).where(eq(leaveRequests.reason, reason)).run();
  });
});
