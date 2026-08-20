/**
 * Decentralized Mesh & Gossip Protocol Types (A-FED / EdgeMesh)
 */

export interface PeerNodeInfo {
  peerId: string;
  campusId: string;
  address: string; // ws://... or grpc://...
  lastSeen: string;
  latencyMs: number;
  status: 'connected' | 'disconnected' | 'syncing';
}

export interface GossipMessage {
  messageId: string;
  senderId: string;
  modelId: string;
  roundNumber: number;
  weightVector: number[];
  sumWeight: number; // Push-Sum weight (starts at 1.0 on creator, 0 on relays)
  vectorClock: Record<string, number>;
  hopCount: number;
  timestamp: string;
}

export interface CompressedGradientPayload {
  sparseIndices: number[];
  quantizedValues: number[]; // INT8 values (-128 to 127)
  scaleFactor: number;
  originalDimension: number;
  compressionRatio: number;
}
