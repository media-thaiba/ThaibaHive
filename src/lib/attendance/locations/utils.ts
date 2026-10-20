import { db } from "@/db";
import { staffInstitutions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SessionPayload } from "@thaiba/auth";

const locationLocks = new Map<string, Promise<void>>();

/**
 * Mutex lock per location to prevent concurrent racing mutations.
 */
export async function withLocationLock<T>(locationId: string, fn: () => Promise<T>): Promise<T> {
  while (locationLocks.has(locationId)) {
    await locationLocks.get(locationId);
  }

  let release: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  locationLocks.set(locationId, lockPromise);

  try {
    return await fn();
  } finally {
    locationLocks.delete(locationId);
    release();
  }
}

/**
 * Resolve effective institution ID for tenant boundary enforcement.
 * Non-super_admins with "global" session scope fall back to their primary staffInstitutions affiliation.
 */
export async function getEffectiveInstitutionId(session: SessionPayload): Promise<string | null> {
  if (session.role === "super_admin") return "global";
  if (session.institutionId && session.institutionId !== "global") {
    return session.institutionId;
  }
  const membership = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .limit(1)
    .get();

  return membership?.institutionId || null;
}
