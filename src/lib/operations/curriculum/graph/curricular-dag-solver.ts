import {
  CurriculumCourseDto,
  CurriculumPrerequisiteDto,
} from '../curriculum-types';
import {
  CurricularNode,
  CurricularEdge,
  TopologicalSortResult,
} from './dag-types';

export class CurricularDagSolver {
  private nodes: Map<string, CurricularNode> = new Map();
  private edges: CurricularEdge[] = [];
  private courseCodeToIdMap: Map<string, string> = new Map();

  constructor(
    courses: CurriculumCourseDto[] = [],
    prerequisites: CurriculumPrerequisiteDto[] = []
  ) {
    this.buildGraph(courses, prerequisites);
  }

  public buildGraph(
    courses: CurriculumCourseDto[],
    prerequisites: CurriculumPrerequisiteDto[]
  ): void {
    this.nodes.clear();
    this.edges = [];
    this.courseCodeToIdMap.clear();

    // 1. Initialize nodes
    for (const c of courses) {
      this.nodes.set(c.id, {
        courseId: c.id,
        courseCode: c.courseCode,
        title: c.title,
        credits: c.credits,
        typicalTerm: c.typicalTerm,
        level: c.level,
        prerequisites: [],
        dependents: [],
      });
      this.courseCodeToIdMap.set(c.courseCode, c.id);
      this.courseCodeToIdMap.set(c.id, c.id);
    }

    // 2. Add edges & dependencies
    for (const p of prerequisites) {
      const targetNode = this.nodes.get(p.courseId);
      const prereqNode = this.nodes.get(p.prerequisiteCourseId);

      if (targetNode && prereqNode) {
        targetNode.prerequisites.push({
          prerequisiteCourseId: p.prerequisiteCourseId,
          type: p.type,
          minimumGrade: p.minimumGrade,
          concurrencyAllowed: p.concurrencyAllowed,
        });
        prereqNode.dependents.push(p.courseId);

        this.edges.push({
          fromCourseId: p.prerequisiteCourseId,
          toCourseId: p.courseId,
          type: p.type,
          minimumGrade: p.minimumGrade,
          concurrencyAllowed: p.concurrencyAllowed,
        });
      }
    }
  }

  /**
   * Kahn's Algorithm + Tarjan's cycle detection + Critical Path computation
   */
  public solveTopologicalSort(): TopologicalSortResult {
    const inDegree = new Map<string, number>();
    for (const [id, node] of this.nodes.entries()) {
      inDegree.set(id, node.prerequisites.length);
    }

    // Queue of nodes with 0 in-degree (no prerequisites)
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const sortedCourseIds: string[] = [];
    const termTiers = new Map<string, number>();

    for (const id of queue) {
      termTiers.set(id, 1);
    }

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      sortedCourseIds.push(currentId);

      const currentTier = termTiers.get(currentId) || 1;
      const currentNode = this.nodes.get(currentId);
      if (!currentNode) continue;

      for (const depId of currentNode.dependents) {
        const nextDeg = (inDegree.get(depId) || 0) - 1;
        inDegree.set(depId, nextDeg);

        // Update term tier: dependent must be at least tier + 1
        const existingNextTier = termTiers.get(depId) || 1;
        termTiers.set(depId, Math.max(existingNextTier, currentTier + 1));

        if (nextDeg === 0) {
          queue.push(depId);
        }
      }
    }

    const hasCycle = sortedCourseIds.length < this.nodes.size;
    let cyclePath: string[] | undefined;

    if (hasCycle) {
      cyclePath = this.detectCyclePath();
    }

    const { criticalPath, criticalPathLength } = this.calculateCriticalPath();
    const complexityIndex = this.calculateCurricularComplexityIndex();

