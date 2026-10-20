import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenseClaims, activityLogs, financialTransactions, staff, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { isManagedBy } from "@/lib/auth/department-scope";
import { withFinanceLock } from "@/lib/finance/budget-ledger";
import { eq, and, inArray } from "drizzle-orm";
import { expenseClaimReviewSchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (_request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);

  const claim = await db
    .select({
      id: expenseClaims.id,
      staffId: expenseClaims.staffId,
      amount: expenseClaims.amount,
      category: expenseClaims.category,
      description: expenseClaims.description,
      receiptUrl: expenseClaims.receiptUrl,
      status: expenseClaims.status,
      reviewedById: expenseClaims.reviewedById,
      reviewedAt: expenseClaims.reviewedAt,
      reviewNotes: expenseClaims.reviewNotes,
      institutionId: expenseClaims.institutionId,
      createdAt: expenseClaims.createdAt,
      updatedAt: expenseClaims.updatedAt,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffEmail: staff.email,
      staffEmployeeId: staff.employeeId,
    })
    .from(expenseClaims)
    .leftJoin(staff, eq(expenseClaims.staffId, staff.id))
    .where(eq(expenseClaims.id, id))
    .get();

  if (!claim) {
    return NextResponse.json({ error: "Expense claim not found" }, { status: 404 });
  }

  // Tenant boundary verification
  if (scopedInstitutionId !== "global" && claim.institutionId && claim.institutionId !== scopedInstitutionId) {
    return NextResponse.json({ error: "Expense claim not found" }, { status: 404 });
  }

  // Caller authorization: requester, admin/super_admin, or managing role
  const isOwner = claim.staffId === session.staffId;
  const isSuperOrAdmin = session.role === "super_admin" || session.role === "admin";
  const canManage = isSuperOrAdmin || (await isManagedBy(session.staffId, session.role, claim.staffId));

  if (!isOwner && !canManage) {
    return NextResponse.json({ error: "Expense claim not found" }, { status: 404 });
  }

  return NextResponse.json({ claim });
}, "finance:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = expenseClaimReviewSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid data", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { status, reviewNotes } = result.data;

  // Check role permissions
  const allowedRoles = ["super_admin", "admin", "hod", "accounts", "principal"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);
  const scopeWhere =
    scopedInstitutionId !== "global"
      ? and(eq(expenseClaims.id, id), eq(expenseClaims.institutionId, scopedInstitutionId))
      : eq(expenseClaims.id, id);

  const outcome = await withFinanceLock(`expense:${id}`, async () => {
    const existing = await db.select().from(expenseClaims).where(scopeWhere).get();
    if (!existing) {
      return { status: 404, error: "Not found" };
    }

    // Terminal state guard: cannot re-review a disbursed, rejected, or cancelled claim
    if (existing.status === "disbursed" || existing.status === "rejected" || existing.status === "cancelled") {
      return { status: 400, error: `Expense claim is already in terminal state: ${existing.status}` };
    }

    // Anti-Self-Approval Enforcement: Requesters cannot approve/review their own expense claims
    if (existing.staffId === session.staffId && session.role !== "super_admin") {
      return { status: 403, error: "Requesters cannot review or approve their own expense claims." };
    }

    // Authorization check (departmental / institutional scoping)
    const authorized = await isManagedBy(session.staffId, session.role, existing.staffId);
    if (!authorized) {
      return { status: 403, error: "You are not authorized to review this expense claim" };
    }

    // Validate status transitions based on role
    const validTransitions: Record<string, string[]> = {
      super_admin: ["pending_hod", "pending_finance", "approved", "disbursed", "rejected"],
      admin: ["pending_hod", "pending_finance", "approved", "disbursed", "rejected"],
      principal: ["pending_hod", "pending_finance", "approved", "disbursed", "rejected"],
      hod: ["pending_finance", "rejected"],
      accounts: ["approved", "disbursed", "rejected"],
    };

    const roleTransitions = validTransitions[session.role] || [];
    if (!roleTransitions.includes(status)) {
      return { status: 403, error: `Your role (${session.role}) cannot transition to status "${status}"` };
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
      return { status: 400, error: `Cannot transition from "${existing.status}" to "${status}"` };
    }

    const now = new Date().toISOString();
    const previousStatus = existing.status;

    // Optimistic concurrency control: only update if status matches existing.status
    const updated = await db
      .update(expenseClaims)
      .set({
        status,
        reviewedById: session.staffId,
        reviewedAt: now,
        reviewNotes: reviewNotes || null,
        updatedAt: now,
      })
      .where(and(scopeWhere, eq(expenseClaims.status, existing.status)))
      .returning()
      .get();

    if (!updated) {
      return { status: 409, error: "Expense claim status was modified by another concurrent request" };
    }

    // If transitioned to disbursed, create corresponding general ledger entry in financialTransactions
    if (status === "disbursed") {
      try {
        const instRecord = existing.institutionId
          ? { institutionId: existing.institutionId }
          : await db
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

    return { status: 200, claim: updated };
  });

  if (outcome.error) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ claim: outcome.claim });
}, "finance:update");

export const DELETE = requireAuth(async (_request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);
  const scopeWhere =
    scopedInstitutionId !== "global"
      ? and(eq(expenseClaims.id, id), eq(expenseClaims.institutionId, scopedInstitutionId))
      : eq(expenseClaims.id, id);

  return await withFinanceLock(`expense:${id}`, async () => {
    const existing = await db.select().from(expenseClaims).where(scopeWhere).get();
    if (!existing) {
      return NextResponse.json({ error: "Expense claim not found" }, { status: 404 });
    }

    // Authorization: owner or admin/super_admin
    const isOwner = existing.staffId === session.staffId;
    const isSuperOrAdmin = session.role === "super_admin" || session.role === "admin";
    if (!isOwner && !isSuperOrAdmin) {
      return NextResponse.json({ error: "Unauthorized to delete this expense claim" }, { status: 403 });
    }

    // Lifecycle guard: approved and disbursed claims cannot be deleted
    if (existing.status === "approved" || existing.status === "disbursed") {
      return NextResponse.json(
        { error: `Cannot delete an expense claim in '${existing.status}' status` },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(expenseClaims)
      .where(
        and(
          scopeWhere,
          inArray(expenseClaims.status, ["pending", "pending_hod", "pending_finance", "rejected", "cancelled"])
        )
      )
      .returning()
      .get();

    if (!deleted) {
      return NextResponse.json({ error: "Expense claim was modified by a concurrent request" }, { status: 409 });
    }

    try {
      await db.insert(activityLogs).values({
        staffId: session.staffId,
        action: "expense_claim_deleted",
        resourceType: "expense_claim",
        resourceId: id,
        details: JSON.stringify({
          claimId: id,
          deletedStatus: existing.status,
          amount: existing.amount,
          deletedBy: session.staffId,
        }),
      });
    } catch (err) {
      console.warn("[ExpenseClaimDelete] Failed to insert audit log:", err);
    }

    return NextResponse.json({ success: true, status: "deleted" });
  });
}, "finance:create");
