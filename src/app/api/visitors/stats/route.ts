import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitors } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { eq, and, sql } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, searchParams.get("institutionId"));
  const scopeCond = institutionId && institutionId !== "global"
    ? eq(visitors.institutionId, institutionId)
    : undefined;
  const today = new Date().toISOString().split("T")[0];

  const [checkedIn] = await db
    .select({ count: sql<number>`count(*)` })
    .from(visitors)
    .where(and(eq(visitors.status, "checked_in"), scopeCond))
    .all();
  const [checkedOut] = await db
    .select({ count: sql<number>`count(*)` })
    .from(visitors)
    .where(and(eq(visitors.status, "checked_out"), scopeCond))
    .all();
  const [todayVisitors] = await db
    .select({ count: sql<number>`count(*)` })
    .from(visitors)
    .where(and(sql`date(${visitors.checkIn}) = ${today}`, scopeCond))
    .all();

  return NextResponse.json({
    checkedIn: checkedIn.count,
    checkedOut: checkedOut.count,
    todayVisitors: todayVisitors.count,
  });
}, "visitors:read");
