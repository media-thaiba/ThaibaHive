import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { serializeMobileUser, serializeMobileDashboard } from "@/lib/mobile/mobile-serializer";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    const userSummary = serializeMobileUser({
      id: session.staffId,
      name: session.name,
      email: session.email,
      role: session.role,
      employeeId: session.employeeId,
    });

    const dashboardPayload = serializeMobileDashboard({
      user: userSummary,
      pendingApprovalsCount: 2,
      upcomingExamsCount: 1,
      unreadNotificationsCount: 0,
      quickActions: ["finance_approvals", "attendance_checkin", "qr_verifier"],
    });

    const response = NextResponse.json(dashboardPayload);
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    response.headers.set("ETag", `"${Date.now()}"`);

    return response;
  } catch (error) {
    console.error("Mobile dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch mobile dashboard data" }, { status: 500 });
  }
});
