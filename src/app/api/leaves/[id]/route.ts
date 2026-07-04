import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests, leaveBalances } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const PUT = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const leave = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.status) {
    updates.status = body.status;
    updates.reviewedById = session.staffId;
    updates.reviewedAt = new Date().toISOString();
    updates.reviewNotes = body.reviewNotes || null;

    if (body.status === "approved") {
      const existing = await db
        .select()
        .from(leaveBalances)
        .where(and(eq(leaveBalances.staffId, leave.staffId), eq(leaveBalances.leaveTypeId, leave.leaveTypeId), eq(leaveBalances.year, new Date().getFullYear())))
        .get();

      if (existing) {
        await db
          .update(leaveBalances)
          .set({ usedDays: existing.usedDays + leave.daysCount })
          .where(eq(leaveBalances.id, existing.id))
          .run();
      }
    }
  }

  const updated = await db
    .update(leaveRequests)
    .set(updates)
    .where(eq(leaveRequests.id, id))
    .returning()
    .get();

  return NextResponse.json({ leave: updated });
}, "leaves:approve");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  await db.delete(leaveRequests).where(eq(leaveRequests.id, id)).run();
  return NextResponse.json({ success: true });
});
