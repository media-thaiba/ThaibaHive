import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveRequestInstitution } from "@thaiba/auth";
import { eq, and, asc } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const institutionId = await resolveRequestInstitution(session, requestedInst);

  const where = institutionId && institutionId !== "global"
    ? and(eq(departments.isActive, true), eq(departments.institutionId, institutionId))
    : eq(departments.isActive, true);

  const all = await db
    .select({ id: departments.id, name: departments.name, institutionId: departments.institutionId })
    .from(departments)
    .where(where)
    .orderBy(asc(departments.name))
    .all();
  return NextResponse.json({ departments: all });
}, "announcements:read");
