import { NextResponse } from "next/server";
import { db, purchaseApprovalLogs, eq, asc } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { purchaseApprovalEngine } from "@/lib/finance/purchases/purchase-approval-engine";

export const GET = requireAuth(
  async (_request: Request, _session: any, context?: any) => {
    try {
      const params = context?.params ? await context.params : {};
      const id = params.id;

      if (!id) {
        return NextResponse.json({ error: "Purchase Request ID is required" }, { status: 400 });
      }

      const verification = await purchaseApprovalEngine.verifyAuditTrail(id);
      const logs = await db
        .select()
        .from(purchaseApprovalLogs)
        .where(eq(purchaseApprovalLogs.purchaseRequestId, id))
        .orderBy(asc(purchaseApprovalLogs.actionTimestamp));

      return NextResponse.json({ verification, logs });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Failed to verify purchase audit trail" },
        { status: 500 }
      );
    }
  },
  "finance:purchases:create"
);
