import { db } from "@/db";
import { leaveBalances, leaveRequests } from "@/db/schema";
import { and, eq, gte, inArray, lte, ne, sql, type SQL } from "drizzle-orm";

type LedgerTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The SQLite/libSQL driver multiplexes one connection, so overlapping
 * interactive transactions collide with SQLITE_BUSY ("database is locked" /
 * "statements in progress"). Serialize every balance-mutating transaction
 * through this per-process queue. Multi-instance PostgreSQL deployments
 * keep their own row-level guards (unique index + capacity checks).
 */
let ledgerQueue: Promise<unknown> = Promise.resolve();

export function withLeaveLedgerLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = ledgerQueue.then(fn, fn);
  ledgerQueue = run.then(() => undefined, () => undefined);
  return run;
}

export class LeaveLedgerError extends Error {
  status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "LeaveLedgerError";
    this.status = status;
  }
}

/**
 * Leave entitlements are anchored to the calendar year in which the leave
 * STARTS, not the year the request happens to be approved in. A December
 * leave approved in January must deduct from the leave year's balance row.
 */
export function leaveYearFor(startDate: string): number {
  const year = Number(startDate.slice(0, 4));
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    throw new LeaveLedgerError("Invalid leave start date.", 400);
  }
  return year;
}

interface LedgerRef {
  staffId: string;
  leaveTypeId: string;
  year: number;
  days: number;
}

interface PendingRef {
  staffId: string;
  leaveTypeId: string;
  year: number;
  excludeId?: string;
}

interface OverlapRef {
  staffId: string;
  startDate: string;
  endDate: string;
  excludeId?: string;
}

/**
 * Atomically deducts leave days from the balance row for the leave year.
 * Throws LeaveLedgerError (409) when the deduction would exceed totalDays —
 * callers run this inside a transaction so the approval rolls back with it.
 */
export async function deductLeaveDays(tx: LedgerTx, ref: LedgerRef): Promise<void> {
  // Atomic check-and-deduct:
  // Evaluates remainingDays >= ref.days directly in the UPDATE predicate to eliminate
  // read-then-write race conditions under concurrent / multi-worker deployments.
  const updated = await tx
    .update(leaveBalances)
    .set({ usedDays: sql`${leaveBalances.usedDays} + ${ref.days}` })
    .where(
      and(
        eq(leaveBalances.staffId, ref.staffId),
        eq(leaveBalances.leaveTypeId, ref.leaveTypeId),
        eq(leaveBalances.year, ref.year),
        sql`${leaveBalances.totalDays} - ${leaveBalances.usedDays} >= ${ref.days}`
      )
    )
    .returning({
      id: leaveBalances.id,
      usedDays: leaveBalances.usedDays,
      totalDays: leaveBalances.totalDays,
    });

  const updatedRows = Array.isArray(updated) ? updated : (updated ? [updated] : []);
  if (updatedRows.length === 0) {
    // Determine whether the balance record is missing or balance is insufficient
    const existing = await tx
      .select({
        totalDays: leaveBalances.totalDays,
        usedDays: leaveBalances.usedDays,
      })
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, ref.staffId),
          eq(leaveBalances.leaveTypeId, ref.leaveTypeId),
          eq(leaveBalances.year, ref.year)
        )
      )
      .get();

    if (!existing) {
      throw new LeaveLedgerError(
        `Leave balance row not found for staffId=${ref.staffId}, leaveTypeId=${ref.leaveTypeId}, year=${ref.year}.`,
        404
      );
    }

    const remaining = Math.max(0, existing.totalDays - existing.usedDays);
    throw new LeaveLedgerError(
      `Insufficient leave balance. Requested: ${ref.days} days, Remaining: ${remaining} days.`,
      409
    );
  }
}

/**
 * Returns deducted days to the balance row (floored at 0) — used when an
 * approved leave is deleted. A no-op when no balance row exists.
 */
export async function creditLeaveDays(tx: LedgerTx, ref: LedgerRef): Promise<void> {
  await tx
    .update(leaveBalances)
    .set({
      usedDays: sql`CASE WHEN ${leaveBalances.usedDays} - ${ref.days} < 0 THEN 0 ELSE ${leaveBalances.usedDays} - ${ref.days} END`,
    })
    .where(
      and(
        eq(leaveBalances.staffId, ref.staffId),
        eq(leaveBalances.leaveTypeId, ref.leaveTypeId),
        eq(leaveBalances.year, ref.year)
      )
    )
    .run();
}

/**
 * Sums daysCount of other pending/hod_approved requests for the same staff/type/leave-year.
 * Pending days are reserved against the balance so concurrent submissions
 * cannot overcommit what approvers will later fund.
 */
export async function pendingDaysFor(tx: LedgerTx, ref: PendingRef): Promise<number> {
  const conditions: SQL[] = [
    eq(leaveRequests.staffId, ref.staffId),
    eq(leaveRequests.leaveTypeId, ref.leaveTypeId),
    inArray(leaveRequests.status, ["pending", "hod_approved"]),
    gte(leaveRequests.startDate, `${ref.year}-01-01`),
    lte(leaveRequests.startDate, `${ref.year}-12-31`),
  ];
  if (ref.excludeId) conditions.push(ne(leaveRequests.id, ref.excludeId));

  const row = await tx
    .select({ pending: sql<number>`coalesce(sum(${leaveRequests.daysCount}), 0)` })
    .from(leaveRequests)
    .where(and(...conditions))
    .get();

  return row?.pending ?? 0;
}

/** Statuses that occupy a calendar span for overlap/collision purposes. */
const BLOCKING_STATUSES = ["pending", "approved", "hod_approved"];

/**
 * True when another non-rejected request overlaps [startDate, endDate]
 * (inclusive on both ends — back-to-back leaves do not overlap).
 */
export async function hasOverlappingLeave(tx: LedgerTx, ref: OverlapRef): Promise<boolean> {
  const conditions: SQL[] = [
    eq(leaveRequests.staffId, ref.staffId),
    inArray(leaveRequests.status, BLOCKING_STATUSES),
    lte(leaveRequests.startDate, ref.endDate),
    gte(leaveRequests.endDate, ref.startDate),
  ];
  if (ref.excludeId) conditions.push(ne(leaveRequests.id, ref.excludeId));

  const existing = await tx
    .select({ id: leaveRequests.id, startDate: leaveRequests.startDate, endDate: leaveRequests.endDate })
    .from(leaveRequests)
    .where(and(...conditions))
    .get();

  return existing !== undefined;
}
