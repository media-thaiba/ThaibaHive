/**
 * Tasks & Workflow Management Ledger & Concurrency Engine
 *
 * Provides concurrency mutex locks, multi-tenant institutional validation,
 * staff affiliation verification, and status completion lifecycle helpers.
 */

import { db } from "@/db";
import { staffInstitutions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { SessionPayload } from "@thaiba/auth";

// Per-task in-memory mutex to serialize concurrent modifications
const taskLocks = new Map<string, Promise<unknown>>();

export async function withTaskLock<T>(taskId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = taskLocks.get(taskId) || Promise.resolve();
  let release: () => void = () => {};

  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  taskLocks.set(
    taskId,
    currentLock.then(() => newLock)
  );

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (taskLocks.get(taskId) === newLock) {
      taskLocks.delete(taskId);
    }
  }
}

/**
 * Validates that an assigned staff member belongs to the given institution.
 * Returns true if affiliated, false otherwise.
 */
export async function verifyTaskStaffAffiliation(
  staffId: string,
  institutionId: string
): Promise<boolean> {
  if (!staffId || !institutionId) return false;

  const affiliation = await db
    .select({ id: staffInstitutions.id })
    .from(staffInstitutions)
    .where(
      and(
        eq(staffInstitutions.staffId, staffId),
        eq(staffInstitutions.institutionId, institutionId)
      )
    )
    .limit(1);

  return affiliation.length > 0;
}

/**
 * Resolves the institutional scope of a task actor.
 * For non-super_admin users, returns their primary institution from session.institutionId
 * or from staffInstitutions if not set on the token.
 */
export async function resolveActorInstitution(session: {
  role: string;
  staffId: string;
  institutionId?: string | null;
}): Promise<string | null> {
  if (session.role === "super_admin") return null;

  if (session.institutionId && session.institutionId !== "global") {
    return session.institutionId;
  }

  const membership = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .limit(1);

  return membership[0]?.institutionId || null;
}

/**
 * Checks whether the current session user has authority to manage (edit/delete) a given task.
 * - super_admin: can manage all
 * - admin / principal / hod: can manage within their scoped institution
 * - regular staff: can manage only if they created the task (assignedById === staffId)
 */
export function canManageTask(
  session: SessionPayload,
  task: {
    institutionId: string;
    assignedById: string;
    assignedToId: string;
  },
  scopedInstId?: string | null
): boolean {
  if (session.role === "super_admin") return true;

  // Institutional boundary check for scoped roles
  if (scopedInstId && task.institutionId && task.institutionId !== scopedInstId) {
    return false;
  }

  // Institutional managers
  if (["admin", "principal", "hod"].includes(session.role)) {
    return true;
  }

  // Task creator can manage their own created task
  if (session.staffId && task.assignedById === session.staffId) {
    return true;
  }

  return false;
}

/**
 * Helper to compute completedAt timestamp based on status transition.
 */
export function computeCompletedAt(
  newStatus?: string,
  currentCompletedAt?: string | null
): string | null | undefined {
  if (newStatus === "completed") {
    return currentCompletedAt || new Date().toISOString();
  }
  if (newStatus && newStatus !== "completed") {
    return null;
  }
  return undefined;
}
