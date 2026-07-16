import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests, leaveBalances } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { leaveCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const leaves = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.staffId, session.staffId))
    .orderBy(desc(leaveRequests.createdAt))
    .limit(30)
    .all();

  return NextResponse.json({ leaves });
}, "leaves:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = leaveCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { leaveTypeId, startDate, endDate, daysCount, reason } = parsed.data;

  // Validate balance
  const year = new Date().getFullYear();
  const balance = await db
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
    return NextResponse.json(
      { error: "No leave balance configured for this leave type for the current year." },
      { status: 400 }
    );
  }

  const remaining = balance.totalDays - balance.usedDays;
  if (remaining < daysCount) {
    return NextResponse.json(
      {
        error: `Insufficient leave balance. Requested: ${daysCount} days, Remaining: ${remaining} days.`,
      },
      { status: 400 }
    );
  }

  const leave = await db
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

  return NextResponse.json({ leave }, { status: 201 });
}, "leaves:read");