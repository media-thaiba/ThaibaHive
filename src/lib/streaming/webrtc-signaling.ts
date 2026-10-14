import crypto from 'crypto';
import { db } from '@/db';
import { conferenceSignals } from '@/db/schema';
import { eq, and, or, gt, asc } from 'drizzle-orm';
import { SignalingMessage, WebRtcSdpOffer, IceCandidateInit } from './types';

export interface TurnCredentials {
  username: string;
  credential: string;
  urls: string[];
  expiresAt: number;
}

export interface DispatchSignalParams {
  institutionId: string;
  roomId: string;
  senderPeerId: string;
  recipientPeerId: string;
  signalType: string;
  payloadJson: string;
  sequenceNum?: number;
}

type SignalListener = (signal: any) => void;

export class WebRtcSignalingManager {
  private static instance: WebRtcSignalingManager;
  private listeners: Map<string, Set<SignalListener>> = new Map();

  private stunTurnServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.turn.thaibahive.org:3478' },
  ];

  public static getInstance(): WebRtcSignalingManager {
    if (!WebRtcSignalingManager.instance) {
      WebRtcSignalingManager.instance = new WebRtcSignalingManager();
    }
    return WebRtcSignalingManager.instance;
  }

  /**
   * Returns configured ICE (STUN/TURN) servers.
   */
  public getIceServers(): Array<{ urls: string | string[] }> {
    return this.stunTurnServers;
  }

  /**
   * Generates RFC 5766 time-limited HMAC-SHA1 ephemeral TURN credentials (24-hour expiration).
   */
  public generateTurnCredentials(
    username: string,
    secret: string = process.env.TURN_SHARED_SECRET || 'thaibahive_webrtc_turn_secret_dev_2026',
    ttlSeconds: number = 86400
  ): TurnCredentials {
    const expiryTimestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const ephemeralUsername = `${expiryTimestamp}:${username}`;
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(ephemeralUsername);
    const credential = hmac.digest('base64');

    return {
      username: ephemeralUsername,
      credential,
      urls: [
        'turn:turn.thaibahive.org:3478?transport=udp',
        'turn:turn.thaibahive.org:3478?transport=tcp',
        'turns:turn.thaibahive.org:5349?transport=tcp',
      ],
      expiresAt: expiryTimestamp * 1000,
    };
  }

  /**
   * WebRTC Perfect Negotiation politeness resolution:
   * Deterministically decides which peer is the polite peer in a glare/collision condition.
   * Peer with lexicographically smaller ID is polite (will rollback if collision occurs).
   */
  public isPolitePeer(myPeerId: string, targetPeerId: string): boolean {
    return myPeerId < targetPeerId;
  }

  /**
   * Dispatches a signaling message to the database queue and notifies live SSE subscribers.
   */
  public async dispatchSignal(params: DispatchSignalParams) {
    const signalId = `sig_${crypto.randomUUID()}`;
    const record = {
      id: signalId,
      institutionId: params.institutionId,
      roomId: params.roomId,
      senderPeerId: params.senderPeerId,
      recipientPeerId: params.recipientPeerId,
      signalType: params.signalType,
      payloadJson: params.payloadJson,
      sequenceNum: params.sequenceNum || 1,
      delivered: false,
      createdAt: new Date().toISOString(),
    };

    // 1. Insert into persistent queue
    await db.insert(conferenceSignals).values(record);

    // 2. Broadcast to live SSE subscribers for (roomId:recipientPeerId) and (roomId:*)
    this.emitSignal(params.roomId, params.recipientPeerId, record);
    if (params.recipientPeerId !== '*') {
      this.emitSignal(params.roomId, '*', record);
    }

    return record;
  }

  /**
   * Fetches pending/undelivered signals for a peer in a room.
   */
  public async getPendingSignals(
    institutionId: string,
    roomId: string,
    recipientPeerId: string,
    minSequenceNum: number = 0
  ) {
    const conditions = [
      eq(conferenceSignals.institutionId, institutionId),
      eq(conferenceSignals.roomId, roomId),
      or(
        eq(conferenceSignals.recipientPeerId, recipientPeerId),
        eq(conferenceSignals.recipientPeerId, '*')
      ),
    ];

    if (minSequenceNum > 0) {
      conditions.push(gt(conferenceSignals.sequenceNum, minSequenceNum));
    }

    const signals = await db
      .select()
      .from(conferenceSignals)
      .where(and(...conditions))
      .orderBy(asc(conferenceSignals.sequenceNum), asc(conferenceSignals.createdAt));

    return signals;
  }

  /**
   * Marks a set of signals as delivered.
   */
  public async markSignalsDelivered(signalIds: string[]) {
    if (!signalIds.length) return;
    for (const id of signalIds) {
      await db
        .update(conferenceSignals)
        .set({ delivered: true })
        .where(eq(conferenceSignals.id, id));
    }
  }

  /**
   * In-process SSE subscription channel per room & peer.
   */
  public subscribe(roomId: string, recipientPeerId: string, listener: SignalListener): () => void {
    const key = `${roomId}:${recipientPeerId}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  private emitSignal(roomId: string, recipientPeerId: string, signal: any) {
    const key = `${roomId}:${recipientPeerId}`;
    const listeners = this.listeners.get(key);
    if (listeners) {
      for (const fn of listeners) {
        try {
          fn(signal);
        } catch {
          // Ignore failed listener
        }
      }
    }
  }

  // --- Backward-compatibility helpers ---

  public createSignalingMessage(
    roomId: string,
    senderId: string,
    tenantId: string,
    type: SignalingMessage['type'],
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
      throw new Error('Invalid WebRTC signaling message format');
    }
    return parsed;
  }

  public validateSdpOffer(sdpOffer?: WebRtcSdpOffer): boolean {
    if (!sdpOffer || !sdpOffer.sdp || typeof sdpOffer.sdp !== 'string') return false;
    return sdpOffer.type === 'offer' || sdpOffer.type === 'answer';
  }
}

export const signalingManager = WebRtcSignalingManager.getInstance();
