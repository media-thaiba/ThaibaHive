import { NextResponse } from "next/server";
import { db } from "@/db";
import { accessRequests, userAppAssignments, appDefaultRoles, notifications, auditLog } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const PUT = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { action, notes, roleId } = body;

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const accessReq = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, id))
    .get();

  if (!accessReq) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (accessReq.status !== "pending") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 409 });
  }

  const isSuperAdmin = session.role === "super_admin";
  const isRoutedReviewer = accessReq.routedToId === session.staffId;

  if (!isSuperAdmin && !isRoutedReviewer) {
    return NextResponse.json({ error: "Not authorized to review this request" }, { status: 403 });
  }

  if (action === "approve") {
    const targetRoleId = roleId || accessReq.assignedRoleId;
    const role = targetRoleId
      ? await db.select().from(appDefaultRoles).where(eq(appDefaultRoles.id, targetRoleId)).get()
      : await db.select().from(appDefaultRoles).where(
          and(eq(appDefaultRoles.appId, accessReq.appId), eq(appDefaultRoles.isDefault, true))
        ).get();

    if (role) {
      const existingAssignment = await db
        .select()
        .from(userAppAssignments)
        .where(
          and(
            eq(userAppAssignments.staffId, accessReq.staffId),
            eq(userAppAssignments.appId, accessReq.appId)
          )
        )
        .get();

      if (existingAssignment) {
        await db.update(userAppAssignments).set({
          status: "active",
          roleId: role.id,
          revokedAt: null,
          revokedById: null,
          revokedReason: null,
        }).where(eq(userAppAssignments.id, existingAssignment.id)).run();
      } else {
        await db.insert(userAppAssignments).values({
          id: crypto.randomUUID(),
          staffId: accessReq.staffId,
          appId: accessReq.appId,
          roleId: role.id,
          status: "active",
        }).run();
      }
    }

    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      staffId: accessReq.staffId,
      title: "Access Approved",
      message: `Your access request has been approved.`,
      type: "access_granted",
    }).run();
  } else {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      staffId: accessReq.staffId,
      title: "Access Denied",
      message: `Your access request has been rejected.${notes ? ` Reason: ${notes}` : ""}`,
      type: "access_denied",
    }).run();
  }

  await db.update(accessRequests).set({
    status: action === "approve" ? "approved" : "rejected",
    reviewNotes: notes || null,
    reviewedAt: new Date().toISOString(),
  }).where(eq(accessRequests.id, id)).run();

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    staffId: session.staffId,
    action: `access_request_${action}d`,
    entityType: "access_request",
    entityId: id,
    details: { targetStaffId: accessReq.staffId, appId: accessReq.appId, notes },
  }).run();

  return NextResponse.json({ success: true });
}, "attendance:read");
