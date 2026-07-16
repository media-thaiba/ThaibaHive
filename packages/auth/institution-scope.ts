import { verifySession } from "./session";
import { db, staffInstitutions } from "@thaiba/db";
import { eq } from "drizzle-orm";

export async function getUserInstitutionScope(): Promise<string | null> {
  const session = await verifySession();
  if (!session) return null;

  if (session.role === "super_admin" || session.role === "admin") {
    return null;
  }

  const userInstitution = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .limit(1);

  return userInstitution[0]?.institutionId ?? null;
}
