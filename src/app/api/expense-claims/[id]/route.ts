import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenseClaims, activityLogs, financialTransactions, staffInstitutions } from "@/db/schema";
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
  const allowedRoles = ["super_admin", "admin", "hod", "accounts", "principal"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.select().from(expenseClaims).where(eq(expenseClaims.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Anti-Self-Approval Enforcement: Requesters cannot approve/review their own expense claims
  if (existing.staffId === session.staffId && session.role !== "super_admin") {
    return NextResponse.json(
      { error: "Requesters cannot review or approve their own expense claims." },
      { status: 403 }
    );
  }

  // Authorization check (departmental / institutional scoping)
  const authorized = await isManagedBy(session.staffId, session.role, existing.staffId);
  if (!authorized) {
    return NextResponse.json({ error: "You are not authorized to review this expense claim" }, { status: 403 });
  }

  // Validate status transitions based on role
  const validTransitions: Record<string, string[]> = {
    super_admin: ["pending_hod", "pending_finance", "approved", "disbursed", "rejected"],
    admin: ["pending_hod", "pending_finance", "approved", "disbursed", "rejected"],
    principal: ["pending_hod", "pending_finance", "approved", "disbursed", "rejected"],
    hod: ["pending_finance", "rejected"], // HOD can endorse to finance or reject
    accounts: ["approved", "disbursed", "rejected"], // Accounts can approve, disburse, or reject
  };

  const roleTransitions = validTransitions[session.role] || [];
  if (!roleTransitions.includes(status)) {
    return NextResponse.json(
      { error: `Your role (${session.role}) cannot transition to status "${status}"` },
      { status: 403 }
    );
  }

  // Validate current status allows this transition
  const validFromStatus: Record<string, string[]> = {
    pending_hod: ["pending"],
    pending_finance: ["pending", "pending_hod"],
    approved: ["pending_finance", "pending_hod", "pending"],
    disbursed: ["approved"],
    rejected: ["pending", "pending_hod", "pending_finance", "approved"],
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

  // If transitioned to disbursed, create corresponding general ledger entry in financialTransactions
  if (status === "disbursed") {
    try {
      const instRecord = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, existing.staffId))
        .get();

      if (instRecord?.institutionId) {
        await db.insert(financialTransactions).values({
          id: crypto.randomUUID(),
          institutionId: instRecord.institutionId,
          type: "expense",
          amount: existing.amount,
          description: `Expense Reimbursement: ${existing.description}`,
          category: existing.category || "operational_expense",
          transactionDate: now.split("T")[0],
          recordedById: session.staffId,
          notes: `Ref: EXP-${id.substring(0, 8)}`,
        });
      }
    } catch (err) {
      console.warn("[ExpenseClaim] Note: financialTransactions ledger insert skipped:", err);
    }
  }

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
