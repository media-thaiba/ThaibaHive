import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkAndRunScheduledReports } from "@/lib/services/report-queue";

export const POST = requireAuth(async (request, session) => {
  const { role } = session;

  if (!["super_admin", "admin", "principal"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Trigger asynchronously
  checkAndRunScheduledReports().catch(err => {
    console.error("[Trigger Scheduled Reports API] Error:", err);
  });

  return NextResponse.json({ success: true, message: "Scheduled reports check triggered" });
}, "reports:read");
