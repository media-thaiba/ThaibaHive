import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { reportHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getActorInstitutionIds } from "@/lib/api/tenant-scope";

export const GET = requireAuth(async (request, session) => {
  const { staffId } = session;

  const actorInstIds = await getActorInstitutionIds(staffId);
  const institutionId = Array.from(actorInstIds)[0];

  if (!institutionId) {
    return NextResponse.json({ error: "Institution ID is required" }, { status: 400 });
  }

  const history = await db
    .select()
    .from(reportHistory)
    .where(eq(reportHistory.institutionId, institutionId))
    .orderBy(desc(reportHistory.generatedAt))
    .limit(50)
    .all();

  return NextResponse.json({ history });
}, "reports:read");
