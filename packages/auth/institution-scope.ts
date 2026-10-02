import { verifySession, type SessionPayload } from "./session";
import { db, staffInstitutions } from "@thaiba/db";
import { eq } from "drizzle-orm";

export async function getUserInstitutionScope(): Promise<string | null> {
  const session = await verifySession();
  if (!session) return null;

  if (session.role === "super_admin" || session.role === "admin" || session.role === "system") {
    return null;
  }

  const userInstitution = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .limit(1);

  return userInstitution[0]?.institutionId ?? null;
}

export async function resolveScopedInstitutionId(requestedInstitutionId?: string | null): Promise<string> {
  const session = await verifySession();
  if (!session) {
    return requestedInstitutionId || "global";
  }

  if (session.role === "super_admin" || session.role === "admin" || session.role === "system") {
    return requestedInstitutionId || "global";
  }

  const userScope = await getUserInstitutionScope();
  if (userScope) {
    return userScope;
  }

  return requestedInstitutionId || "global";
}

export async function resolveInstitutionScopeForSession(session: SessionPayload | { staffId: string; role: string }): Promise<string | null> {
  if (session.role === "super_admin" || session.role === "admin" || session.role === "system") {
    return "global";
  }

  const userInstitution = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .limit(1);

  return userInstitution[0]?.institutionId ?? null;
}
