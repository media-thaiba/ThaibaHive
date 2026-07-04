import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const leaves = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.staffId, session.staffId))
    .orderBy(desc(leaveRequests.createdAt))
    .limit(30)
    .all();
  return NextResponse.json({ leaves });
});

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { leaveTypeId, startDate, endDate, daysCount, reason } = body;

  if (!leaveTypeId || !startDate || !endDate || !daysCount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
});
