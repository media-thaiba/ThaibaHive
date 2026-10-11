import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { liveSessionManager } from "@/lib/live/session-manager";
import { liveSessionEventSchema } from "@/lib/validation/schemas";
import { isLiveStreamingEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/live/sessions/[id]/events
 * Ingest multimodal upstream events (PCM16 audio chunks, JPEG keyframes, text inputs).
 */
export const POST = requireAuth(async (request: Request, session: any, context?: any) => {
  const institutionId = await resolveRequestInstitution(session);

  if (!institutionId) {
    return NextResponse.json(
      { error: "Institution context is required to send live events" },
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

  let body: any = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = liveSessionEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await liveSessionManager.ingestEvent(
      sessionId,
      institutionId,
      parsed.data
    );

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}, "live_stream:start");
