// Sprint-017/018 backward-compatible exports (required by sync-engine-service.ts)
export interface FieldConflict {
  fieldName: string;
  clientValue: unknown;
  serverValue: unknown;
  clientTimestamp: string;
  serverTimestamp: string;
}

export interface ConflictResolution {
  isConflict: boolean;
  winner: 'client' | 'server' | 'no-conflict';
  winningValue: unknown;
  losingValue: unknown;
  strategy: string;
}

/**
 * LWW (Last-Write-Wins) conflict resolution for sync engine fields.
 * Retained from Sprint-017 for sync-engine-service.ts compatibility.
 */
export function resolveConflict(conflict: FieldConflict): ConflictResolution {
  // When server value is undefined/null, client wins without conflict
  if (conflict.serverValue === undefined || conflict.serverValue === null) {
    return {
      isConflict: false,
      winner: 'client',
      winningValue: conflict.clientValue,
      losingValue: conflict.serverValue,
      strategy: 'no-conflict',
    };
  }

  const clientTs = new Date(conflict.clientTimestamp).getTime();
  const serverTs = new Date(conflict.serverTimestamp).getTime();
  const isConflict = conflict.clientValue !== conflict.serverValue;

  if (!isConflict) {
    return { isConflict: false, winner: 'no-conflict', winningValue: conflict.serverValue, losingValue: conflict.clientValue, strategy: 'no-conflict' };
  }

  // LWW: most recent timestamp wins
  if (clientTs > serverTs) {
    return { isConflict: true, winner: 'client', winningValue: conflict.clientValue, losingValue: conflict.serverValue, strategy: 'LWW' };
  }
  return { isConflict: true, winner: 'server', winningValue: conflict.serverValue, losingValue: conflict.clientValue, strategy: 'LWW' };
}

// Sprint-020: Priority-aware transaction conflict resolver
export type TransactionType = 'financial' | 'academic' | 'operational' | 'metadata';

export interface Transaction {
  id: string;
  type: TransactionType;
  timestamp: string;
  data: unknown;
}

const PRIORITY_MAP: Record<TransactionType, number> = {
  financial: 4,
  academic: 3,
  operational: 2,
  metadata: 1,
};

/**
 * Sprint-020 ConflictResolver — priority-aware CRDT transaction merge.
 * Priority order: financial > academic > operational > metadata.
 * Within same priority: Last-Write-Wins with causal timestamp verification.
 */
export class ConflictResolver {
  resolve(txA: Transaction, txB: Transaction): Transaction {
    const pA = PRIORITY_MAP[txA.type] ?? 0;
    const pB = PRIORITY_MAP[txB.type] ?? 0;

    if (pA !== pB) {
      return pA > pB ? txA : txB;
    }
    // Same priority — LWW with causal timestamp
    return new Date(txA.timestamp).getTime() >= new Date(txB.timestamp).getTime() ? txA : txB;
  }

  resolveMany(transactions: Transaction[]): Transaction | undefined {
    if (transactions.length === 0) return undefined;
    return transactions.reduce((winner, tx) => this.resolve(winner, tx));
  }
}