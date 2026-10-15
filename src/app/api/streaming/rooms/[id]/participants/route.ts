import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { isWebRtcConferencingEnabled } from "@/lib/features";
import { db } from "@/db";
import { streamingRooms, streamingSessions, staff } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  const url = new URL(request.url);
  const params = context ? await context.params : {};
  const roomId = params.id;
  if (!roomId) {
    return NextResponse.json({ error: "Room ID required" }, { status: 400 });
  }

  let institutionId = await resolveRequestInstitution(session, url.searchParams.get("institutionId"));
  if (institutionId === "global") {
    const [existing] = await db
      .select({ institutionId: streamingRooms.institutionId })
      .from(streamingRooms)
      .where(eq(streamingRooms.id, roomId));
    if (existing?.institutionId) {
      institutionId = existing.institutionId;
    }
  }

  if (!institutionId || institutionId === "global") {
    return NextResponse.json({ error: "Institution context required" }, { status: 400 });
  }

  if (!isWebRtcConferencingEnabled(institutionId)) {
    return NextResponse.json({ error: "WebRTC conferencing is disabled for this institution" }, { status: 403 });
  }

  const [room] = await db
    .select({
      id: streamingRooms.id,
      roomName: streamingRooms.roomName,
      status: streamingRooms.status,
    })
    .from(streamingRooms)
    .where(and(eq(streamingRooms.id, roomId), eq(streamingRooms.institutionId, institutionId)));

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const rows = await db
    .select({
      id: streamingSessions.id,
      peerId: streamingSessions.peerId,
      participantUserId: streamingSessions.participantUserId,
      role: streamingSessions.role,
      audioMuted: streamingSessions.audioMuted,
      videoMuted: streamingSessions.videoMuted,
      isScreenSharing: streamingSessions.isScreenSharing,
      connectionQuality: streamingSessions.connectionQuality,
      joinedAt: streamingSessions.joinedAt,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
    })
    .from(streamingSessions)
    .leftJoin(staff, eq(streamingSessions.participantUserId, staff.id))
    .where(
      and(
        eq(streamingSessions.institutionId, institutionId),
        eq(streamingSessions.roomId, roomId),
        isNull(streamingSessions.leftAt)
      )
    );

  const participants = rows.map((r) => ({
    id: r.id,
    peerId: r.peerId,
    participantUserId: r.participantUserId,
    name: r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : (r.email || r.participantUserId),
    role: r.role,
    audioMuted: r.audioMuted,
    videoMuted: r.videoMuted,
    isScreenSharing: r.isScreenSharing,
    connectionQuality: r.connectionQuality,
    joinedAt: r.joinedAt,
  }));

  return NextResponse.json({
    success: true,
    roomId: room.id,
    roomName: room.roomName,
    isLive: room.status === "ACTIVE",
    activeCount: participants.length,
    participants,
  });
}, "conference:join");
