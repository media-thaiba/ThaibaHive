import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenseClaims, activityLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { isManagedBy } from "@/lib/auth/department-scope";
import { eq } from "drizzle-orm";
import { expenseClaimReviewSchema } from "@/lib/validation/schemas";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const result = expenseClaimReviewSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid data", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { status, reviewNotes } = result.data;

  // Check role permissions
  const allowedRoles = ["super_admin", "admin", "hod", "accounts"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate status transitions based on role
  const validTransitions: Record<string, string[]> = {
    super_admin: ["pending_hod", "pending_finance", "approved", "rejected"],
    admin: ["pending_hod", "pending_finance", "approved", "rejected"],
    hod: ["pending_finance", "rejected"], // HOD can only approve to finance or reject
    accounts: ["approved", "rejected"], // Finance/Accounts can approve or reject
  };

  const existing = await db.select().from(expenseClaims).where(eq(expenseClaims.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization check
  const authorized = await isManagedBy(session.staffId, session.role, existing.staffId);
  if (!authorized) {
    return NextResponse.json({ error: "You are not authorized to review this expense claim" }, { status: 403 });
  }

  // Check if the requested status transition is valid for the current role
  const roleTransitions = validTransitions[session.role] || [];
  if (!roleTransitions.includes(status)) {
    return NextResponse.json(
      { error: `Your role (${session.role}) cannot transition to status "${status}"` },
      { status: 403 }
    );
  }

  // Validate current status allows this transition
  const validFromStatus: Record<string, string[]> = {
    pending_hod: ["pending"], // HOD can move from pending to pending_finance
    pending_finance: ["pending_hod"], // Finance can move from pending_hod to approved
    approved: ["pending_finance", "pending_hod"], // Can be approved from either stage
    rejected: ["pending", "pending_hod", "pending_finance"], // Can be rejected from any stage
  };

  const allowedFrom = validFromStatus[status] || [];
  if (!allowedFrom.includes(existing.status)) {
    return NextResponse.json(
      { error: `Cannot transition from "${existing.status}" to "${status}"` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const previousStatus = existing.status;

  const updated = await db
    .update(expenseClaims)
    .set({
      status,
      reviewedById: session.staffId,
      reviewedAt: now,
      reviewNotes: reviewNotes || null,
      updatedAt: now,
    })
    .where(eq(expenseClaims.id, id))
    .returning()
    .get();

  // Audit Log Entry
  try {
    await db.insert(activityLogs).values({
      staffId: session.staffId,
      action: `expense_claim_${status}`,
      resourceType: "expense_claim",
      resourceId: id,
      details: JSON.stringify({
        claimId: id,
        previousStatus,
        newStatus: status,
        amount: existing.amount,
        reviewNotes: reviewNotes || null,
        reviewerRole: session.role,
      }),
    });
  } catch (err) {
    console.error("[ExpenseClaimReview] Failed to insert activity audit log:", err);
  }

  return NextResponse.json({ claim: updated });
}, "finance:update");