    return {
      sortedCourseIds,
      hasCycle,
      cyclePath,
      termTiers,
      criticalPath,
      criticalPathLength,
      complexityIndex,
    };
  }

  /**
   * Tarjan's Strongly Connected Components algorithm for cycle path detection
   */
  public detectCyclePath(): string[] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parentMap = new Map<string, string>();
    let cycleNodes: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const depId of node.dependents) {
          if (!visited.has(depId)) {
            parentMap.set(depId, nodeId);
            if (dfs(depId)) return true;
          } else if (recStack.has(depId)) {
            // Cycle found
            cycleNodes = [depId, nodeId];
            let curr = nodeId;
            while (curr && parentMap.get(curr) && parentMap.get(curr) !== depId) {
              curr = parentMap.get(curr)!;
              cycleNodes.push(curr);
            }
            cycleNodes.reverse();
            return true;
          }
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) {
          return cycleNodes.map((id) => this.nodes.get(id)?.courseCode || id);
        }
      }
    }

    return [];
  }

  /**
   * Computes the critical path (longest chain of dependent courses)
   */
  public calculateCriticalPath(): { criticalPath: string[]; criticalPathLength: number } {
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();

    for (const id of this.nodes.keys()) {
      dist.set(id, 1);
      prev.set(id, null);
    }

    // Topological order
    const toposort = this.solveTopologicalSortInternal();

    for (const u of toposort) {
      const uDist = dist.get(u) || 1;
      const node = this.nodes.get(u);
      if (!node) continue;

      for (const v of node.dependents) {
        const vDist = dist.get(v) || 1;
        if (uDist + 1 > vDist) {
          dist.set(v, uDist + 1);
          prev.set(v, u);
        }
      }
    }

    // Find node with max distance
    let maxDist = 0;
    let endNode: string | null = null;
    for (const [id, d] of dist.entries()) {
      if (d > maxDist) {
        maxDist = d;
        endNode = id;
      }
    }

    const path: string[] = [];
    let curr = endNode;
    while (curr) {
      const code = this.nodes.get(curr)?.courseCode || curr;
      path.unshift(code);
      curr = prev.get(curr) || null;
    }

    return {
      criticalPath: path,
      criticalPathLength: maxDist,
    };
  }

  /**
   * Calculates Curricular Complexity Index (CCI) = Sum(Structural Complexity + Blocking Factors + Delay Factors)
   */
  public calculateCurricularComplexityIndex(): number {
    let totalScore = 0;
    for (const [id, node] of this.nodes.entries()) {
      const blockingFactor = this.calculateTransitiveDownstreamCount(id);
      const delayFactor = node.prerequisites.length;
      totalScore += blockingFactor * 1.5 + delayFactor * 1.0;
    }
    return Math.round(totalScore * 10) / 10;
  }

  /**
   * Transitive downstream count (how many courses are directly or indirectly blocked by this course)
   */
  public calculateTransitiveDownstreamCount(courseId: string): number {
    const reachable = new Set<string>();
    const queue = [courseId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const node = this.nodes.get(curr);
      if (node) {
        for (const dep of node.dependents) {
          if (!reachable.has(dep)) {
            reachable.add(dep);
            queue.push(dep);
          }
        }
      }
    }

    return reachable.size;
  }

  public getNode(idOrCode: string): CurricularNode | undefined {
    const id = this.courseCodeToIdMap.get(idOrCode) || idOrCode;
    return this.nodes.get(id);
  }

  public getAllNodes(): CurricularNode[] {
    return Array.from(this.nodes.values());
  }

  private solveTopologicalSortInternal(): string[] {
    const inDegree = new Map<string, number>();
    for (const [id, node] of this.nodes.entries()) {
      inDegree.set(id, node.prerequisites.length);
    }
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }
    const sorted: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sorted.push(u);
      const node = this.nodes.get(u);
      if (node) {
        for (const v of node.dependents) {
          const nextDeg = (inDegree.get(v) || 0) - 1;
          inDegree.set(v, nextDeg);
          if (nextDeg === 0) queue.push(v);
        }
      }
    }
    return sorted;
  }
}
