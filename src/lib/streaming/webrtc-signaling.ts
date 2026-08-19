import { SignalingMessage, WebRtcSdpOffer, IceCandidateInit } from "./types";

export class WebRtcSignalingManager {
  private stunTurnServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.turn.thaibahive.org:3478" },
  ];

  public getIceServers() {
    return this.stunTurnServers;
  }

  public createSignalingMessage(
    roomId: string,
    senderId: string,
    tenantId: string,
    type: SignalingMessage["type"],
    sdp?: WebRtcSdpOffer,
    candidate?: IceCandidateInit,
    payload?: Record<string, any>
  ): SignalingMessage {
    return {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      roomId,
      senderId,
      tenantId,
      type,
      sdp,
      candidate,
      payload,
      timestamp: Date.now(),
    };
  }

  public parseIncomingMessage(rawMessage: string): SignalingMessage {
    const parsed = JSON.parse(rawMessage);
    if (!parsed.roomId || !parsed.senderId || !parsed.type) {
      throw new Error("Invalid WebRTC signaling message format");
    }
    return parsed;
  }

  public validateSdpOffer(sdpOffer?: WebRtcSdpOffer): boolean {
    if (!sdpOffer || !sdpOffer.sdp || typeof sdpOffer.sdp !== "string") return false;
    return sdpOffer.type === "offer" || sdpOffer.type === "answer";
  }
}
