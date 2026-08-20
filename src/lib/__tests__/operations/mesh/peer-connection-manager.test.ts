import { PeerConnectionManager } from '@/lib/operations/mesh/peer-connection-manager';

describe('PeerConnectionManager (Decentralized Mesh Topology)', () => {
  it('should register peers, update heartbeats, and filter active peers', () => {
    const manager = new PeerConnectionManager();

    manager.registerPeer({
      peerId: 'peer_alpha',
      campusId: 'campus_1',
      address: 'ws://campus1:8080',
      status: 'connected',
      latencyMs: 15,
      lastSeen: new Date().toISOString(),
    });

    manager.registerPeer({
      peerId: 'peer_beta',
      campusId: 'campus_2',
      address: 'ws://campus2:8080',
      status: 'connected',
      latencyMs: 25,
      lastSeen: new Date().toISOString(),
    });

    expect(manager.getAllPeers().length).toBe(2);
    const active = manager.getActivePeers();
    expect(active.length).toBe(2);

    manager.updatePeerStatus('peer_alpha', 'disconnected');
    expect(manager.getActivePeers().length).toBe(1);
  });
});
