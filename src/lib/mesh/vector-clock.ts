import { VectorClock } from "./types";

export class VectorClockManager {
  private currentClock: VectorClock;
  private nodeId: string;

  constructor(nodeId: string, initialClock: VectorClock = {}) {
    this.nodeId = nodeId;
    this.currentClock = { ...initialClock };
    if (!this.currentClock[nodeId]) {
      this.currentClock[nodeId] = 0;
    }
  }

  public getClock(): VectorClock {
    return { ...this.currentClock };
  }

  public tick(): VectorClock {
    this.currentClock[this.nodeId] = (this.currentClock[this.nodeId] || 0) + 1;
    return this.getClock();
  }

  public merge(remoteClock: VectorClock): VectorClock {
    for (const [k, v] of Object.entries(remoteClock)) {
      this.currentClock[k] = Math.max(this.currentClock[k] || 0, v);
    }
    this.tick();
    return this.getClock();
  }

  public static isDescendant(clockA: VectorClock, clockB: VectorClock): boolean {
    // Returns true if clockA strictly dominates or equals clockB across all dimensions
    let strictlyGreater = false;
    const allKeys = Array.from(new Set([...Object.keys(clockA), ...Object.keys(clockB)]));

    for (const k of allKeys) {
      const valA = clockA[k] || 0;
      const valB = clockB[k] || 0;
      if (valA < valB) return false;
      if (valA > valB) strictlyGreater = true;
    }

    return strictlyGreater;
  }
}
