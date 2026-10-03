import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { purchaseApprovalActionSchema } from "@/lib/validation/schemas";
import { purchaseApprovalEngine } from "@/lib/finance/purchases/purchase-approval-engine";
import { resolveScopedInstitutionId } from "@/lib/finance/institution-context";

export const POST = requireAuth(async (request: Request, session: any) => {
  try {
    const body = await request.json();
    const parsed = purchaseApprovalActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const institutionId = await resolveScopedInstitutionId(body.institutionId);

    const result = await purchaseApprovalEngine.processApproval({
      purchaseRequestId: parsed.data.purchaseRequestId,
      institutionId,
      approverId: session.staffId,
      approverRole: session.role,
      action: parsed.data.action,
      comments: parsed.data.comments,
      tierLevel: parsed.data.tierLevel,
    });

    return NextResponse.json({ approval: result });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Purchase Approval Process Error]:", error instanceof Error ? error.stack : error);
    const status = errorMsg.includes("scope mismatch") || errorMsg.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: "Failed to process purchase approval" }, { status });
  }
}, "finance:purchases:approve:tier1");
