import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { isAuthorizedToViewLeave } from "@/lib/leaves/utils";
import { deductLeaveDays, creditLeaveDays, leaveYearFor, LeaveLedgerError, withLeaveLedgerLock } from "@/lib/leaves/balance-ledger";
import { autoSkipMealsForLeave, revertAutoSkippedMealsForLeave } from "@/lib/canteen/leave-integration";
import { sendPushNotification } from "@/lib/notifications/push-service";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { leaveReviewSchema } from "@/lib/validation/schemas";
import { eq, and, ne } from "drizzle-orm";

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(leaveRequests.id, id), eq(leaveRequests.institutionId, scopedInstitutionId))
    : eq(leaveRequests.id, id);

  const leave = await db.select().from(leaveRequests).where(whereClause).get();
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const authorized = await isAuthorizedToViewLeave(session.staffId, session.role, leave.staffId);
  if (!authorized) {
    return NextResponse.json({ error: "You are not authorized to view this leave request" }, { status: 403 });
  }

  return NextResponse.json({ leave });
}, "leaves:read");

export const PUT = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = leaveReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { status, reviewNotes } = parsed.data;

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(leaveRequests.id, id), eq(leaveRequests.institutionId, scopedInstitutionId))
    : eq(leaveRequests.id, id);

  const leave = await db.select().from(leaveRequests).where(whereClause).get();
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

  if (leave.status === "hod_approved" && session.role === "hod") {
    return NextResponse.json(
      { error: "Leave has already been recommended by HOD and is awaiting Principal approval" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  let nextStatus: string = status;

  if (status === "approved") {
    if (session.role === "hod") {
      nextStatus = "hod_approved";
    } else {
      nextStatus = "approved";
    }
  }

  updates.status = nextStatus;
  updates.reviewedById = session.staffId;
  updates.reviewedAt = new Date().toISOString();
  updates.reviewNotes = reviewNotes || null;

  let updated;
  try {
    updated = await withLeaveLedgerLock(() => db.transaction(async (tx) => {
      // Transition status first — the WHERE clause guards against concurrent
      // or repeated approvals (0 rows → already terminal → 400, no deduction).
      const row = await tx
        .update(leaveRequests)
        .set(updates)
        .where(
          and(
            whereClause,
            ne(leaveRequests.status, "approved"),
            ne(leaveRequests.status, "rejected")
          )
        )
        .returning()
        .get();

      if (!row) return null;

      // Fund the deduction only after a successful transition; an
      // insufficient balance throws and rolls back the whole transaction
      // (status change included), so an approved leave always has funded days.
      if (nextStatus === "approved") {
        await deductLeaveDays(tx, {
          staffId: leave.staffId,
          leaveTypeId: leave.leaveTypeId,
          year: leaveYearFor(leave.startDate),
          days: leave.daysCount,
        });

        // Auto-skip canteen meals during the approved leave dates
        await autoSkipMealsForLeave(tx, {
          staffId: leave.staffId,
          startDate: leave.startDate,
          endDate: leave.endDate,
          institutionId: leave.institutionId,
        });
      }

      return row;
    }));
  } catch (error) {
    if (error instanceof LeaveLedgerError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Leave request is already in a terminal state (approved or rejected)" },
      { status: 400 }
    );
  }

  if (updated && status) {
    const triggerPush = async () => {
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
    };

    try {
      after(triggerPush);
    } catch {
      // In standalone tests or execution environments where after() is called outside request scope
      void triggerPush();
    }
  }

  return NextResponse.json({ leave: updated });
}, "leaves:approve");

export const DELETE = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(leaveRequests.id, id), eq(leaveRequests.institutionId, scopedInstitutionId))
    : eq(leaveRequests.id, id);

  const leave = await db.select().from(leaveRequests).where(whereClause).get();
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (leave.staffId !== session.staffId && session.role !== "super_admin" && session.role !== "admin") {
    const hasAccess = await isAuthorizedToViewLeave(session.staffId, session.role, leave.staffId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Deleting an approved leave returns its days to the balance atomically —
  // otherwise the deduction is silently destroyed and the entitlement lost.
  await withLeaveLedgerLock(() => db.transaction(async (tx) => {
    if (leave.status === "approved") {
      await creditLeaveDays(tx, {
        staffId: leave.staffId,
        leaveTypeId: leave.leaveTypeId,
        year: leaveYearFor(leave.startDate),
        days: leave.daysCount,
      });

      // Revert auto-skipped meals when approved leave is deleted
      await revertAutoSkippedMealsForLeave(tx, {
        staffId: leave.staffId,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
    }
    await tx.delete(leaveRequests).where(whereClause).run();
  }));
  return NextResponse.json({ success: true });
}, "leaves:delete");
