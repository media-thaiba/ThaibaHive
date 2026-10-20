import { db } from "@/db";
import { staffInstitutions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * In-memory serialization mutex keyed by grievance ID.
 * Guarantees that concurrent reviews, status transitions, and deletion requests
 * on the exact same grievance execute strictly sequentially.
 */
const grievanceLocks = new Map<string, Promise<void>>();

export async function withGrievanceLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = grievanceLocks.get(id) ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  grievanceLocks.set(id, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (grievanceLocks.get(id) === nextLock) {
      grievanceLocks.delete(id);
    }
  }
}

export function isTerminalGrievanceStatus(status: string): boolean {
  return ["resolved", "dismissed"].includes(status);
}

/**
 * Validates whether a viewer is authorized to inspect or manage a specific grievance.
 * Enforces fail-closed IDOR protection:
 * - Super admin can view all.
 * - Submitter can always view their own non-anonymous submission.
 * - Institutional managers (admin, principal, hod) can only view if the submitter
 *   belongs to their institution (via staffInstitutions).
 */
export async function canAccessGrievance(
  viewerStaffId: string,
  viewerRole: string,
  viewerInstitutionId: string | null | undefined,
  grievanceStaffId: string | null | undefined,
  isAnonymous: boolean
): Promise<boolean> {
  if (viewerRole === "super_admin") return true;

  // The submitter can view their own non-anonymous grievance
  if (!isAnonymous && grievanceStaffId && grievanceStaffId === viewerStaffId) {
    return true;
  }

  // Institutional managers (admin, principal, hod)
  const isManager = ["admin", "principal", "hod"].includes(viewerRole);
  if (!isManager) {
    return false;
  }

  // If grievance has a known submitter and viewer is institution-scoped, verify institutional boundary
  if (grievanceStaffId && viewerInstitutionId && viewerInstitutionId !== "global") {
    const link = await db
      .select({ id: staffInstitutions.id })
      .from(staffInstitutions)
      .where(
        and(
          eq(staffInstitutions.staffId, grievanceStaffId),
          eq(staffInstitutions.institutionId, viewerInstitutionId)
        )
      )
      .get();

    return Boolean(link);
  }

  // If viewer is global admin or grievance is anonymous without explicit submitter link
  return isManager;
}
