import { KnowledgeGraphEngine } from '@/lib/operations/km/graph/knowledge-graph-engine';
import { GraphTraverser } from '@/lib/operations/km/graph/graph-traverser';

describe('Campus Knowledge Graph Engine (KM-002)', () => {
  let graph: KnowledgeGraphEngine;
  let traverser: GraphTraverser;

  beforeEach(() => {
    graph = new KnowledgeGraphEngine();
    traverser = new GraphTraverser(graph);
  });

  it('should initialize default campus knowledge nodes and edges', () => {
    const nodes = graph.getAllNodes();
    expect(nodes.length).toBeGreaterThanOrEqual(10);

    const cs101 = graph.getNode('CS-101');
    expect(cs101).toBeDefined();
    expect(cs101?.name).toBe('Intro to Computer Science');

    const outEdges = graph.getOutboundEdges('CS-101');
    expect(outEdges.some((e) => e.target === 'CS-102')).toBe(true);
  });

  it('should traverse multi-hop paths correctly', () => {
    const paths = graph.traverseMultiHop('CS-101', 3, 'prerequisite_of');
    expect(paths.length).toBeGreaterThan(0);

    // Should find path CS-101 -> CS-102 -> CS-301 -> CS-401
    const deepPath = paths.find((p) => p.nodes.some((n) => n.id === 'CS-401'));
    expect(deepPath).toBeDefined();
  });

  it('should compute prerequisite closure for high-level course', () => {
    const prereqs = traverser.getPrerequisiteClosure('CS-401');
    const prereqIds = prereqs.map((p) => p.id);

    // CS-401 requires CS-301, which requires CS-102, which requires CS-101
    expect(prereqIds).toContain('CS-301');
    expect(prereqIds).toContain('CS-102');
    expect(prereqIds).toContain('CS-101');
  });

  it('should find shortest path between knowledge nodes', () => {
    const result = traverser.findShortestPath('CS-101', 'CS-401');
    expect(result).not.toBeNull();
    expect(result?.path).toEqual(['CS-101', 'CS-102', 'CS-301', 'CS-401']);
    expect(result?.distance).toBe(3);
  });

  it('should detect cycles when circular prerequisite relationships are added', () => {
    const cleanCheck = graph.detectCycles();
    expect(cleanCheck.hasCycles).toBe(false);

    // Add a cycle: CS-401 -> CS-101
    graph.addEdge({
      id: 'e_cycle',
      source: 'CS-401',
      target: 'CS-101',
      relation: 'prerequisite_of',
    });

    const cycleCheck = graph.detectCycles();
    expect(cycleCheck.hasCycles).toBe(true);
    expect(cycleCheck.cyclePaths.length).toBeGreaterThan(0);
  });
});
