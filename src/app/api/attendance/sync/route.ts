import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { processAttendanceSyncBatch } from "@/lib/attendance/sync-engine";
import type { AttendanceSyncBatchRequest } from "@/lib/attendance/types";

export const POST = requireAuth(async (request, session) => {
  // Rate limit check
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const requestId =
    request.headers.get("x-request-id") ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400, headers: { "X-Request-Id": requestId } }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request payload must be an object containing 'events' array" },
        { status: 400, headers: { "X-Request-Id": requestId } }
      );
    }

    const syncRequest = body as AttendanceSyncBatchRequest;

    if (!Array.isArray(syncRequest.events)) {
      return NextResponse.json(
        { error: "'events' must be an array of attendance items" },
        { status: 400, headers: { "X-Request-Id": requestId } }
      );
    }

    // Process the batch through the immutable event-sourcing engine
    const result = await processAttendanceSyncBatch(
      session.staffId,
      session.institutionId || null,
      syncRequest,
      {
        requestId,
        ipAddress,
        userAgent,
      }
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { "X-Request-Id": requestId },
    });
  } catch (error: any) {
    console.error(`[ATTENDANCE_SYNC_ERROR] Request ${requestId} failed:`, error);
    return NextResponse.json(
      { error: "Failed to process attendance sync batch", details: error?.message },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}, "attendance:read");
