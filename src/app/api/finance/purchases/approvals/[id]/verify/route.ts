import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseApprovalLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq, asc } from "drizzle-orm";
import { verifyAuditTrail } from "@/lib/finance/purchases/purchase-approval-ledger";

export const GET = requireAuth(
  async (
    request: Request,
    session: import("@thaiba/auth").SessionPayload,
    context?: { params?: Promise<{ id: string }> | { id: string } }
  ) => {
    // Rate limiting
    const rl = checkRateLimit(session.staffId, "read");
    if (!rl.allowed) return rateLimitResponse(rl.resetMs);

    try {
      const rawParams = context?.params ? await context.params : undefined;
      const url = new URL(request.url);
      const pathnameSegments = url.pathname.split("/").filter(Boolean);
      const verifyIdx = pathnameSegments.lastIndexOf("verify");
      const pathId = verifyIdx > 0 ? pathnameSegments[verifyIdx - 1] : undefined;
      const id = rawParams?.id || pathId || url.searchParams.get("id");

      if (!id) {
        return NextResponse.json({ error: "Purchase Request ID is required" }, { status: 400 });
      }

      // Verify audit trail
      const verification = await verifyAuditTrail(id);

      // Get approval logs
      const logs = await db
        .select()
        .from(purchaseApprovalLogs)
        .where(eq(purchaseApprovalLogs.purchaseRequestId, id))
        .orderBy(asc(purchaseApprovalLogs.actionTimestamp));

      return NextResponse.json({ verification, logs });
    } catch (error) {
      console.error("[Purchase Verification Error]:", error instanceof Error ? error.stack : error);
      return NextResponse.json(
        { error: "Failed to verify purchase audit trail" },
        { status: 500 }
      );
    }
  },
  "finance:read"
);
