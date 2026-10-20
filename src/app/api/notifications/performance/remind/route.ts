import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { performanceReminderSchema } from "@/lib/validation/schemas";
import { PerformanceNotificationService } from "@/lib/notifications/performance-notifications";

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = performanceReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { staffId, staffName, cycleTitle, dueDate, reminderType } = parsed.data;

  try {
    const payload = PerformanceNotificationService.buildReminderPayload({
      staffId,
      staffName: staffName || "Staff Member",
      cycleTitle: cycleTitle || "Quarterly Review",
      dueDate: dueDate || "2026-08-31",
      reminderType: reminderType || "self_assessment",
    });

    return NextResponse.json({
      success: true,
      notificationSent: true,
      payload,
      recipientId: staffId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminder" },
      { status: 400 }
    );
  }
}, "performance:manage");
