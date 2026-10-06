import { db } from "@/db";
import { leaveRequests, leaveTypes, staff, staffInstitutions, institutions } from "@/db/schema";
import { runInstitutionBackfill } from "../backfill-institution-ids";
import { eq } from "drizzle-orm";

describe("Institution ID Backfill Engine Unit & Idempotency Tests", () => {
  const ts = Date.now();
  const inst1 = `inst-bf-1-${ts}`;
  const inst2 = `inst-bf-2-${ts}`;
  const staffSingle = `staff-bf-single-${ts}`;
  const staffMulti = `staff-bf-multi-${ts}`;
  const leaveTypeId = `lt-bf-${ts}`;
  const leaveId1 = `leave-bf-1-${ts}`;
  const leaveId2 = `leave-bf-2-${ts}`;

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: inst1, name: "Backfill Inst 1", code: `BF1_${ts}` },
      { id: inst2, name: "Backfill Inst 2", code: `BF2_${ts}` },
    ]).run();

    // Seed staff
    await db.insert(staff).values([
      { id: staffSingle, email: `single_${ts}@test.local`, employeeId: `EMP_S_${ts}`, firstName: "Single", lastName: "Staff", role: "staff" },
      { id: staffMulti, email: `multi_${ts}@test.local`, employeeId: `EMP_M_${ts}`, firstName: "Multi", lastName: "Staff", role: "staff" },
    ]).run();

    // staffSingle linked to 1 institution
    await db.insert(staffInstitutions).values({
      id: `si-bf-1-${ts}`,
      staffId: staffSingle,
      institutionId: inst1,
    }).run();

    // staffMulti linked to 2 institutions
    await db.insert(staffInstitutions).values([
      { id: `si-bf-2a-${ts}`, staffId: staffMulti, institutionId: inst1 },
      { id: `si-bf-2b-${ts}`, staffId: staffMulti, institutionId: inst2 },
    ]).run();

    // Seed leave type
    await db.insert(leaveTypes).values({
      id: leaveTypeId,
      name: "Sick Leave",
      code: `SL_${ts}`,
      daysAllowed: 10,
    }).run();

    // Seed unassigned leave requests (institutionId = NULL)
    await db.insert(leaveRequests).values([
      {
        id: leaveId1,
        staffId: staffSingle,
        leaveTypeId,
        startDate: "2026-11-10",
        endDate: "2026-11-11",
        daysCount: 1,
        reason: "Test backfill single",
        status: "pending",
        institutionId: null,
      },
      {
        id: leaveId2,
        staffId: staffMulti,
        leaveTypeId,
        startDate: "2026-11-12",
        endDate: "2026-11-13",
        daysCount: 1,
        reason: "Test backfill multi",
        status: "pending",
        institutionId: null,
      },
    ]).run();
  });

  afterAll(async () => {
    await db.delete(leaveRequests).where(eq(leaveRequests.id, leaveId1)).run();
    await db.delete(leaveRequests).where(eq(leaveRequests.id, leaveId2)).run();
    await db.delete(leaveTypes).where(eq(leaveTypes.id, leaveTypeId)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffSingle)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffMulti)).run();
    await db.delete(staff).where(eq(staff.id, staffSingle)).run();
    await db.delete(staff).where(eq(staff.id, staffMulti)).run();
    await db.delete(institutions).where(eq(institutions.id, inst1)).run();
    await db.delete(institutions).where(eq(institutions.id, inst2)).run();
  });

  it("dry run does not mutate database records", async () => {
    const dryReport = await runInstitutionBackfill({ apply: false });
    expect(dryReport.dryRun).toBe(true);
    expect(dryReport.totalAmbiguous).toBeGreaterThanOrEqual(1);

    // Verify row 1 still has null institutionId
    const row1 = await db.select().from(leaveRequests).where(eq(leaveRequests.id, leaveId1)).get();
    expect(row1?.institutionId).toBeNull();
  });

  it("apply mode populates unambiguous staff actor and skips ambiguous multi-institution actors", async () => {
    const report1 = await runInstitutionBackfill({ apply: true });
    expect(report1.dryRun).toBe(false);
    expect(report1.totalUpdated).toBeGreaterThanOrEqual(1);
    expect(report1.totalAmbiguous).toBeGreaterThanOrEqual(1);

    // Verify row 1 (single institution) got assigned inst1
    const row1 = await db.select().from(leaveRequests).where(eq(leaveRequests.id, leaveId1)).get();
    expect(row1?.institutionId).toBe(inst1);

    // Verify row 2 (ambiguous multi-institution) was SKIPPED to avoid arbitrary guessing
    const row2 = await db.select().from(leaveRequests).where(eq(leaveRequests.id, leaveId2)).get();
    expect(row2?.institutionId).toBeNull();

    // Verify second run is fully idempotent (0 updates)
    const report2 = await runInstitutionBackfill({ apply: true });
    expect(report2.totalUpdated).toBe(0);
  });
});
