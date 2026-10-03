import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Validate and parse pagination parameters
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);
  const offset = (page - 1) * limit;

  const conditions = [eq(attendanceLogs.staffId, session.staffId)];
  if (startDate) conditions.push(gte(attendanceLogs.date, startDate));
  if (endDate) conditions.push(lte(attendanceLogs.date, endDate));

  // Get total count of matching logs
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(attendanceLogs)
    .where(and(...conditions))
    .get();
  
  const total = countResult?.count ?? 0;

  // Fetch paginated logs
  const logs = await db
    .select()
    .from(attendanceLogs)
    .where(and(...conditions))
    .orderBy(desc(attendanceLogs.date))
    .limit(limit)
    .offset(offset)
    .all();

  // Query today's log separately to ensure it is always returned correctly regardless of page/limit offset
  const today = new Date().toISOString().split("T")[0];
  const todayLog = await db
    .select()
    .from(attendanceLogs)
    .where(and(eq(attendanceLogs.staffId, session.staffId), eq(attendanceLogs.date, today)))
    .get() ?? null;

  return NextResponse.json({ logs, total, page, limit, todayLog });
}, "attendance:read");
