import { FederatedNodeOrchestrator } from '@/lib/operations/federated/fed-node-orchestrator';
import { FederatedNode } from '@/lib/operations/federated/federated-types';

describe('FederatedNodeOrchestrator', () => {
  let orchestrator: FederatedNodeOrchestrator;

  beforeEach(() => {
    orchestrator = new FederatedNodeOrchestrator();
  });

  const sampleNodes: FederatedNode[] = [
    {
      nodeId: 'node_1',
      campusId: 'campus_north',
      campusName: 'North Campus',
      status: 'idle',
      computeTier: 'campus_server',
      sampleCount: 1500,
      availableMemoryMb: 4096,
      networkLatencyMs: 25,
      lastHeartbeat: new Date().toISOString(),
      totalRoundsParticipated: 12,
      reputationScore: 0.95,
    },
    {
      nodeId: 'node_2',
      campusId: 'campus_south',
      campusName: 'South Campus',
      status: 'idle',
      computeTier: 'edge_kiosk',
      sampleCount: 600,
      availableMemoryMb: 1024,
      networkLatencyMs: 80,
      lastHeartbeat: new Date().toISOString(),
      totalRoundsParticipated: 8,
      reputationScore: 0.88,
    },
    {
      nodeId: 'node_3',
      campusId: 'campus_east',
      campusName: 'East Campus',
      status: 'idle',
      computeTier: 'mobile_client',
      sampleCount: 300,
      availableMemoryMb: 512,
      networkLatencyMs: 15,
      lastHeartbeat: new Date().toISOString(),
      totalRoundsParticipated: 4,
      reputationScore: 0.4, // Low reputation
    },
  ];

  it('should register nodes and select cohorts based on reputation and strategy', () => {
    sampleNodes.forEach((n) => orchestrator.registerNode(n));

    const all = orchestrator.getAllNodes();
    expect(all.length).toBe(3);

    // Filter minReputation >= 0.5
    const cohort = orchestrator.selectCohort(2, 0.5, 'low_latency');
    expect(cohort.length).toBe(2);
    expect(cohort.some((n) => n.nodeId === 'node_3')).toBe(false);
  });

  it('should record heartbeat and update network latency', () => {
    orchestrator.registerNode(sampleNodes[0]);
    const ok = orchestrator.recordHeartbeat('node_1', 18);
    expect(ok).toBe(true);

    const updated = orchestrator.getNode('node_1');
    expect(updated?.networkLatencyMs).toBe(18);
  });

  it('should prune stale nodes exceeding heartbeat timeout', () => {
    const staleNode: FederatedNode = {
      ...sampleNodes[0],
      nodeId: 'stale_node',
      lastHeartbeat: new Date(Date.now() - 120000).toISOString(),
    };
    orchestrator.registerNode(staleNode);

    const pruned = orchestrator.pruneStaleNodes(60000);
    expect(pruned).toContain('stale_node');
    expect(orchestrator.getNode('stale_node')?.status).toBe('offline');
  });
});
