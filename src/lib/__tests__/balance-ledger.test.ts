import { db } from "@/db";
import { leaveBalances, staff, leaveTypes } from "@/db/schema";
import { deductLeaveDays, LeaveLedgerError } from "../leaves/balance-ledger";
import { eq, and } from "drizzle-orm";

describe("Leave Balance Ledger Concurrency & Correctness", () => {
  const testStaffId = "staff-test-ledger-01";
  const testLeaveTypeId = "lt-annual-test";
  const testYear = 2026;

  beforeAll(async () => {
    // Seed staff and leaveType if missing
    await db
      .insert(staff)
      .values({
        id: testStaffId,
        employeeId: "EMP-TEST-LEDGER",
        firstName: "Ledger",
        lastName: "Tester",
        email: "ledger.tester@example.com",
        role: "staff",
      })
      .onConflictDoNothing();

    await db
      .insert(leaveTypes)
      .values({
        id: testLeaveTypeId,
        name: "Annual Leave",
        code: "AL",
        daysAllowed: 20,
      })
      .onConflictDoNothing();
  });

  beforeEach(async () => {
    // Reset leave balance row to 10 total days, 0 used days
    await db
      .delete(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, testStaffId),
          eq(leaveBalances.leaveTypeId, testLeaveTypeId),
          eq(leaveBalances.year, testYear)
        )
      );

    await db.insert(leaveBalances).values({
      id: `bal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      staffId: testStaffId,
      leaveTypeId: testLeaveTypeId,
      year: testYear,
      totalDays: 10,
      usedDays: 0,
    });
  });

  afterAll(async () => {
    await db
      .delete(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, testStaffId),
          eq(leaveBalances.leaveTypeId, testLeaveTypeId),
          eq(leaveBalances.year, testYear)
        )
      );
  });

  it("successfully and atomically deducts leave days when balance is sufficient", async () => {
    await db.transaction(async (tx) => {
      await deductLeaveDays(tx, {
        staffId: testStaffId,
        leaveTypeId: testLeaveTypeId,
        year: testYear,
        days: 4,
      });
    });

    const bal = await db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, testStaffId),
          eq(leaveBalances.leaveTypeId, testLeaveTypeId),
          eq(leaveBalances.year, testYear)
        )
      )
      .get();

    expect(bal?.usedDays).toBe(4);
  });

  it("throws 409 Insufficient leave balance when deduction exceeds totalDays", async () => {
    await expect(
      db.transaction(async (tx) => {
        await deductLeaveDays(tx, {
          staffId: testStaffId,
          leaveTypeId: testLeaveTypeId,
          year: testYear,
          days: 15, // 15 > 10 total days
        });
      })
    ).rejects.toThrow(LeaveLedgerError);
  });

  it("throws 404 when balance record does not exist", async () => {
    await expect(
      db.transaction(async (tx) => {
        await deductLeaveDays(tx, {
          staffId: "non-existent-staff",
          leaveTypeId: testLeaveTypeId,
          year: testYear,
          days: 1,
        });
      })
    ).rejects.toThrow(LeaveLedgerError);
  });

  it("prevents over-deduction under sequential requests that sum to > totalDays", async () => {
    await db.transaction(async (tx) => {
      await deductLeaveDays(tx, {
        staffId: testStaffId,
        leaveTypeId: testLeaveTypeId,
        year: testYear,
        days: 6,
      });
    });

    // Second deduction of 5 days: 6 + 5 = 11 > 10 => must fail
    await expect(
      db.transaction(async (tx) => {
        await deductLeaveDays(tx, {
          staffId: testStaffId,
          leaveTypeId: testLeaveTypeId,
          year: testYear,
          days: 5,
        });
      })
    ).rejects.toThrow(/Insufficient leave balance/);

    const bal = await db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, testStaffId),
          eq(leaveBalances.leaveTypeId, testLeaveTypeId),
          eq(leaveBalances.year, testYear)
        )
      )
      .get();

    // Verify usedDays remains intact at 6
    expect(bal?.usedDays).toBe(6);
  });
});
