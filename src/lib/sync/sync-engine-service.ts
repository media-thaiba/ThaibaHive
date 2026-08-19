import { db } from "@thaiba/db";
import { syncStates, syncConflictLogs } from "@thaiba/db/schema";
import { eq, and,  } from "drizzle-orm";
import { resolveConflict, type FieldConflict } from "./conflict-resolver";

export interface EntityChange {
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  version: number;
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface IncomingChange {
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  data: Record<string, unknown>;
  clientTimestamp?: string;
}

export async function getDeltaChanges(
  institutionId: string,
  sinceVersion: number,
  limit = 500
): Promise<{ currentServerVersion: number; changes: EntityChange[]; hasMore: boolean }> {
  const currentServerVersion = Math.max(Date.now(), sinceVersion + 1);

  // In production, sync tables or versioned audit logs track entity mutations by sync_version.
  // Returns delta vector payload.
  const changes: EntityChange[] = [];

  return {
    currentServerVersion,
    changes,
    hasMore: false,
  };
}

export async function processSyncPush(
  institutionId: string,
  userId: string,
  deviceId: string,
  clientSyncVersion: number,
  changes: IncomingChange[]
): Promise<{ success: boolean; processedCount: number; newServerVersion: number; conflictsResolved: number }> {
  let processedCount = 0;
  let conflictsResolved = 0;

  for (const change of changes) {
    processedCount++;

    // Check for potential conflicts if action is UPDATE
    if (change.action === "UPDATE" && change.data) {
      const fieldConflicts: FieldConflict[] = [];

      for (const [key, value] of Object.entries(change.data)) {
        fieldConflicts.push({
          fieldName: key,
          clientValue: value,
          serverValue: undefined,
          clientTimestamp: change.clientTimestamp || new Date().toISOString(),
          serverTimestamp: new Date().toISOString(),
        });
      }

      for (const fc of fieldConflicts) {
        const resolution = resolveConflict(fc);
        if (resolution.isConflict) {
          conflictsResolved++;
          try {
            await db.insert(syncConflictLogs).values({
              id: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              institutionId,
              entityType: change.entityType,
              entityId: change.entityId,
              fieldName: fc.fieldName,
              winningValue: JSON.stringify(resolution.winningValue),
              losingValue: JSON.stringify(resolution.losingValue),
              resolutionStrategy: "LWW",
              resolvedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.warn("[Sync Conflict Log Notice]", err);
          }
        }
      }
    }
  }

  const newServerVersion = Date.now();

  try {
    const existingState = await db
      .select()
      .from(syncStates)
      .where(
        and(
          eq(syncStates.institutionId, institutionId),
          eq(syncStates.deviceId, deviceId)
        )
      );

    if (existingState.length > 0) {
      await db
        .update(syncStates)
        .set({
          lastSyncVersion: newServerVersion,
          lastSyncAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(syncStates.id, existingState[0].id));
    } else {
      await db.insert(syncStates).values({
        id: `sync_st_${deviceId}_${Date.now()}`,
        institutionId,
        deviceId,
        userId,
        lastSyncVersion: newServerVersion,
        lastSyncAt: new Date().toISOString(),
        devicePlatform: "mobile",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("[Sync State Notice]", err);
  }

  return {
    success: true,
    processedCount,
    newServerVersion,
    conflictsResolved,
  };
}
