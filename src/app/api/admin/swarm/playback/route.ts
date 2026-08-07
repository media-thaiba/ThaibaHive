import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { PlaybackEngine } from "@/lib/observability/playback-engine";

async function handler(req: Request, session: any) {
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");

    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Missing startTime or endTime" }, { status: 400 });
    }

    const engine = new PlaybackEngine();
    const events = await engine.getEventsInRange(startTime, endTime);
    return NextResponse.json({ events });
  } catch (err) {
    console.error("[Playback API] Failed to fetch events:", err);
    return NextResponse.json({ error: "Failed to fetch playback events" }, { status: 500 });
  }
}

export const GET = requireAuth(handler, "system:telemetry");
