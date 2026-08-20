import { GossipMessage } from './gossip-types';
import { PeerConnectionManager } from './peer-connection-manager';
import * as crypto from 'crypto';

/**
 * Decentralized Model Weight Gossip Mesh implementing Push-Sum Averaging
 */
export class ModelGossipMesh {
  private localPeerId: string;
  private peerManager: PeerConnectionManager;
  private localWeights: number[];
  private localSumWeight: number; // Push-Sum mass variable w (starts at 1.0)
  private vectorClock: Record<string, number> = {};
  private seenMessages: Set<string> = new Set();

  constructor(localPeerId: string, initialWeights: number[], peerManager: PeerConnectionManager) {
    this.localPeerId = localPeerId;
    this.peerManager = peerManager;
    this.localWeights = [...initialWeights];
    this.localSumWeight = 1.0;
    this.vectorClock[localPeerId] = 0;
  }

  /**
   * Disseminate current model state to mesh peers via Push-Sum gossip step
   */
  public preparePushSumGossip(modelId: string, roundNumber: number): GossipMessage {
    this.vectorClock[this.localPeerId] = (this.vectorClock[this.localPeerId] || 0) + 1;

    // In Push-Sum, node sends half of its weight sum and mass to a neighbor, keeps the other half
    const halfMass = this.localSumWeight * 0.5;
    const halfWeights = this.localWeights.map((v) => v * 0.5);

    // Keep half
    this.localSumWeight = halfMass;
    this.localWeights = [...halfWeights];

    const messageId = crypto.createHash('sha256').update(`${this.localPeerId}:${Date.now()}:${Math.random()}`).digest('hex');

    const msg: GossipMessage = {
      messageId,
      senderId: this.localPeerId,
      modelId,
      roundNumber,
      weightVector: halfWeights,
      sumWeight: halfMass,
      vectorClock: { ...this.vectorClock },
      hopCount: 1,
      timestamp: new Date().toISOString(),
    };

    this.seenMessages.add(messageId);
    return msg;
  }

  /**
   * Receive and integrate incoming Push-Sum gossip message
   */
  public receiveGossipMessage(msg: GossipMessage): boolean {
    if (this.seenMessages.has(msg.messageId)) {
      return false; // Already processed / deduplicated
    }
    this.seenMessages.add(msg.messageId);

    // Update vector clock
    for (const [peer, count] of Object.entries(msg.vectorClock)) {
      this.vectorClock[peer] = Math.max(this.vectorClock[peer] || 0, count);
    }

    // Add incoming half-weights and mass to local accumulator
    for (let i = 0; i < this.localWeights.length && i < msg.weightVector.length; i++) {
      this.localWeights[i] += msg.weightVector[i];
    }
    this.localSumWeight += msg.sumWeight;

    return true;
  }

  /**
   * Estimate true decentralized average: s / w
   */
  public getEstimatedAverage(): number[] {
    const mass = Math.max(1e-12, this.localSumWeight);
    return this.localWeights.map((v) => v / mass);
  }

  public getLocalWeights(): number[] {
    return [...this.localWeights];
  }

  public getVectorClock(): Record<string, number> {
    return { ...this.vectorClock };
  }
}
