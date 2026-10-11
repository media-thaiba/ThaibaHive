import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { liveSessionManager } from "@/lib/live/session-manager";
import { liveSessionStartSchema } from "@/lib/validation/schemas";
import { isLiveStreamingEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/live/sessions
 * List live multimodal streaming sessions for the caller's institution.
 */
export const GET = requireAuth(async (request: Request, session: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required to list live sessions" },
      { status: 400 }
    );
  }

  if (!isLiveStreamingEnabled(institutionId)) {
    return NextResponse.json(
      { error: "Live streaming feature is disabled" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const sessionType = searchParams.get("sessionType") || undefined;

  try {
    const sessions = await liveSessionManager.listSessions(institutionId, {
      status,
      sessionType,
    });

    return NextResponse.json({
      sessions,
      total: sessions.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list live sessions" },
      { status: 500 }
    );
  }
}, "live_stream:view");

/**
 * POST /api/live/sessions
 * Start a new live multimodal streaming session.
 */
export const POST = requireAuth(async (request: Request, session: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required to start a live session" },
      { status: 400 }
    );
  }

  if (!isLiveStreamingEnabled(institutionId)) {
    return NextResponse.json(
      { error: "Live streaming feature is disabled" },
      { status: 403 }
    );
  }

  let body: any = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = liveSessionStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const liveSession = await liveSessionManager.startSession(
      institutionId,
      parsed.data,
      session.staffId
    );

    return NextResponse.json({ session: liveSession }, { status: 201 });
  } catch (error: any) {
    const status = error.message.includes("quota exceeded")
      ? 429
      : error.message.includes("concurrent")
      ? 429
      : 400;

    return NextResponse.json({ error: error.message }, { status });
  }
}, "live_stream:start");
