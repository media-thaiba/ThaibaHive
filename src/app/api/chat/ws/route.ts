import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { chatWsHandler } from "@/lib/chat/ws-handler";

export const dynamic = "force-dynamic";

/**
 * WebSocket Handshake & Simulation Endpoint
 * Validates connection token and routes frames in Edge/Serverless environments.
 */
export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const connectionId = body.connectionId || `ws_${session.staffId}_${Date.now()}`;
    const rawMessage = typeof body.message === "string" ? body.message : JSON.stringify(body);

    let lastSentData: string | null = null;
    let conn = chatWsHandler.getConnection(connectionId);

    if (!conn) {
      conn = chatWsHandler.registerConnection(connectionId, session, (data) => {
        lastSentData = data;
      });
    }

    await chatWsHandler.handleMessage(connectionId, rawMessage);

    return NextResponse.json({
      status: "ok",
      connectionId,
      response: lastSentData ? JSON.parse(lastSentData) : null,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}, "chat:messages:send");

export const GET = requireAuth(async (request: Request, session) => {
  return NextResponse.json({
    status: "ready",
    staffId: session.staffId,
    endpoint: "/api/chat/ws",
    protocol: "thaibahive-chat-mesh-v1",
  });
}, "chat:messages:read");
