import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { leaveRequests, leaveBalances } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { isAuthorizedToViewLeave } from "@/lib/leaves/utils";
import { sendPushNotification } from "@/lib/notifications/push-service";
import { eq, and, ne } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const leave = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const authorized = await isAuthorizedToViewLeave(session.staffId, session.role, leave.staffId);
  if (!authorized) {
    return NextResponse.json({ error: "You are not authorized to view this leave request" }, { status: 403 });
  }

  return NextResponse.json({ leave });
}, "leaves:read");

export const PUT = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const leave = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (leave.staffId === session.staffId) {
    return NextResponse.json({ error: "Cannot approve your own leave" }, { status: 403 });
  }

  if (leave.status === "approved" || leave.status === "rejected") {
    return NextResponse.json(
      { error: `Leave request is already ${leave.status}` },
      { status: 400 }
    );
  }

  const authorized = await isAuthorizedToViewLeave(session.staffId, session.role, leave.staffId);
  if (!authorized) {
    return NextResponse.json({ error: "You are not authorized to approve this leave request" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.status) {
    let nextStatus = body.status;
    if (body.status === "approved" && (session.role === "hod" || session.role === "principal")) {
      nextStatus = "hod_approved";
    }

    updates.status = nextStatus;
    updates.reviewedById = session.staffId;
    updates.reviewedAt = new Date().toISOString();
    updates.reviewNotes = body.reviewNotes || null;
  }

  // Atomic conditional update: only update if status is not already terminal (approved or rejected)
  const updated = await db
    .update(leaveRequests)
    .set(updates)
    .where(
      and(
        eq(leaveRequests.id, id),
        ne(leaveRequests.status, "approved"),
        ne(leaveRequests.status, "rejected")
      )
    )
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json(
      { error: "Leave request is already in a terminal state (approved or rejected)" },
      { status: 400 }
    );
  }

  // Execute leave balance deduction ONLY after atomic state transition to 'approved'
  if (updated.status === "approved") {
    const existing = await db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, leave.staffId),
          eq(leaveBalances.leaveTypeId, leave.leaveTypeId),
          eq(leaveBalances.year, new Date().getFullYear())
        )
      )
      .get();

    if (existing) {
      await db
        .update(leaveBalances)
        .set({ usedDays: existing.usedDays + leave.daysCount })
        .where(eq(leaveBalances.id, existing.id))
        .run();
    }
  }

  if (updated && body.status) {
    after(async () => {
      try {
        await sendPushNotification({
          staffId: updated.staffId,
          title: `Leave Request ${updated.status.replace(/_/g, " ").toUpperCase()}`,
          message: `Your leave request has been updated to ${updated.status}.`,
          type: "leave",
          referenceType: "leave",
          referenceId: updated.id,
        });
      } catch (err) {
        console.error("[PushNotification] Leave update failed:", err);
      }
    });
  }

  return NextResponse.json({ leave: updated });
}, "leaves:approve");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const leave = await db.select({ staffId: leaveRequests.staffId }).from(leaveRequests).where(eq(leaveRequests.id, id)).get();
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.staffId !== session.staffId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.delete(leaveRequests).where(eq(leaveRequests.id, id)).run();
  return NextResponse.json({ success: true });
}, "leaves:delete");

