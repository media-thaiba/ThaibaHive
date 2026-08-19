import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests, leaveBalances } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { leaveCreateSchema, paginationSchema } from "@/lib/validation/schemas";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const pagination = paginationSchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const conditions = [eq(leaveRequests.staffId, session.staffId)];
  if (startDate) conditions.push(gte(leaveRequests.startDate, startDate));
  if (endDate) conditions.push(lte(leaveRequests.endDate, endDate));
  const whereClause = and(...conditions);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(leaveRequests)
    .where(whereClause)
    .get();
  const total = countResult?.count ?? 0;

  const leaves = await db
    .select()
    .from(leaveRequests)
    .where(whereClause)
    .orderBy(desc(leaveRequests.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({ leaves, total, page, limit });
}, "leaves:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json();
  const parsed = leaveCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { leaveTypeId, startDate, endDate, daysCount, reason } = parsed.data;
  const year = new Date().getFullYear();

  // Atomic transaction to eliminate race conditions between balance check and insertion
  const result = await db.transaction(async (tx) => {
    const balance = await tx
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, session.staffId),
          eq(leaveBalances.leaveTypeId, leaveTypeId),
          eq(leaveBalances.year, year)
        )
      )
      .get();

    if (!balance) {
      return {
        error: "No leave balance configured for this leave type for the current year.",
        status: 400,
      };
    }

    const remaining = balance.totalDays - balance.usedDays;
    if (remaining < daysCount) {
      return {
        error: `Insufficient leave balance. Requested: ${daysCount} days, Remaining: ${remaining} days.`,
        status: 400,
      };
    }

    const leave = await tx
      .insert(leaveRequests)
      .values({
        id: crypto.randomUUID(),
        staffId: session.staffId,
        leaveTypeId,
        startDate,
        endDate,
        daysCount,
        reason,
        status: "pending",
      })
      .returning()
      .get();

    return { leave, status: 201 };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ leave: result.leave }, { status: 201 });
}, "leaves:read");