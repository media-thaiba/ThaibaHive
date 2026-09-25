export interface PatrolCheckpoint {
  checkpointId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export class PatrolRouteOptimizer {
  /**
   * Generates a pseudo-randomized patrol tour visiting high-risk checkpoints more frequently
   * to maximize patrol coverage entropy and prevent predictable attacker exploitation.
   */
  public static generatePatrolTour(checkpoints: PatrolCheckpoint[], numTourStops: number = 8): PatrolCheckpoint[] {
    if (checkpoints.length === 0) return [];
    if (checkpoints.length <= 2) return checkpoints;

    const tour: PatrolCheckpoint[] = [];
    const weightedPool: PatrolCheckpoint[] = [];

    for (const cp of checkpoints) {
      const weight = cp.riskLevel === 'high' ? 3 : cp.riskLevel === 'medium' ? 2 : 1;
      for (let i = 0; i < weight; i++) {
        weightedPool.push(cp);
      }
    }

    let lastSelected: PatrolCheckpoint | null = null;
    for (let i = 0; i < numTourStops; i++) {
      const available = weightedPool.filter((c) => c.checkpointId !== lastSelected?.checkpointId);
      const chosen = available[Math.floor(Math.random() * available.length)] || weightedPool[0];
      tour.push(chosen);
      lastSelected = chosen;
    }

    return tour;
  }
}
