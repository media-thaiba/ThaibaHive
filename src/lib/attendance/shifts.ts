import { db } from "@/db";
import { shifts, staffShifts, staffDepartments } from "@/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";

export const DEFAULT_SHIFT = {
  id: "default",
  name: "Default General Shift",
  startTime: "09:00",
  endTime: "17:00",
  gracePeriodMinutes: 15,
};

export async function resolveShift(staffId: string, date: string) {
  // 1. Staff-specific shift assignment (most recent effectiveFrom <= date)
  const staffAssignments = await db
    .select({
      shiftId: staffShifts.shiftId,
      effectiveFrom: staffShifts.effectiveFrom,
      effectiveTo: staffShifts.effectiveTo,
    })
    .from(staffShifts)
    .where(
      and(
        eq(staffShifts.staffId, staffId),
        lte(staffShifts.effectiveFrom, date)
      )
    )
    .orderBy(desc(staffShifts.effectiveFrom))
    .all();

  // Find the latest assignment that covers this date
  const activeAssignment = staffAssignments.find(
    (a) => !a.effectiveTo || a.effectiveTo >= date
  );

  if (activeAssignment) {
    const shift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, activeAssignment.shiftId))
      .get();
    if (shift?.isActive) return shift;
  }

  // 2. Department-level shift
  const staffDept = await db
    .select({ departmentId: staffDepartments.departmentId })
    .from(staffDepartments)
    .where(eq(staffDepartments.staffId, staffId))
    .limit(1)
    .get();

  if (staffDept?.departmentId) {
    const deptShift = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.departmentId, staffDept.departmentId),
          eq(shifts.isActive, true)
        )
      )
      .get();
    if (deptShift) return deptShift;
  }

  // 3. System-wide default shift (applicableToAll)
  const defaultShift = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.applicableToAll, true), eq(shifts.isActive, true)))
    .get();
  if (defaultShift) return defaultShift;

  // 4. Hardcoded fallback
  return DEFAULT_SHIFT;
}
