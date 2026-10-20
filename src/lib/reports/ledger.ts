/**
 * Daily Reports & Productivity Concurrency & Institutional Ledger Engine
 *
 * Provides concurrency mutex locks, multi-tenant institutional isolation,
 * segregation of duties (self-review prevention), and deletion validation.
 */

import { db } from "@/db";
import { staffInstitutions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SessionPayload } from "@thaiba/auth";

// In-memory mutex per daily report ID to serialize updates and reviews
const reportLocks = new Map<string, Promise<unknown>>();

export async function withReportLock<T>(reportId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = reportLocks.get(reportId) || Promise.resolve();
  let release: () => void = () => {};

  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  reportLocks.set(
    reportId,
    currentLock.then(() => newLock)
  );

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (reportLocks.get(reportId) === newLock) {
      reportLocks.delete(reportId);
    }
  }
}

/**
 * Retrieves the primary institution ID of a staff member.
 */
export async function getStaffInstitutionId(staffId: string): Promise<string | null> {
  if (!staffId) return null;
  const row = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, staffId))
    .limit(1);

  return row[0]?.institutionId || null;
}

/**
 * Checks whether the caller is permitted to review a given daily report.
 * Segregation of duties: Reviewer CANNOT be the report submitter.
 */
export function canReviewDailyReport(
  session: SessionPayload,
  reportStaffId: string
): { allowed: boolean; reason?: string } {
  // Reviewer cannot review their own report
  if (session.staffId === reportStaffId) {
    return { allowed: false, reason: "You cannot review your own daily report" };
  }

  // Super admin can review anyone's report (except their own)
  if (session.role === "super_admin") {
    return { allowed: true };
  }

  // Institutional managers (admin, principal, hod)
  if (["admin", "principal", "hod"].includes(session.role)) {
    return { allowed: true };
  }

  return { allowed: false, reason: "Insufficient permissions to review reports" };
}
