import { NextResponse } from "next/server";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { eq, and, sql } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId"));
  const conditions = [eq(assets.isActive, true)];

  if (institutionId && institutionId !== "global") {
    conditions.push(eq(assets.institutionId, institutionId));
  }

  // Non-manager restriction
  const isManager = ["super_admin", "admin", "principal", "hod"].includes(session.role);
  if (!isManager) {
    if (!session.staffId) {
      return NextResponse.json({ byStatus: [], byType: [] });
    }
    conditions.push(eq(assets.assignedToId, session.staffId));
  }

  const whereClause = and(...conditions);

  const byStatus = await db
    .select({
      status: assets.status,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(assets)
    .where(whereClause)
    .groupBy(assets.status)
    .all();

  const byType = await db
    .select({
      type: assets.type,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(assets)
    .where(whereClause)
    .groupBy(assets.type)
    .all();

  return NextResponse.json({ byStatus, byType });
}, "assets:read");
