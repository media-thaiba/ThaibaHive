import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RemediationTicketService } from "@/lib/services/remediation-ticket-service";

export const GET = requireAuth(async () => {
  try {
    const data = await RemediationTicketService.listTickets({ limit: 20 });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mobile remediation alerts" },
      { status: 500 }
    );
  }
}, "autonomy:view");
