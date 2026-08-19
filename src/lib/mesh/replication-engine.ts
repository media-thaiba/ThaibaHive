import { EntityMutationDelta, CrossRegionReplicationPayload, VectorClock } from "./types";
import { resolveLwwConflict } from "./crdt-resolver";
import { createHash } from "crypto";

export class CrossRegionReplicationEngine {
  private localRegionId: string;
  private localVectorClock: VectorClock = {};

  constructor(regionId: string) {
    this.localRegionId = regionId;
    this.localVectorClock[regionId] = 1;
  }

  public getRegionId(): string {
    return this.localRegionId;
  }

  public getVectorClock(): VectorClock {
    return { ...this.localVectorClock };
  }

  public incrementClock(): VectorClock {
    this.localVectorClock[this.localRegionId] = (this.localVectorClock[this.localRegionId] || 0) + 1;
    return this.getVectorClock();
  }

  public createMutationDelta(
    entityType: string,
    entityId: string,
    tenantId: string,
    operation: "INSERT" | "UPDATE" | "DELETE",
    payload: Record<string, any>
  ): EntityMutationDelta {
    const vectorClock = this.incrementClock();
    return {
      entityType,
      entityId,
      tenantId,
      regionId: this.localRegionId,
      operation,
      payload,
      timestamp: Date.now(),
      vectorClock,
    };
  }

  public serializePayload(
    targetRegion: string,
    mutations: EntityMutationDelta[]
  ): CrossRegionReplicationPayload {
    const payloadId = `payload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sentAt = Date.now();
    const rawData = JSON.stringify(mutations);
    const batchChecksum = createHash("sha256").update(rawData).digest("hex");

    return {
      id: payloadId,
      sourceRegion: this.localRegionId,
      targetRegion,
      mutations,
      sentAt,
      batchChecksum,
    };
  }

  public verifyPayloadChecksum(payload: CrossRegionReplicationPayload): boolean {
    const rawData = JSON.stringify(payload.mutations);
    const expectedChecksum = createHash("sha256").update(rawData).digest("hex");
    return payload.batchChecksum === expectedChecksum;
  }

  public chunkPayloads(
    mutations: EntityMutationDelta[],
    chunkSize: number = 500
  ): EntityMutationDelta[][] {
    const chunks: EntityMutationDelta[][] = [];
    for (let i = 0; i < mutations.length; i += chunkSize) {
      chunks.push(mutations.slice(i, i + chunkSize));
    }
    return chunks;
  }

  public processIncomingDelta<T extends Record<string, any>>(
    localState: T | null,
    localTimestamp: number,
    localClock: VectorClock,
    delta: EntityMutationDelta
  ) {
    // Update local vector clock with remote clock max values
    for (const [k, v] of Object.entries(delta.vectorClock)) {
      this.localVectorClock[k] = Math.max(this.localVectorClock[k] || 0, v);
    }
    this.localVectorClock[this.localRegionId] = (this.localVectorClock[this.localRegionId] || 0) + 1;

    return resolveLwwConflict(
      localState,
      localTimestamp,
      localClock,
      this.localRegionId,
      delta
    );
  }
}
