import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseRequests, auditLog, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { isManagedBy } from "@/lib/auth/department-scope";
import { withFinanceLock, checkInstitutionBudget } from "@/lib/finance/budget-ledger";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

type Transition = {
  from: string;
  to: string;
  roles: string[];
  approverField?: string;
  actionName: string;
};

const transitions: Transition[] = [
  { from: "pending_hod", to: "pending_accounts", roles: ["super_admin", "admin", "principal", "hod"], approverField: "approvedByHodId", actionName: "purchase_hod_approved" },
  { from: "pending_accounts", to: "pending_purchase", roles: ["super_admin", "admin", "accounts"], approverField: "approvedByAccountsId", actionName: "purchase_accounts_approved" },
  { from: "pending_purchase", to: "approved", roles: ["super_admin", "admin", "purchase"], approverField: "approvedByPurchaseId", actionName: "purchase_purchase_approved" },
  { from: "approved", to: "ordered", roles: ["super_admin", "admin", "purchase"], actionName: "purchase_order_placed" },
  { from: "ordered", to: "received", roles: ["super_admin", "admin", "purchase", "accounts"], actionName: "purchase_goods_received" },
];

const rejectTransitions: Record<string, { actionName: string }> = {
  pending_hod: { actionName: "purchase_hod_rejected" },
  pending_accounts: { actionName: "purchase_accounts_rejected" },
  pending_purchase: { actionName: "purchase_purchase_rejected" },
  approved: { actionName: "purchase_approved_rejected" },
};

async function logActivity(staffId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown>) {
  await db.insert(auditLog).values({
    id: randomUUID(),
    staffId,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  });
}

export const GET = requireAuth(async (_request: Request, session, context) => {
  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);

  const purchase = await db
    .select({
      id: purchaseRequests.id,
      requesterId: purchaseRequests.requesterId,
      itemName: purchaseRequests.itemName,
      quantity: purchaseRequests.quantity,
      estimatedCost: purchaseRequests.estimatedCost,
      justification: purchaseRequests.justification,
      status: purchaseRequests.status,
      approvedByHodId: purchaseRequests.approvedByHodId,
      approvedByAccountsId: purchaseRequests.approvedByAccountsId,
      approvedByPurchaseId: purchaseRequests.approvedByPurchaseId,
      approvedAt: purchaseRequests.approvedAt,
      notes: purchaseRequests.notes,
      institutionId: purchaseRequests.institutionId,
      createdAt: purchaseRequests.createdAt,
      updatedAt: purchaseRequests.updatedAt,
      requesterFirstName: staff.firstName,
      requesterLastName: staff.lastName,
      requesterEmail: staff.email,
      requesterEmployeeId: staff.employeeId,
    })
    .from(purchaseRequests)
    .leftJoin(staff, eq(purchaseRequests.requesterId, staff.id))
    .where(eq(purchaseRequests.id, id))
    .get();

  if (!purchase) {
    return NextResponse.json({ error: "Purchase request not found" }, { status: 404 });
  }

  // Tenant boundary verification
  if (scopedInstitutionId !== "global" && purchase.institutionId && purchase.institutionId !== scopedInstitutionId) {
    return NextResponse.json({ error: "Purchase request not found" }, { status: 404 });
  }

  // Caller authorization: requester, super_admin/admin, or managing role
  const isOwner = purchase.requesterId === session.staffId;
  const isSuperOrAdmin = session.role === "super_admin" || session.role === "admin";
  const canManage = isSuperOrAdmin || (await isManagedBy(session.staffId, session.role, purchase.requesterId));

  if (!isOwner && !canManage) {
    return NextResponse.json({ error: "Purchase request not found" }, { status: 404 });
  }

  return NextResponse.json({ purchase });
}, "finance:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, notes } = body;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const scopeWhere =
    scopedInstitutionId !== "global"
      ? and(eq(purchaseRequests.id, id), eq(purchaseRequests.institutionId, scopedInstitutionId))
      : eq(purchaseRequests.id, id);

  const outcome = await withFinanceLock(`purchase:${id}`, async () => {
    const existing = await db.select().from(purchaseRequests).where(scopeWhere).get();
    if (!existing) {
      return { status: 404, error: "Not found" };
    }

    // Terminal state guard: cannot re-review a received, rejected, or cancelled request
    if (existing.status === "received" || existing.status === "rejected" || existing.status === "cancelled") {
      return { status: 400, error: `Purchase request is already in terminal state: ${existing.status}` };
    }

    // Anti-Self-Approval Enforcement: Requesters cannot approve or reject their own purchase requests
    if (existing.requesterId === session.staffId && session.role !== "super_admin") {
      return {
        status: 403,
        error: "Requesters cannot review or approve their own purchase requests.",
      };
    }

    if (status === "rejected") {
      const rejectTransition = rejectTransitions[existing.status];
      if (!rejectTransition) {
        return { status: 403, error: "Cannot reject from current status" };
      }

      const allowedRoles = transitions.find((t) => t.from === existing.status)?.roles ?? ["super_admin", "admin"];
      if (!allowedRoles.includes(session.role)) {
        return { status: 403, error: "Forbidden" };
      }

      const authorized = await isManagedBy(session.staffId, session.role, existing.requesterId);
      if (!authorized) {
        return { status: 403, error: "You are not authorized to reject this purchase request" };
      }

      const updated = await db
        .update(purchaseRequests)
        .set({
          status: "rejected",
          notes: notes || null,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(and(scopeWhere, eq(purchaseRequests.status, existing.status)))
        .returning()
        .get();

      if (!updated) {
        return { status: 409, error: "Purchase request status was modified by another concurrent request" };
      }

      await logActivity(
        session.staffId,
        rejectTransition.actionName,
        "purchase_request",
        id,
        { previousStatus: existing.status, notes: notes || null, requesterId: existing.requesterId, itemName: existing.itemName, estimatedCost: existing.estimatedCost }
      );

      return { status: 200, purchase: updated };
    }

    const transition = transitions.find(
      (t) => t.from === existing.status && t.roles.includes(session.role)
    );

    if (!transition) {
      return { status: 403, error: "Cannot transition from current status with your role" };
    }

    if (status && status !== transition.to) {
      return { status: 409, error: "Purchase request status changed by another concurrent request" };
    }

    const authorized = await isManagedBy(session.staffId, session.role, existing.requesterId);
    if (!authorized) {
      return { status: 403, error: "You are not authorized to approve this purchase request" };
    }

    // When approving into final "approved" state, verify that remaining allocated budget is sufficient
    if (transition.to === "approved" && existing.institutionId) {
      const budgetCheck = await checkInstitutionBudget(
        existing.institutionId,
        existing.estimatedCost ?? 0,
        existing.id
      );
      if (!budgetCheck.allowed) {
        return { status: 400, error: budgetCheck.error };
      }
    }

    const updateData: Record<string, unknown> = {
      status: transition.to,
      notes: notes || null,
      updatedAt: new Date().toISOString(),
    };

    if (transition.approverField) {
      updateData[transition.approverField] = session.staffId;
    }
    if (transition.to === "approved") {
      updateData.approvedAt = new Date().toISOString();
    }

    const updated = await db
      .update(purchaseRequests)
      .set(updateData)
      .where(and(scopeWhere, eq(purchaseRequests.status, existing.status)))
      .returning()
      .get();

    if (!updated) {
      return { status: 409, error: "Purchase request status was modified by another concurrent request" };
    }

    await logActivity(
      session.staffId,
      transition.actionName,
      "purchase_request",
      id,
      { previousStatus: existing.status, newStatus: transition.to, notes: notes || null, requesterId: existing.requesterId, itemName: existing.itemName, estimatedCost: existing.estimatedCost }
    );

    return { status: 200, purchase: updated };
  });

  if (outcome.error) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ purchase: outcome.purchase });
}, "finance:update");

