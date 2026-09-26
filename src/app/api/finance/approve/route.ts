import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenseClaims, purchaseRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { WorkflowEngine } from "@/lib/finance/workflow-engine";
import { Role } from "@/lib/finance/models/approval-state";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const approvalPayloadSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  requestType: z.enum(["expense", "purchase"]),
  action: z.enum(["approve", "reject", "return"]),
  notes: z.string().optional(),
  signature: z.string().optional(),
});

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = approvalPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { requestId, requestType, action, notes } = parsed.data;

  if (action === "reject" && (!notes || !notes.trim())) {
    return NextResponse.json(
      { error: "Rejection notes are required when rejecting a request." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const userRole = session.role as Role;

  try {
    if (requestType === "expense") {
      const claim = await db
        .select()
        .from(expenseClaims)
        .where(eq(expenseClaims.id, requestId))
        .get();

      if (!claim) {
        return NextResponse.json({ error: "Expense claim not found" }, { status: 404 });
      }

      const currentStatus = claim.status as any;
      const validation = WorkflowEngine.validateTransition(currentStatus, action, userRole);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 403 });
      }

      const nextStatus = WorkflowEngine.getNextStatus(
        currentStatus,
        action,
        "expense",
        claim.amount ?? 0
      );

      const updated = await db
        .update(expenseClaims)
        .set({
          status: nextStatus,
          reviewedById: session.staffId,
          reviewedAt: now,
          reviewNotes: notes || null,
          updatedAt: now,
        })
        .where(and(eq(expenseClaims.id, requestId), eq(expenseClaims.status, claim.status)))
        .returning()
        .get();

      if (!updated) {
        return NextResponse.json(
          { error: "Failed to update expense claim status (concurrent modification)" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        requestId,
        requestType,
        status: nextStatus,
        previousStatus: currentStatus,
        updatedAt: now,
      });
    } else {
      const purchase = await db
        .select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, requestId))
        .get();

      if (!purchase) {
        return NextResponse.json({ error: "Purchase request not found" }, { status: 404 });
      }

      const currentStatus = purchase.status as any;
      const validation = WorkflowEngine.validateTransition(currentStatus, action, userRole);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 403 });
      }

      const nextStatus = WorkflowEngine.getNextStatus(
        currentStatus,
        action,
        "purchase",
        purchase.estimatedCost ?? 0
      );

      const updated = await db
        .update(purchaseRequests)
        .set({
          status: nextStatus,
          notes: notes || purchase.notes,
          updatedAt: now,
        })
        .where(and(eq(purchaseRequests.id, requestId), eq(purchaseRequests.status, purchase.status)))
        .returning()
        .get();

      if (!updated) {
        return NextResponse.json(
          { error: "Failed to update purchase request status" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        requestId,
        requestType,
        status: nextStatus,
        previousStatus: currentStatus,
        updatedAt: now,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during approval processing" },
      { status: 500 }
    );
  }
}, "finance:approve");
