import { PeerNodeInfo } from './gossip-types';

/**
 * Peer Connection Manager for Mesh WebSocket/gRPC channels
 */
export class PeerConnectionManager {
  private peers: Map<string, PeerNodeInfo> = new Map();

  public registerPeer(peer: PeerNodeInfo): void {
    this.peers.set(peer.peerId, {
      ...peer,
      lastSeen: new Date().toISOString(),
    });
  }

  public getPeer(peerId: string): PeerNodeInfo | undefined {
    return this.peers.get(peerId);
  }

  public getAllPeers(): PeerNodeInfo[] {
    return Array.from(this.peers.values());
  }

  public getActivePeers(): PeerNodeInfo[] {
    return Array.from(this.peers.values()).filter((p) => p.status === 'connected');
  }

  public updatePeerStatus(peerId: string, status: 'connected' | 'disconnected' | 'syncing', latencyMs?: number): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.status = status;
      peer.lastSeen = new Date().toISOString();
      if (latencyMs !== undefined) peer.latencyMs = latencyMs;
      this.peers.set(peerId, peer);
    }
  }

  public selectGossipFanout(fanoutCount: number = 3): PeerNodeInfo[] {
    const active = this.getActivePeers();
    if (active.length <= fanoutCount) return active;
    return [...active].sort(() => 0.5 - Math.random()).slice(0, fanoutCount);
  }

  public clear(): void {
    this.peers.clear();
  }
}
