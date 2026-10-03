import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RemediationTicketService } from "@/lib/services/remediation-ticket-service";

export const PATCH = requireAuth(async (request: Request, _session, context) => {
  const params = await context!.params;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
  }

  let body: { status?: "open" | "auto_assigned" | "in_progress" | "resolved" | "escalated"; assignedStaffId?: string; resolutionSummary?: string } = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const updated = await RemediationTicketService.updateTicket(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Remediation ticket not found" }, { status: 404 });
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update ticket" },
      { status: 500 }
    );
  }
}, "autonomy:manage");
