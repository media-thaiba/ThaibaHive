/**
 * Unit tests for Neo4jThreatGraphAdapter (ARES-012)
 */

import { Neo4jThreatGraphAdapter } from '@/lib/security/graph/neo4j-adapter';

describe('ARES-012: Neo4jThreatGraphAdapter', () => {
  beforeEach(() => {
    Neo4jThreatGraphAdapter.resetInstance();
  });

  it('should store and query nodes and edges with bidirectional index', async () => {
    const adapter = Neo4jThreatGraphAdapter.getInstance();

    await adapter.upsertNode({
      id: 'actor-1',
      type: 'ThreatActor',
      name: 'APT-29',
      riskScore: 90,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await adapter.upsertNode({
      id: 'cve-1',
      type: 'Vulnerability_CVE',
      name: 'CVE-2026-1234',
      riskScore: 85,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await adapter.upsertEdge({
      id: 'edge-1',
      sourceId: 'actor-1',
      targetId: 'cve-1',
      type: 'EXPLOITS',
      weight: 0.9,
      metadata: {},
      createdAt: new Date().toISOString(),
    });

    expect(adapter.listNodes().length).toBe(2);
    expect(adapter.getOutgoingEdges('actor-1').length).toBe(1);
    expect(adapter.getIncomingEdges('cve-1').length).toBe(1);
    expect(adapter.getNeighbors('actor-1')[0].id).toBe('cve-1');
  });
});
