import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { isManagedBy } from "@/lib/auth/department-scope";
import { eq } from "drizzle-orm";

type Transition = {
  from: string;
  to: string;
  roles: string[];
  approverField?: string;
};

const transitions: Transition[] = [
  { from: "pending_hod", to: "pending_accounts", roles: ["super_admin", "admin", "hod"], approverField: "approvedByHodId" },
  { from: "pending_accounts", to: "pending_purchase", roles: ["super_admin", "admin", "accounts"], approverField: "approvedByAccountsId" },
  { from: "pending_purchase", to: "approved", roles: ["super_admin", "admin", "purchase"], approverField: "approvedByPurchaseId" },
];

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { status, notes } = body;

  const existing = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "rejected") {
    const rejectTransition = transitions.find((t) => t.from === existing.status);
    if (!rejectTransition) {
      return NextResponse.json({ error: "Cannot reject from current status" }, { status: 403 });
    }

    if (!rejectTransition.roles.includes(session.role)) {
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

  return NextResponse.json({ purchase: updated });
}, "finance:update");
