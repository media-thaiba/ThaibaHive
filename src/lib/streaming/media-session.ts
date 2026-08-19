import { StreamingRoomSession, ParticipantSession } from "./types";

export class MediaSessionManager {
  private activeRooms: Map<string, StreamingRoomSession> = new Map();

  public createRoom(roomId: string, tenantId: string, roomName: string, hostId: string, maxParticipants: number = 250): StreamingRoomSession {
    const room: StreamingRoomSession = {
      roomId,
      tenantId,
      roomName,
      hostId,
      maxParticipants,
      isLive: true,
      participants: new Map(),
      createdAt: Date.now(),
    };

    // Add host automatically
    room.participants.set(hostId, {
      participantId: hostId,
      tenantId,
      role: "HOST",
      audioMuted: false,
      videoMuted: false,
      screenSharing: false,
      joinedAt: Date.now(),
    });

    this.activeRooms.set(roomId, room);
    return room;
  }

  public joinRoom(roomId: string, participantId: string, tenantId: string, role: "HOST" | "PRESENTER" | "ATTENDEE" = "ATTENDEE"): ParticipantSession {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      throw new Error(`Streaming room ${roomId} does not exist or has ended`);
    }

    if (room.participants.size >= room.maxParticipants) {
      throw new Error(`Room ${roomId} has reached maximum capacity of ${room.maxParticipants} participants`);
    }

    const participant: ParticipantSession = {
      participantId,
      tenantId,
      role,
      audioMuted: role === "ATTENDEE", // Attendees muted by default
      videoMuted: false,
      screenSharing: false,
      joinedAt: Date.now(),
    };

    room.participants.set(participantId, participant);
    return participant;
  }

  public leaveRoom(roomId: string, participantId: string): void {
    const room = this.activeRooms.get(roomId);
    if (room) {
      room.participants.delete(participantId);
      if (room.participants.size === 0) {
        room.isLive = false;
      }
    }
  }

  public getRoom(roomId: string): StreamingRoomSession | undefined {
    return this.activeRooms.get(roomId);
  }

  public updateMediaTrackState(
    roomId: string,
    participantId: string,
    audioMuted?: boolean,
    videoMuted?: boolean,
    screenSharing?: boolean
  ): ParticipantSession | undefined {
    const room = this.activeRooms.get(roomId);
    if (!room) return undefined;

    const participant = room.participants.get(participantId);
    if (participant) {
      if (audioMuted !== undefined) participant.audioMuted = audioMuted;
      if (videoMuted !== undefined) participant.videoMuted = videoMuted;
      if (screenSharing !== undefined) participant.screenSharing = screenSharing;
    }
    return participant;
  }
}
