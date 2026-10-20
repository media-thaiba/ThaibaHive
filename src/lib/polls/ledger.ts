/**
 * Interactive Polls & Decision Governance Engine
 *
 * Provides:
 * 1. Serialized per-poll mutation mutex (withPollLock).
 * 2. Serialized per-user-poll voting mutex (withPollVoteLock).
 * 3. Safe option deserialization (parsePollOptions).
 * 4. Multi-tenant audience access evaluation (canAccessPoll).
 * 5. Administrative lifecycle governance (canManagePoll).
 * 6. Tenant scope resolution (resolvePollScope).
 */

import { db } from "@/db";
import { staffDepartments, staffInstitutions } from "@/db/schema";
import { eq } from "drizzle-orm";

const pollLocks = new Map<string, Promise<unknown>>();
const voteLocks = new Map<string, Promise<unknown>>();

/**
 * Serializes modifications to a specific poll to eliminate concurrent update races.
 */
export async function withPollLock<T>(pollId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = pollLocks.get(pollId) ?? Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  pollLocks.set(pollId, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (pollLocks.get(pollId) === nextLock) {
      pollLocks.delete(pollId);
    }
  }
}

/**
 * Serializes voting operations per user per poll to prevent duplicate vote insertion races.
 */
export async function withPollVoteLock<T>(pollId: string, staffId: string, fn: () => Promise<T>): Promise<T> {
  const key = `${pollId}:${staffId}`;
  const currentLock = voteLocks.get(key) ?? Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  voteLocks.set(key, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (voteLocks.get(key) === nextLock) {
      voteLocks.delete(key);
    }
  }
}

/**
 * Safely parses poll options from JSON string or array.
 */
export function parsePollOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => (typeof item === "string" ? item : String(item)));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === "string" ? item : String(item)));
      }
    } catch {
      return [];
    }
  }
  return [];
}

export interface PollSessionContext {
  role?: string;
  staffId?: string;
  institutionId?: string | null;
}

export interface PollRecord {
  id: string;
  targetRole?: string | null;
  targetDepartmentId?: string | null;
  targetInstitutionId?: string | null;
  createdById: string;
  isActive: boolean;
  expiresAt?: string | null;
}

/**
 * Resolves the verified institution scope for a poll session.
 * - super_admin => "global".
 * - admin / principal / staff => verified institutionId from session or staffInstitutions.
 */
export async function resolvePollScope(session: PollSessionContext): Promise<string> {
  if (session.role === "super_admin") return "global";
  if (session.institutionId && session.institutionId !== "global") {
    return session.institutionId;
  }
  if (session.staffId) {
    const memberships = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .limit(1);
    if (memberships[0]?.institutionId) {
      return memberships[0].institutionId;
    }
  }
  return "global";
}

/**
 * Validates whether the caller has permission to view/vote on a poll.
 */
export async function canAccessPoll(
  poll: PollRecord,
  session: PollSessionContext,
  scopedInstId: string
): Promise<boolean> {
  if (session.role === "super_admin") return true;

  // Institutional boundary check
  if (scopedInstId !== "global" && poll.targetInstitutionId && poll.targetInstitutionId !== scopedInstId) {
    return false;
  }

  // Admin and Principal can access all polls within their institution
  if (session.role === "admin" || session.role === "principal") {
    return true;
  }

  // Non-managers must match targeting filters
  if (poll.targetRole && poll.targetRole !== session.role) {
    return false;
  }

  if (session.staffId && poll.targetDepartmentId) {
    const deptRows = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staffDepartments)
      .where(eq(staffDepartments.staffId, session.staffId))
      .all();
    const deptIds = deptRows.map((d) => d.departmentId);
    if (!deptIds.includes(poll.targetDepartmentId)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates whether the caller has administrative permission to edit, close, or delete a poll.
 */
export function canManagePoll(
  poll: PollRecord,
  session: PollSessionContext,
  scopedInstId: string
): boolean {
  if (session.role === "super_admin") return true;

  // Cross-tenant boundary block
  if (scopedInstId !== "global" && poll.targetInstitutionId && poll.targetInstitutionId !== scopedInstId) {
    return false;
  }

  // Institutional admin or principal
  if (session.role === "admin" || session.role === "principal") {
    return true;
  }

  // Creator can manage their own poll within their institution
  if (session.staffId && poll.createdById === session.staffId) {
    return true;
  }

  return false;
}
