import { SwarmTopology } from '../agents/swarm/swarm-topology';
import { PartitionHandler } from '../agents/swarm/partition-handler';
import { SwarmCoordinator } from '../agents/swarm/swarm-coordinator';

describe('Swarm Coordination', () => {
  test('Topology Management', () => {
    const topology = new SwarmTopology();
    topology.register({ id: 'n1', tier: 'local', status: 'active', lastSeen: new Date().toISOString() });
    expect(topology.getGlobalView().length).toBe(1);
    topology.updateStatus('n1', 'offline');
    expect(topology.getGlobalView()[0].status).toBe('offline');
  });
  
  test('Partition Detection', () => {
    const topology = new SwarmTopology();
    topology.register({ id: 'n1', tier: 'local', status: 'active', lastSeen: new Date(Date.now() - 40000).toISOString() });
    const handler = new PartitionHandler(topology);
    handler.checkHeartbeats(['n1']);
    expect(topology.getGlobalView()[0].status).toBe('partitioned');
  });
  
  test('LWW Conflict Resolution', () => {
    const handler = new PartitionHandler(new SwarmTopology());
    const res = handler.resolveConflict(
      { val: 1, timestamp: new Date(Date.now() - 1000).toISOString() },
      { val: 2, timestamp: new Date(Date.now()).toISOString() }
    );
    expect(res.val).toBe(2);
  });
});