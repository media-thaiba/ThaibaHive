const VECTOR_MESH_OPTIMIZATION_ENABLED = process.env.VECTOR_MESH_OPTIMIZATION_ENABLED !== 'false';

/** Maximum number of node entries before epoch compaction is triggered. */
const EPOCH_COMPACTION_THRESHOLD = 64;

export interface VectorClock {
  epoch: number;
  epochBaseline: number;
  entries: Map<string, number>;
}

/**
 * Sprint-020 VectorClockManager — standard vector clock operations with epoch compaction.
 * Epoch compaction prevents unbounded growth in long-running multi-region deployments:
 * when entries exceed 64 nodes, entries with zero divergence from the max are compacted
 * into an epoch baseline, preserving causal ordering correctness.
 */
export class VectorClockManager {
  private epoch = 0;
  private epochBaseline = 0;
  private clocks = new Map<string, number>();

  /**
   * Increment the logical clock for nodeId.
   */
  tick(nodeId: string): void {
    const current = this.clocks.get(nodeId) ?? 0;
    this.clocks.set(nodeId, current + 1);
  }

  /**
   * Merge a remote vector clock into this local clock (element-wise max).
   * Triggers epoch compaction if the entry count exceeds the threshold.
   */
  merge(remoteVector: Record<string, number>): void {
    if (!VECTOR_MESH_OPTIMIZATION_ENABLED) return;
    for (const [nodeId, count] of Object.entries(remoteVector)) {
      const local = this.clocks.get(nodeId) ?? 0;
      this.clocks.set(nodeId, Math.max(local, count));
    }
    this.compactEpochIfNeeded();
  }

  /**
   * Returns true if vector clock A happened-before vector clock B.
   * (A ≤ B for all components and A ≠ B)
   */
  happensBefore(a: Record<string, number>, b: Record<string, number>): boolean {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let strictlyLess = false;
    for (const key of allKeys) {
      const va = (a[key] ?? 0) + this.epochBaseline;
      const vb = (b[key] ?? 0) + this.epochBaseline;
      if (va > vb) return false;
      if (va < vb) strictlyLess = true;
    }
    return strictlyLess;
  }

  /**
   * Returns true if A and B are concurrent (neither happened-before the other).
   */
  concurrent(a: Record<string, number>, b: Record<string, number>): boolean {
    return !this.happensBefore(a, b) && !this.happensBefore(b, a);
  }

  /**
   * Returns the current vector clock as a plain object.
   */
  getVector(): Record<string, number> {
    return Object.fromEntries(this.clocks);
  }

  getEpoch(): number {
    return this.epoch;
  }

  /**
   * Epoch compaction — triggered when clock entries exceed EPOCH_COMPACTION_THRESHOLD (64).
   * Computes the minimum value across all entries (the "baseline" that all nodes agree on),
   * increments the epoch, and subtracts the baseline from all entries.
   * This bounds the entry count without losing causal ordering information.
   */
  private compactEpochIfNeeded(): void {
    if (this.clocks.size <= EPOCH_COMPACTION_THRESHOLD) return;

    // Find the minimum clock value (all nodes have at least this value)
    let minValue = Infinity;
    for (const v of this.clocks.values()) {
      if (v < minValue) minValue = v;
    }

    if (minValue === 0 || minValue === Infinity) return;

    // Add min to epoch baseline and subtract from all entries
    this.epochBaseline += minValue;
    this.epoch += 1;

    for (const [key, val] of this.clocks.entries()) {
      const newVal = val - minValue;
      if (newVal === 0) {
        // Remove zero-divergence entries — they are captured in the epoch baseline
        this.clocks.delete(key);
      } else {
        this.clocks.set(key, newVal);
      }
    }
  }
}