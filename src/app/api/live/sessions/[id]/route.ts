import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { liveSessionManager } from "@/lib/live/session-manager";
import { isLiveStreamingEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/live/sessions/[id]
 * Get live session details and event segments.
 */
export const GET = requireAuth(async (request: Request, session: any, context?: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required to get session details" },
      { status: 400 }
    );
  }

  if (!isLiveStreamingEnabled(institutionId)) {
    return NextResponse.json(
      { error: "Live streaming feature is disabled" },
      { status: 403 }
    );
  }

  const params = await context?.params;
  const sessionId = params?.id;

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const liveSession = await liveSessionManager.getSession(sessionId, institutionId);
    if (!liveSession) {
      return NextResponse.json({ error: "Live session not found" }, { status: 404 });
    }

    return NextResponse.json({ session: liveSession });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get live session" },
      { status: 500 }
    );
  }
}, "live_stream:view");

/**
 * DELETE /api/live/sessions/[id]
 * End / terminate an active live session.
 */
export const DELETE = requireAuth(async (request: Request, session: any, context?: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required to terminate session" },
      { status: 400 }
    );
  }

  if (!isLiveStreamingEnabled(institutionId)) {
    return NextResponse.json(
      { error: "Live streaming feature is disabled" },
      { status: 403 }
    );
  }

  const params = await context?.params;
  const sessionId = params?.id;

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const ended = await liveSessionManager.endSession(sessionId, institutionId, "terminated");
    return NextResponse.json({ success: true, session: ended });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to terminate live session" },
      { status: 500 }
    );
  }
}, "live_stream:start");
