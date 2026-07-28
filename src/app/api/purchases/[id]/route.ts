import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseRequests, auditLog } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { isManagedBy } from "@/lib/auth/department-scope";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

type Transition = {
  from: string;
  to: string;
  roles: string[];
  approverField?: string;
  actionName: string;
};

const transitions: Transition[] = [
  { from: "pending_hod", to: "pending_accounts", roles: ["super_admin", "admin", "hod"], approverField: "approvedByHodId", actionName: "purchase_hod_approved" },
  { from: "pending_accounts", to: "pending_purchase", roles: ["super_admin", "admin", "accounts"], approverField: "approvedByAccountsId", actionName: "purchase_accounts_approved" },
  { from: "pending_purchase", to: "approved", roles: ["super_admin", "admin", "purchase"], approverField: "approvedByPurchaseId", actionName: "purchase_purchase_approved" },
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

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { status, notes } = body;

  const existing = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "rejected") {
    const rejectTransition = rejectTransitions[existing.status];
    if (!rejectTransition) {
      return NextResponse.json({ error: "Cannot reject from current status" }, { status: 403 });
    }

    const allowedRoles = transitions.find((t) => t.from === existing.status)?.roles ?? ["super_admin", "admin"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authorized = await isManagedBy(session.staffId, session.role, existing.requesterId);
    if (!authorized) {
      return NextResponse.json({ error: "You are not authorized to reject this purchase request" }, { status: 403 });
    }

    const updated = await db
      .update(purchaseRequests)
      .set({
        status: "rejected",
        notes: notes || null,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(purchaseRequests.id, id))
      .returning()
      .get();

    await logActivity(
      session.staffId,
      rejectTransition.actionName,
      "purchase_request",
      id,
      { previousStatus: existing.status, notes: notes || null, requesterId: existing.requesterId, itemName: existing.itemName, estimatedCost: existing.estimatedCost }
    );

    return NextResponse.json({ purchase: updated });
  }

  const transition = transitions.find(
    (t) => t.from === existing.status && t.roles.includes(session.role)
  );

  if (!transition) {
    return NextResponse.json({ error: "Cannot transition from current status with your role" }, { status: 403 });
  }

  const authorized = await isManagedBy(session.staffId, session.role, existing.requesterId);
  if (!authorized) {
    return NextResponse.json({ error: "You are not authorized to approve this purchase request" }, { status: 403 });
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
    .where(eq(purchaseRequests.id, id))
    .returning()
    .get();

  await logActivity(
    session.staffId,
    transition.actionName,
    "purchase_request",
    id,
    { previousStatus: existing.status, newStatus: transition.to, notes: notes || null, requesterId: existing.requesterId, itemName: existing.itemName, estimatedCost: existing.estimatedCost }
  );

  return NextResponse.json({ purchase: updated });
}, "finance:update");
