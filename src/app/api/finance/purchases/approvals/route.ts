import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { resolveInstitutionScopeForSession } from "@/lib/auth/institution-scope";
import { purchaseApprovalActionSchema } from "@/lib/validation/schemas";
import { purchaseApprovalEngine } from "@/lib/finance/purchases/purchase-approval-engine";
import { withPurchaseApprovalLock } from "@/lib/finance/purchases/purchase-approval-ledger";

export const POST = requireAuth(async (request: Request, session: import("@thaiba/auth").SessionPayload) => {
  // Rate limiting
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  // Safe JSON parsing
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = purchaseApprovalActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const {
    purchaseRequestId,
    action,
    comments,
    tierLevel,
  } = parsed.data;

  const normalizedComments = comments ?? undefined;

  // Resolve institution ID
  const institutionId = await resolveInstitutionScopeForSession(session);
  if (!institutionId) {
    return NextResponse.json({ error: "Unable to resolve institutional context" }, { status: 400 });
  }

  try {
    // Process approval with mutex lock for concurrency control
    const result = await withPurchaseApprovalLock(purchaseRequestId, () =>
      purchaseApprovalEngine.processApproval({
        purchaseRequestId,
        institutionId,
        approverId: session.staffId,
        approverRole: session.role,
        action,
        comments: normalizedComments,
        tierLevel,
      })
    );

    return NextResponse.json({ approval: result });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Purchase Approvals Error]:", error instanceof Error ? error.stack : error);

    if (errorMsg.includes("not found")) {
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }
    if (errorMsg.includes("terminal state") || errorMsg.includes("status changed by a concurrent request")) {
      return NextResponse.json({ error: errorMsg }, { status: 409 });
    }
    if (errorMsg.includes("Forbidden") || errorMsg.includes("Insufficient role") || errorMsg.includes("scope mismatch")) {
      return NextResponse.json({ error: errorMsg }, { status: 403 });
    }
    if (errorMsg.includes("Invalid")) {
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to process purchase approval" }, { status: 500 });
  }
}, "finance:approve");
