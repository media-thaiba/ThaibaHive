import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { ApprovalGateway } from "@/lib/remediation/approval-gateway";

async function handler(req: Request, _session: any) {
  try {
    const { workflowId, approvalKey, action } = await req.json();

    if (!workflowId || !approvalKey || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const gateway = ApprovalGateway.getInstance();

    if (action === "approve") {
      await gateway.approveAction(workflowId, approvalKey);
      return NextResponse.json({ success: true, message: "Remediation action approved and executing." });
    } else if (action === "reject") {
      await gateway.rejectAction(workflowId, approvalKey);
      return NextResponse.json({ success: true, message: "Remediation action rejected." });
    } else {
      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[Approve API] Error handling request:", err);
    return NextResponse.json({ error: err.message || "Failed to process approval request" }, { status: 500 });
  }
}

export const POST = requireAuth(handler, "remediation:approve");
