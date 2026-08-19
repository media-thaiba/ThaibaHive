import { EntityMutationDelta, CrdtResolutionResult, VectorClock } from "./types";

/**
 * Compare two vector clocks to determine causality order.
 * Returns:
 *  1: clockA is strictly newer than clockB
 * -1: clockB is strictly newer than clockA
 *  0: clocks are identical or concurrent/conflicting
 */
export function compareVectorClocks(clockA: VectorClock, clockB: VectorClock): number {
  const keys = Array.from(new Set([...Object.keys(clockA), ...Object.keys(clockB)]));
  let aGreater = false;
  let bGreater = false;

  for (const k of keys) {
    const valA = clockA[k] || 0;
    const valB = clockB[k] || 0;
    if (valA > valB) aGreater = true;
    if (valB > valA) bGreater = true;
  }

  if (aGreater && !bGreater) return 1;
  if (bGreater && !aGreater) return -1;
  return 0;
}

/**
 * Resolves state conflicts using Last-Write-Wins (LWW) CRDT semantics.
 * Compares vector clock causality first; if concurrent, falls back to highest timestamp,
 * then lexicographical regionId comparison for deterministic tie-breaking.
 */
export function resolveLwwConflict<T extends Record<string, any>>(
  localState: T | null,
  localTimestamp: number,
  localVectorClock: VectorClock,
  localRegionId: string,
  incomingDelta: EntityMutationDelta
): CrdtResolutionResult<T> {
  const entityId = incomingDelta.entityId;

  // Case 1: No existing local state -> incoming mutation wins directly
  if (!localState) {
    return {
      entityId,
      resolvedState: { ...incomingDelta.payload } as T,
      hasConflict: false,
      winnerRegion: incomingDelta.regionId,
      appliedTimestamp: incomingDelta.timestamp,
    };
  }

  // Case 2: Handle DELETE operations
  if (incomingDelta.operation === "DELETE") {
    if (incomingDelta.timestamp >= localTimestamp) {
      return {
        entityId,
        resolvedState: { ...incomingDelta.payload, _deleted: true } as unknown as T,
        hasConflict: false,
        winnerRegion: incomingDelta.regionId,
        appliedTimestamp: incomingDelta.timestamp,
      };
    } else {
      return {
        entityId,
        resolvedState: localState,
        hasConflict: true,
        winnerRegion: localRegionId,
        appliedTimestamp: localTimestamp,
      };
    }
  }

  // Case 3: Causality check using Vector Clocks
  const clockCmp = compareVectorClocks(localVectorClock, incomingDelta.vectorClock);

  if (clockCmp > 0) {
    // Local state is strictly newer
    return {
      entityId,
      resolvedState: localState,
      hasConflict: false,
      winnerRegion: localRegionId,
      appliedTimestamp: localTimestamp,
    };
  }

  if (clockCmp < 0) {
    // Incoming mutation is strictly newer
    return {
      entityId,
      resolvedState: { ...localState, ...incomingDelta.payload },
      hasConflict: false,
      winnerRegion: incomingDelta.regionId,
      appliedTimestamp: incomingDelta.timestamp,
    };
  }

  // Case 4: Concurrent mutations (clockCmp === 0) -> Tie breaker via Timestamp & Region ID
  let incomingWins = false;
  const conflictingFields: string[] = [];

  for (const key of Object.keys(incomingDelta.payload)) {
    if (localState[key] !== undefined && localState[key] !== incomingDelta.payload[key]) {
      conflictingFields.push(key);
    }
  }

  if (incomingDelta.timestamp > localTimestamp) {
    incomingWins = true;
  } else if (incomingDelta.timestamp === localTimestamp) {
    // Lexicographical tie-breaker
    incomingWins = incomingDelta.regionId > localRegionId;
  }

  const mergedState = incomingWins
    ? { ...localState, ...incomingDelta.payload }
    : { ...incomingDelta.payload, ...localState };

  return {
    entityId,
    resolvedState: mergedState,
    hasConflict: conflictingFields.length > 0,
    winnerRegion: incomingWins ? incomingDelta.regionId : localRegionId,
    appliedTimestamp: incomingWins ? incomingDelta.timestamp : localTimestamp,
    conflictDetails: conflictingFields.length > 0 ? {
      localTimestamp,
      remoteTimestamp: incomingDelta.timestamp,
      conflictingFields,
    } : undefined,
  };
}
