import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/api/auth-guard";
import { defaultStreamingService } from "../../../../../lib/realtime/realtime-streaming-service";
import { formatSSEResponse, getSSEHeaders } from "../../../../../lib/realtime/sse-handler";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "copilot_feed";
  const lastEventId = searchParams.get("lastEventId") || request.headers.get("Last-Event-ID") || undefined;
  const tenantId = searchParams.get("tenantId") || "tenant-main";

  try {
    const events = defaultStreamingService.getReplayEvents(tenantId, channel, lastEventId);
    const bodyText = formatSSEResponse(events);

    return new Response(bodyText, {
      status: 200,
      headers: getSSEHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch SSE event stream" },
      { status: 500 }
    );
  }
}, "realtime:stream");
