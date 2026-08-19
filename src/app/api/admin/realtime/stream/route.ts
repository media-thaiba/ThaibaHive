import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/api/auth-guard";
import { realtimeStreamQuerySchema } from "../../../../../lib/validation/schemas";
import { defaultStreamingService } from "../../../../../lib/realtime/realtime-streaming-service";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = realtimeStreamQuerySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  const { channels = ["copilot_feed"], connectionType = "websocket" } = parse.data;

  try {
    const session = defaultStreamingService.createSession("tenant-main", "user-admin", connectionType, channels);
    return NextResponse.json(
      {
        message: "Stream session initialized",
        session,
        streamUrl: `/api/admin/realtime/sse?sessionId=${session.sessionId}`,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initialize stream session" },
      { status: 500 }
    );
  }
}, "realtime:stream");
