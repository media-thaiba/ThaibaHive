import { ModelGossipMesh } from '@/lib/operations/mesh/model-gossip-mesh';
import { PeerConnectionManager } from '@/lib/operations/mesh/peer-connection-manager';

describe('ModelGossipMesh & PeerConnectionManager (Push-Sum Dissemination)', () => {
  let peerMgr: PeerConnectionManager;

  beforeEach(() => {
    peerMgr = new PeerConnectionManager();
  });

  it('should register peers and select gossip fanout', () => {
    peerMgr.registerPeer({
      peerId: 'peer_1',
      campusId: 'campus_1',
      address: 'ws://node1.campus.internal:8080',
      lastSeen: new Date().toISOString(),
      latencyMs: 12,
      status: 'connected',
    });

    peerMgr.registerPeer({
      peerId: 'peer_2',
      campusId: 'campus_2',
      address: 'ws://node2.campus.internal:8080',
      lastSeen: new Date().toISOString(),
      latencyMs: 45,
      status: 'connected',
    });

    const active = peerMgr.getActivePeers();
    expect(active.length).toBe(2);

    const fanout = peerMgr.selectGossipFanout(1);
    expect(fanout.length).toBe(1);
  });

  it('should prepare push-sum messages and converge average across nodes', () => {
    const nodeA = new ModelGossipMesh('node_A', [10.0, 20.0], peerMgr);
    const nodeB = new ModelGossipMesh('node_B', [30.0, 40.0], peerMgr);

    // Initial state: Node A estimate is 10, 20; Node B estimate is 30, 40
    expect(nodeA.getEstimatedAverage()[0]).toBe(10.0);
    expect(nodeB.getEstimatedAverage()[0]).toBe(30.0);

    // Iterate 8 gossip exchange steps
    for (let round = 1; round <= 8; round++) {
      const msgA = nodeA.preparePushSumGossip('model_1', round);
      nodeB.receiveGossipMessage(msgA);

      const msgB = nodeB.preparePushSumGossip('model_1', round);
      nodeA.receiveGossipMessage(msgB);
    }

    // Estimates should converge towards global average: (10 + 30)/2 = 20, (20 + 40)/2 = 30
    const estA = nodeA.getEstimatedAverage();
    const estB = nodeB.getEstimatedAverage();

    expect(estA[0]).toBeCloseTo(20.0, 1);
    expect(estA[1]).toBeCloseTo(30.0, 1);
    expect(estB[0]).toBeCloseTo(20.0, 1);
    expect(estB[1]).toBeCloseTo(30.0, 1);
  });
});
