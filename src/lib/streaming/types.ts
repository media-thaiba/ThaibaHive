export interface WebRtcSdpOffer {
  sdp: string;
  type: "offer" | "answer";
}

export interface IceCandidateInit {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface SignalingMessage {
  id: string;
  roomId: string;
  senderId: string;
  tenantId: string;
  type: "JOIN" | "LEAVE" | "OFFER" | "ANSWER" | "ICE_CANDIDATE" | "MUTE_AUDIO" | "MUTE_VIDEO" | "WHITEBOARD_DRAW" | "POLL_VOTE";
  sdp?: WebRtcSdpOffer;
  candidate?: IceCandidateInit;
  payload?: Record<string, any>;
  timestamp: number;
}

export interface ParticipantSession {
  participantId: string;
  tenantId: string;
  role: "HOST" | "PRESENTER" | "ATTENDEE";
  audioMuted: boolean;
  videoMuted: boolean;
  screenSharing: boolean;
  joinedAt: number;
}

export interface StreamingRoomSession {
  roomId: string;
  tenantId: string;
  roomName: string;
  hostId: string;
  maxParticipants: number;
  isLive: boolean;
  participants: Map<string, ParticipantSession>;
  createdAt: number;
}