export const DELETE = requireAuth(async (_request: Request, session, context) => {
  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const scopeWhere =
    scopedInstitutionId !== "global"
      ? and(eq(purchaseRequests.id, id), eq(purchaseRequests.institutionId, scopedInstitutionId))
      : eq(purchaseRequests.id, id);

  return await withFinanceLock(`purchase:${id}`, async () => {
    const existing = await db.select().from(purchaseRequests).where(scopeWhere).get();
    if (!existing) {
      return NextResponse.json({ error: "Purchase request not found" }, { status: 404 });
    }

    // Authorization: owner or admin/super_admin
    const isOwner = existing.requesterId === session.staffId;
    const isSuperOrAdmin = session.role === "super_admin" || session.role === "admin";
    if (!isOwner && !isSuperOrAdmin) {
      return NextResponse.json({ error: "Unauthorized to delete this purchase request" }, { status: 403 });
    }

    // Lifecycle guard: approved, ordered, received requests cannot be deleted
    if (existing.status === "approved" || existing.status === "ordered" || existing.status === "received") {
      return NextResponse.json(
        { error: `Cannot delete a purchase request in '${existing.status}' status` },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(purchaseRequests)
      .where(
        and(
          scopeWhere,
          inArray(purchaseRequests.status, ["pending_hod", "pending_accounts", "pending_purchase", "rejected"])
        )
      )
      .returning()
      .get();

    if (!deleted) {
      return NextResponse.json({ error: "Purchase request was modified by a concurrent request" }, { status: 409 });
    }

    await logActivity(
      session.staffId,
      "purchase_request_deleted",
      "purchase_request",
      id,
      { deletedStatus: existing.status, itemName: existing.itemName, estimatedCost: existing.estimatedCost }
    );

    return NextResponse.json({ success: true, status: "deleted" });
  });
}, "finance:create");
