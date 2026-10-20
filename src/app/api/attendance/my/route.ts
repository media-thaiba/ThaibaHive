import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { localDateISO } from "@/lib/attendance/local-date";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || searchParams.get("from");
  const endDate = searchParams.get("endDate") || searchParams.get("to");

  // Validate and parse pagination parameters
  const rawOffset = searchParams.get("offset");
  let page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const offset = rawOffset !== null ? Math.max(0, parseInt(rawOffset, 10) || 0) : (page - 1) * limit;
  if (rawOffset !== null) {
    page = Math.floor(offset / limit) + 1;
  }

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
  const today = localDateISO();
  const todayLog = await db
    .select()
    .from(attendanceLogs)
    .where(and(eq(attendanceLogs.staffId, session.staffId), eq(attendanceLogs.date, today)))
    .get() ?? null;

  return NextResponse.json({
    logs,
    total,
    page,
    limit,
    todayLog,
    pagination: { total, limit, offset },
  });
}, "attendance:read");
