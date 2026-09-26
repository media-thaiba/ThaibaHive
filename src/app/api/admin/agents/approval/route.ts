import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { ApprovalGateway } from "@/lib/agents/healing/approval-gateway";

export const GET = requireAuth(async (_request, _session) => {
  try {
    const gateway = ApprovalGateway.getInstance();
    const pending = gateway.getPendingRequests();
    return NextResponse.json({ success: true, pending });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, "agents:manage");

export const POST = requireAuth(async (request, _session) => {
  try {
    const { approvalId, action } = await request.json();
    if (!approvalId || !action) {
      return NextResponse.json({ error: "Missing approvalId or action parameter" }, { status: 400 });
    }

    const gateway = ApprovalGateway.getInstance();

    if (action === "approve") {
      const success = await gateway.approve(approvalId);
      if (success) {
        return NextResponse.json({ success: true, message: `Approval ${approvalId} approved successfully.` });
      } else {
        return NextResponse.json({ error: `Approval request ${approvalId} not found` }, { status: 404 });
      }
    } else if (action === "reject") {
      const success = await gateway.reject(approvalId);
      if (success) {
        return NextResponse.json({ success: true, message: `Approval ${approvalId} rejected successfully.` });
      } else {
        return NextResponse.json({ error: `Approval request ${approvalId} not found` }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: `Unsupported action type: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, "agents:manage");
