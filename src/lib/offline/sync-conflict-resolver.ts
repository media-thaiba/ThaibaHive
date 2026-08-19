export interface EntityRecord {
  id: string;
  tenantId: string;
  entityType: string;
  data: Record<string, any>;
  updatedAt: string;
}

export interface ClientMutation {
  id: string;
  mutationType: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  payload: Record<string, any>;
  clientTimestamp: string;
}

export interface SyncResolutionResult {
  mutationId: string;
  status: "SYNCED" | "CONFLICT" | "NEEDS_REVIEW";
  mergedData?: Record<string, any>;
  conflictFields?: string[];
  resolvedAt: string;
}

export class SyncConflictResolver {
  public resolveMutation(
    mutation: ClientMutation,
    serverRecord?: EntityRecord
  ): SyncResolutionResult {
    const now = new Date().toISOString();

    if (!serverRecord) {
      // New record insertion or deleted server record
      return {
        mutationId: mutation.id,
        status: "SYNCED",
        mergedData: mutation.payload,
        resolvedAt: now,
      };
    }

    const clientTime = new Date(mutation.clientTimestamp).getTime();
    const serverTime = new Date(serverRecord.updatedAt).getTime();

    if (clientTime >= serverTime) {
      // Client is newer: LWW merge
      const mergedData = this.mergeFields(serverRecord.data, mutation.payload);
      return {
        mutationId: mutation.id,
        status: "SYNCED",
        mergedData,
        resolvedAt: now,
      };
    } else {
      // Server is newer: check for conflicting fields
      const conflictFields: string[] = [];
      const mergedData = { ...serverRecord.data };

      for (const key of Object.keys(mutation.payload)) {
        if (
          serverRecord.data[key] !== undefined &&
          serverRecord.data[key] !== mutation.payload[key]
        ) {
          conflictFields.push(key);
        }
      }

      if (conflictFields.length === 0) {
        return {
          mutationId: mutation.id,
          status: "SYNCED",
          mergedData,
          resolvedAt: now,
        };
      }

      return {
        mutationId: mutation.id,
        status: conflictFields.length > 2 ? "NEEDS_REVIEW" : "CONFLICT",
        mergedData,
        conflictFields,
        resolvedAt: now,
      };
    }
  }

  /**
   * resolveFieldLevel — merges two plain records using LWW by `updatedAt`.
   * institutionId is ALWAYS preserved from serverRecord to prevent cross-tenant escalation.
   */
  public resolveFieldLevel(
    serverRecord: Record<string, any>,
    clientRecord: Record<string, any>
  ): Record<string, any> {
    const serverTime = serverRecord.updatedAt ? new Date(serverRecord.updatedAt).getTime() : 0;
    const clientTime = clientRecord.updatedAt ? new Date(clientRecord.updatedAt).getTime() : 0;

    // Merge fields: client wins on newer fields, except immutable identity fields
    const IMMUTABLE_FIELDS = ["id", "institutionId", "tenantId", "createdAt"];

    const merged: Record<string, any> = { ...serverRecord };

    for (const [key, value] of Object.entries(clientRecord)) {
      if (IMMUTABLE_FIELDS.includes(key)) {
        // Always preserve server values for identity fields
        continue;
      }
      if (clientTime >= serverTime) {
        merged[key] = value;
      }
    }

    return merged;
  }

  private mergeFields(serverData: Record<string, any>, clientData: Record<string, any>): Record<string, any> {
    const merged = { ...serverData };
    for (const [key, value] of Object.entries(clientData)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
    return merged;
  }
}
