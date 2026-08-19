import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { WebRtcSignalingManager } from "@/lib/streaming/webrtc-signaling";

const signalingManager = new WebRtcSignalingManager();

export const POST = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  try {
    const params = context ? await context.params : { id: "room-001" };
    const roomId = params.id;
    const body = await request.json();
    const { type, sdp, candidate, payload } = body;
    const senderId = (session as any).userId || "user-001";
    const tenantId = (session as any).institutionId || "inst-001";

    const msg = signalingManager.createSignalingMessage(
      roomId,
      senderId,
      tenantId,
      type,
      sdp,
      candidate,
      payload
    );

    return NextResponse.json({
      success: true,
      signal: msg,
      iceServers: signalingManager.getIceServers(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "streaming:access");
