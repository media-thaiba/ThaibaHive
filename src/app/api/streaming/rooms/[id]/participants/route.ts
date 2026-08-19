import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { MediaSessionManager } from "@/lib/streaming/media-session";

const mediaManager = new MediaSessionManager();

export const GET = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  try {
    const params = context ? await context.params : { id: "room-001" };
    const roomId = params.id;
    const tenantId = (session as any).institutionId || "inst-001";

    let room = mediaManager.getRoom(roomId);
    if (!room) {
      room = mediaManager.createRoom(roomId, tenantId, "Hybrid Lecture Hall A", "prof-001");
      mediaManager.joinRoom(roomId, "stu-001", tenantId, "ATTENDEE");
      mediaManager.joinRoom(roomId, "stu-002", tenantId, "ATTENDEE");
    }

    const participantList = Array.from(room.participants.values());

    return NextResponse.json({
      success: true,
      roomId: room.roomId,
      roomName: room.roomName,
      isLive: room.isLive,
      activeCount: participantList.length,
      participants: participantList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "streaming:access");
