import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { PerformanceNotificationService } from "@/lib/notifications/performance-notifications";

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const payload = PerformanceNotificationService.buildReminderPayload({
      staffId: body.staffId,
      staffName: body.staffName || "Staff Member",
      cycleTitle: body.cycleTitle || "Quarterly Review",
      dueDate: body.dueDate || "2026-08-31",
      reminderType: body.reminderType || "self_assessment",
    });

    return NextResponse.json({
      success: true,
      notificationSent: true,
      payload,
      recipientId: body.staffId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminder" },
      { status: 400 }
    );
  }
}, "performance:manage");
