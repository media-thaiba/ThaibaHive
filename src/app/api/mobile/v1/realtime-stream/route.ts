import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { defaultStreamingService } from "@/lib/realtime/realtime-streaming-service";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") || "tenant-main";
  const channel = searchParams.get("channel") || "copilot_feed";

  try {
    const rawFrames = defaultStreamingService.getReplayEvents(tenantId, channel);

    const events = rawFrames.map((f) => ({
      eventId: f.eventId,
      channel: f.channel,
      eventType: f.eventType,
      title: f.payload.title || "Real-Time Event Alert",
      summary: f.payload.summary || f.payload.text || "Event stream notification update",
      timestamp: f.timestamp,
    }));

    return NextResponse.json(
      {
        success: true,
        tenantId,
        events,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mobile real-time stream" },
      { status: 500 }
    );
  }
}, "realtime:stream");
