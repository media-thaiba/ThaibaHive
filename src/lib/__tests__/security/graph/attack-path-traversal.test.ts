/**
 * Unit tests for AttackPathTraversal & GraphQueryEngine (ARES-014)
 */

import { AttackPathTraversal } from '@/lib/security/graph/attack-path-traversal';
import { ThreatGraphQueryEngine } from '@/lib/security/graph/graph-query-engine';
import { Neo4jThreatGraphAdapter } from '@/lib/security/graph/neo4j-adapter';

describe('ARES-014: AttackPathTraversal & ThreatGraphQueryEngine', () => {
  beforeEach(() => {
    Neo4jThreatGraphAdapter.resetInstance();
  });

  it('should find shortest attack paths and identify choke points', async () => {
    const adapter = Neo4jThreatGraphAdapter.getInstance();
    const traversal = AttackPathTraversal.getInstance(adapter);
    const queryEngine = ThreatGraphQueryEngine.getInstance(adapter, traversal);

    // Build chain: Actor -> CVE -> Gateway Service -> Database
    await adapter.upsertNode({
      id: 'actor-1',
      type: 'ThreatActor',
      name: 'APT-Actor',
      riskScore: 90,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await adapter.upsertNode({
      id: 'cve-1',
      type: 'Vulnerability_CVE',
      name: 'CVE-2026-9999',
      riskScore: 85,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await adapter.upsertNode({
      id: 'svc-gw',
      type: 'Service',
      name: 'API Gateway',
      riskScore: 70,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await adapter.upsertNode({
      id: 'db-primary',
      type: 'Asset',
      name: 'Primary Student DB',
      riskScore: 95,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await adapter.upsertEdge({
      id: 'e1',
      sourceId: 'actor-1',
      targetId: 'cve-1',
      type: 'EXPLOITS',
      weight: 0.9,
      metadata: {},
      createdAt: new Date().toISOString(),
    });
    await adapter.upsertEdge({
      id: 'e2',
      sourceId: 'cve-1',
      targetId: 'svc-gw',
      type: 'AFFECTS',
      weight: 0.8,
      metadata: {},
      createdAt: new Date().toISOString(),
    });
    await adapter.upsertEdge({
      id: 'e3',
      sourceId: 'svc-gw',
      targetId: 'db-primary',
      type: 'CONNECTS_TO',
      weight: 0.9,
      metadata: {},
      createdAt: new Date().toISOString(),
    });

    const path = traversal.findAttackPaths('actor-1', 'db-primary');
    expect(path).not.toBeNull();
    expect(path?.hopCount).toBe(3);
    expect(path?.pathNodes.length).toBe(4);
    expect(path?.criticalChokePointNodeId).toBeDefined();

    const overview = queryEngine.getGraphOverview();
    expect(overview.totalNodes).toBe(4);
    expect(overview.totalEdges).toBe(3);
  });
});
