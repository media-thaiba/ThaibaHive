export interface CrdtWeightEntry {
  modelId: string;
  roundNumber: number;
  originNodeId: string;
  weights: number[];
  vectorClock: Record<string, number>;
  timestamp: string;
}

/**
 * Conflict-Free Replicated Data Type (CRDT) Model Weight Buffer
 */
export class CrdtWeightBuffer {
  private buffer: Map<string, CrdtWeightEntry> = new Map(); // key: `nodeId_round`

  public addUpdate(entry: CrdtWeightEntry): boolean {
    const key = `${entry.originNodeId}_round_${entry.roundNumber}`;
    const existing = this.buffer.get(key);

    if (existing) {
      // Compare timestamps / clocks for Last-Write-Wins (LWW)
      if (new Date(entry.timestamp).getTime() <= new Date(existing.timestamp).getTime()) {
        return false;
      }
    }

    this.buffer.set(key, entry);
    return true;
  }

  public getUpdatesForRound(modelId: string, roundNumber: number): CrdtWeightEntry[] {
    return Array.from(this.buffer.values()).filter(
      (e) => e.modelId === modelId && e.roundNumber === roundNumber
    );
  }

  public getAllEntries(): CrdtWeightEntry[] {
    return Array.from(this.buffer.values());
  }

  public clear(): void {
    this.buffer.clear();
  }
}
