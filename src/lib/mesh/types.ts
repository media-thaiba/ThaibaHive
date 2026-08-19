export interface VectorClock {
  [nodeId: string]: number;
}

export interface EntityMutationDelta {
  entityType: string; // e.g. "student", "attendance", "grade"
  entityId: string;
  tenantId: string;
  regionId: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: Record<string, any>;
  timestamp: number; // UTC Epoch ms
  vectorClock: VectorClock;
}

export interface CrossRegionReplicationPayload {
  id: string;
  sourceRegion: string;
  targetRegion: string;
  mutations: EntityMutationDelta[];
  sentAt: number;
  batchChecksum: string;
}

export interface CrdtResolutionResult<T = Record<string, any>> {
  entityId: string;
  resolvedState: T;
  hasConflict: boolean;
  winnerRegion: string;
  appliedTimestamp: number;
  conflictDetails?: {
    localTimestamp: number;
    remoteTimestamp: number;
    conflictingFields: string[];
  };
}

export interface MeshNodeHealth {
  regionId: string;
  nodeName: string;
  endpoint: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latencyMs: number;
  lastHeartbeat: number;
}
